// validate-golden.ts — verify every golden question is truly grounded.
// For each answerable question, every must_include substring must appear (case-insensitive)
// in that tenant's ingested corpus. Controls are checked only for shape. Read-only, no Gemini.
// Usage: bun run scripts/validate-golden.ts
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { sb } from "../src/lib";

const db = sb();
const goldenDir = join(import.meta.dir, "golden");
const files = readdirSync(goldenDir).filter((f) => f.endsWith(".json"));

let totalQ = 0, totalAns = 0, totalCtl = 0, totalBad = 0;
const failures: string[] = [];

for (const f of files) {
  const g = JSON.parse(readFileSync(join(goldenDir, f), "utf8"));
  const { data: chunks } = await db.from("chunks").select("content").eq("tenant", g.tenant);
  const corpus = (chunks ?? []).map((c: any) => (c.content ?? "")).join("\n").toLowerCase();
  let ans = 0, ctl = 0, bad = 0;
  for (const q of g.questions) {
    totalQ++;
    if (q.expect_escalate) { ctl++; totalCtl++; continue; }
    ans++; totalAns++;
    const miss = (q.must_include ?? []).filter((m: string) => !corpus.includes(String(m).toLowerCase()));
    if ((q.must_include ?? []).length === 0) { bad++; failures.push(`${g.tenant}: answerable with NO must_include — "${q.q}"`); }
    else if (miss.length) { bad++; failures.push(`${g.tenant}: ungrounded [${miss.join(" | ")}] — "${q.q}"`); }
  }
  totalBad += bad;
  console.log(`${g.industry.padEnd(14)} ${g.tenant.padEnd(32)} total=${String(g.questions.length).padStart(3)}  ans=${String(ans).padStart(3)}  ctl=${String(ctl).padStart(2)}  ${bad ? "❌ "+bad+" ungrounded" : "✓ all grounded"}`);
}

console.log(`\n${"=".repeat(70)}`);
console.log(`Files: ${files.length}  Questions: ${totalQ}  (answerable ${totalAns}, control ${totalCtl})  Ungrounded: ${totalBad}`);
if (failures.length) { console.log(`\n--- ${failures.length} grounding failures ---`); failures.forEach((x) => console.log("  " + x)); }
else console.log("\n✅ Every answerable question is grounded in its corpus.");
