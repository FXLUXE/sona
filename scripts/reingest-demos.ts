// reingest-demos.ts — rebuild niche demo corpora with the post-2026-06-26 stripHtml fix.
// Old ingests (pre page-builder fix) discarded ~99% of WP/Wix page text. This purges each
// target tenant's documents+chunks, then re-crawls from its root URL with the fixed extractor.
// Usage: bun run scripts/reingest-demos.ts            (default niche demo set)
//        bun run scripts/reingest-demos.ts slug=url   (override / add specific tenant→url)
import { sb, ingestSite } from "../src/lib";

// The 10 live ICP eval tenants (small independent local UK businesses) — a no-arg run re-primes
// the exact golden-set corpora. Keep in sync with scripts/golden/*.json.
const DEFAULT: Record<string, string> = {
  "demo-leedscitydentalcare-co-uk":  "https://www.leedscitydentalcare.co.uk",
  "demo-yazzhair-co":                "https://yazzhair.co",
  "demo-yorkshirevets-co-uk":        "https://www.yorkshirevets.co.uk",
  "demo-cambsphysioclinic-co-uk":    "https://cambsphysioclinic.co.uk",
  "demo-johncayley-plumbing-co-uk":  "https://johncayley-plumbing.co.uk",
  "demo-bests-co-uk":                "https://www.bests.co.uk",
  "demo-crundellandco-co-uk":        "https://www.crundellandco.co.uk",
  "demo-electrician-norwich-co-uk":  "https://electrician-norwich.co.uk",
  "demo-movementsbodymindyou-co-uk": "https://movementsbodymindyou.co.uk",
  "demo-adderleygreengarage-co-uk":  "https://adderleygreengarage.co.uk",
};
let MAX_PAGES = 8;

// Allow CLI overrides like `slug=https://site`, plus `pages=N` to set crawl depth.
const overrides: Record<string, string> = {};
for (const a of process.argv.slice(2)) {
  const i = a.indexOf("=");
  if (i <= 0) continue;
  const k = a.slice(0, i), v = a.slice(i + 1);
  if (k === "pages") { MAX_PAGES = Number(v) || MAX_PAGES; continue; }
  overrides[k] = v;
}
const targets = Object.keys(overrides).length ? overrides : DEFAULT;

const db = sb();
async function chunkCount(t: string) {
  const { count } = await db.from("chunks").select("*", { count: "exact", head: true }).eq("tenant", t);
  return count ?? 0;
}

for (const [tenant, url] of Object.entries(targets)) {
  const before = await chunkCount(tenant);
  process.stdout.write(`${tenant}  (was ${before} chunks) → purging + recrawling ${url} ... `);
  // Purge so stale feed/font junk docs from the old crawl don't linger.
  await db.from("chunks").delete().eq("tenant", tenant);
  await db.from("documents").delete().eq("tenant", tenant);
  try {
    const n = await ingestSite(tenant, url, MAX_PAGES);
    const after = await chunkCount(tenant);
    console.log(`done: ${n} chunks ingested (now ${after}).`);
  } catch (e) {
    console.log(`FAILED: ${(e as Error).message}`);
  }
}
console.log("\nDone. Verify answers with: bun run scripts/demo.ts (or the dashboard Preview tab).");
