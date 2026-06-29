// eval.ts — Sona answer-quality scorecard.
// Runs golden Q&A sets through answer() in-process, grades recall / false-escalation /
// hallucination, and meters live Gemini cost with a hard stop well under budget.
//
// Usage:
//   bun run scripts/eval.ts [label] [--subset=N] [--tenants=slug1,slug2] [--budget=5]
//   label      names the results file written to scripts/eval-results/<label>.json (default "run")
//   --subset=N only the first N questions per tenant (fast inner loop while tuning)
//   --tenants  comma-separated tenant slugs to limit to
//   --budget   hard $ ceiling on Gemini spend (default 5.00); stops before exceeding it
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { answer, retrieveScored, usage, resetUsage, chat } from "../src/lib";

// ── args ──
const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith("--")) ?? "run";
const subset = Number(args.find((a) => a.startsWith("--subset="))?.split("=")[1] ?? 0) || 0;
const onlyTenants = (args.find((a) => a.startsWith("--tenants="))?.split("=")[1] ?? "").split(",").filter(Boolean);
const BUDGET = Number(args.find((a) => a.startsWith("--budget="))?.split("=")[1] ?? 5) || 5;
const STOP_AT = BUDGET - 0.5; // leave margin: one answer() can fire several calls

// ── Gemini pricing, $ per 1M tokens (2026-06) ──
const PRICE = {
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-flash-lite": { in: 0.1, out: 0.4 },
  embed: 0.15, // gemini-embedding-001
};
function dollars(): number {
  let c = (usage.embedTokens / 1e6) * PRICE.embed;
  for (const [m, u] of Object.entries(usage.byModel)) {
    const p = (PRICE as any)[m] ?? PRICE["gemini-2.5-flash"];
    c += (u.in / 1e6) * p.in + (u.out / 1e6) * p.out;
  }
  return c;
}

// ── load golden sets ──
const goldenDir = join(import.meta.dir, "golden");
if (!existsSync(goldenDir)) { console.error("no scripts/golden/ dir — author golden sets first"); process.exit(1); }
type GQ = { q: string; must_include?: string[]; should_not_escalate?: boolean; expect_escalate?: boolean };
type GSet = { tenant: string; industry: string; questions: GQ[] };
let sets: GSet[] = readdirSync(goldenDir).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(goldenDir, f), "utf8")) as GSet);
if (onlyTenants.length) sets = sets.filter((s) => onlyTenants.includes(s.tenant));
if (subset) sets = sets.map((s) => ({ ...s, questions: s.questions.slice(0, subset) }));

const EMAIL_ASK = /(leave|share|drop).{0,20}email|email.{0,20}(so|and).{0,20}(team|follow)|get back to you/i;
const JUDGE = args.includes("--judge"); // fair LLM grader for answers correct in different wording/format

// Only adjudicates "answered but substring-incomplete" cases. Accepts equivalent wording/format;
// rejects vague/evasive/escalating/wrong replies. Substring-passes are already counted; this just
// stops the exact-substring grader from undercounting genuinely-correct answers.
async function judgeReply(q: string, need: string[], reply: string): Promise<boolean> {
  if (!reply.trim() || reply.startsWith("__ERROR__")) return false;
  const sys = "You are a STRICT grader for a small-business website assistant. Decide whether the REPLY correctly answers the QUESTION and conveys the EXPECTED INFO. Accept any equivalent wording, formatting, or number format (e.g. +441943870333 equals 01943 870333). Answer NO if the reply is vague, evasive, asks for an email instead of answering, contradicts the expected info, or omits it. Reply with ONLY 'YES' or 'NO'.";
  const user = `QUESTION: ${q}\nEXPECTED INFO (equivalent wording/format counts as correct): ${need.join(" | ")}\nREPLY: ${reply}\n\nDoes the reply correctly answer with the expected info? YES or NO.`;
  try { return /^\s*yes/i.test(await chat(sys, user)); } catch { return false; }
}

resetUsage();
const t0 = Date.now();
const perTenant: any[] = [];
let stopped = false;
const TOTAL = sets.reduce((n, s) => n + s.questions.length, 0);
let done = 0;
console.log(`Running ${TOTAL} questions across ${sets.length} tenants...`);

// Flatten to one task list and run through a concurrency pool — questions are independent, so this
// cuts wall-clock ~Nx (chat() has its own 429 backoff). Tune with EVAL_CONCURRENCY (default 8).
const tasks: { s: any; item: any }[] = [];
for (const s of sets) for (const item of s.questions) tasks.push({ s, item });
const rowsByTenant = new Map<string, any[]>();
for (const s of sets) rowsByTenant.set(s.tenant, []);
const POOL = Number(process.env.EVAL_CONCURRENCY) || 8;

async function runOne(s: any, item: any) {
  if (dollars() >= STOP_AT) { stopped = true; return; }
  const sid = crypto.randomUUID();
  let reply = "", unsure = false, topSim = 0, passed = 0;
  try {
    const scored = await retrieveScored(s.tenant, item.q);
    topSim = scored.candidates[0]?.similarity ?? 0;
    passed = scored.survivors.length;
    const a = await answer(s.tenant, item.q, { sessionId: sid });
    reply = a.reply ?? ""; unsure = !!a.unsure;
  } catch (e: any) { reply = `__ERROR__ ${e?.message ?? e}`; }
  const lc = reply.toLowerCase();
  const escalated = unsure || EMAIL_ASK.test(reply) || reply.startsWith("__ERROR__");
  const hits = (item.must_include ?? []).filter((m: string) => lc.includes(m.toLowerCase()));
  const allHit = (item.must_include ?? []).length > 0 ? hits.length === item.must_include!.length : !escalated;
  let verdict: string;
  if (item.expect_escalate) verdict = escalated ? "control-ok" : "HALLUCINATED";
  else if (escalated) verdict = "false-escalate";
  else if (allHit) verdict = "ok";
  else verdict = "partial-miss";
  if (JUDGE && verdict === "partial-miss" && (await judgeReply(item.q, item.must_include ?? [], reply))) verdict = "ok";
  rowsByTenant.get(s.tenant)!.push({ q: item.q, verdict, escalated, hits: hits.length, need: (item.must_include ?? []).length, topSim: +topSim.toFixed(3), passed });
  done++;
  if (done % 20 === 0 || done === TOTAL) console.log(`  progress ${done}/${TOTAL}  $${dollars().toFixed(3)}`);
}

let idx = 0;
async function worker() { while (idx < tasks.length && !stopped) { const t = tasks[idx++]; await runOne(t.s, t.item); } }
await Promise.all(Array.from({ length: POOL }, () => worker()));

for (const s of sets) {
  const rows = rowsByTenant.get(s.tenant)!;
  const answerable = rows.filter((r) => r.verdict === "ok" || r.verdict === "false-escalate" || r.verdict === "partial-miss").length;
  const recalled = rows.filter((r) => r.verdict === "ok").length;
  const falseEsc = rows.filter((r) => r.verdict === "false-escalate").length;
  const controls = rows.filter((r) => r.verdict === "control-ok" || r.verdict === "HALLUCINATED").length;
  const controlOk = rows.filter((r) => r.verdict === "control-ok").length;
  const halluc = rows.filter((r) => r.verdict === "HALLUCINATED").length;
  perTenant.push({
    tenant: s.tenant, industry: s.industry,
    answerable, recalled, recallPct: answerable ? Math.round((recalled / answerable) * 100) : 0,
    falseEsc, falseEscPct: answerable ? Math.round((falseEsc / answerable) * 100) : 0,
    controls, controlOk, halluc, rows,
  });
}

// ── aggregate + report ──
const agg = perTenant.reduce((a, t) => ({
  answerable: a.answerable + t.answerable, recalled: a.recalled + t.recalled,
  falseEsc: a.falseEsc + t.falseEsc, controls: a.controls + t.controls, controlOk: a.controlOk + t.controlOk, halluc: a.halluc + t.halluc,
}), { answerable: 0, recalled: 0, falseEsc: 0, controls: 0, controlOk: 0, halluc: 0 });

console.log(`\n=== Sona answer-quality scorecard: "${label}" ===`);
console.log(`industry         recall      false-esc   controls(ok)  halluc`);
for (const t of perTenant) {
  console.log(
    `${t.industry.padEnd(15)} ${String(t.recalled + "/" + t.answerable).padEnd(8)} ${(t.recallPct + "%").padEnd(4)}  ` +
    `${String(t.falseEsc + "/" + t.answerable).padEnd(7)} ${(t.falseEscPct + "%").padEnd(5)}  ` +
    `${String(t.controlOk + "/" + t.controls).padEnd(7)}      ${t.halluc}`
  );
}
const recPct = agg.answerable ? Math.round((agg.recalled / agg.answerable) * 100) : 0;
const fePct = agg.answerable ? Math.round((agg.falseEsc / agg.answerable) * 100) : 0;
console.log(`${"—".repeat(56)}`);
console.log(`${"AGGREGATE".padEnd(15)} ${(agg.recalled + "/" + agg.answerable).padEnd(8)} ${(recPct + "%").padEnd(4)}  ${(agg.falseEsc + "/" + agg.answerable).padEnd(7)} ${(fePct + "%").padEnd(5)}  ${(agg.controlOk + "/" + agg.controls).padEnd(7)}      ${agg.halluc}`);
console.log(`\nGemini spend this run: $${dollars().toFixed(4)}  (budget $${BUDGET}; chat calls ${usage.chatCalls}, embeds ${usage.embedCalls})`);
console.log(`Elapsed: ${Math.round((Date.now() - t0) / 1000)}s${stopped ? "  ⚠ STOPPED EARLY on budget" : ""}`);

const outDir = join(import.meta.dir, "eval-results");
mkdirSync(outDir, { recursive: true });
const out = { label, when: new Date().toISOString(), budget: BUDGET, spend: +dollars().toFixed(4), stopped, aggregate: { ...agg, recallPct: recPct, falseEscPct: fePct }, perTenant };
writeFileSync(join(outDir, `${label}.json`), JSON.stringify(out, null, 2));
console.log(`\nResults written: scripts/eval-results/${label}.json`);
