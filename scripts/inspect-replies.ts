// Spot-check: run a sample of "partial-miss" questions live, show actual reply vs required
// substrings — to judge whether misses are real failures or just grader strictness. Temp tool.
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { answer } from "../src/lib";

const d = JSON.parse(readFileSync(join(import.meta.dir, "eval-results/fix4-facts.json"), "utf8"));
const goldDir = join(import.meta.dir, "golden");
const golden: Record<string, any> = {};
for (const f of readdirSync(goldDir).filter((x) => x.endsWith(".json"))) {
  const g = JSON.parse(readFileSync(join(goldDir, f), "utf8"));
  golden[g.tenant] = g;
}
const pm: { tenant: string; q: string }[] = [];
for (const t of d.perTenant) for (const r of t.rows) if (r.verdict === "partial-miss") pm.push({ tenant: t.tenant, q: r.q });
const step = Math.max(1, Math.ceil(pm.length / 10));
const sample = pm.filter((_, i) => i % step === 0).slice(0, 10);

for (const s of sample) {
  const g = golden[s.tenant];
  const item = g.questions.find((x: any) => x.q === s.q);
  const need: string[] = item?.must_include ?? [];
  const a = await answer(s.tenant, s.q, { sessionId: crypto.randomUUID() });
  const lc = (a.reply || "").toLowerCase();
  const missing = need.filter((m) => !lc.includes(m.toLowerCase()));
  console.log("\n=== [" + g.industry + "] " + s.q);
  console.log("NEED " + JSON.stringify(need) + "  MISSING " + JSON.stringify(missing));
  console.log("REPLY: " + (a.reply || "").replace(/\s+/g, " ").slice(0, 300));
}
