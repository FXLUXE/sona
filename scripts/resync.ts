// resync.ts — re-ingest every stored document so the bot stays fresh.
// ingestUrl() dedups by content hash, so unchanged pages are skipped cheaply.
// Usage: bun run scripts/resync.ts [tenant]   (omit tenant = all tenants)
import { ingestUrl, sb } from "../src/lib";

const onlyTenant = process.argv[2];

let q = sb().from("documents").select("tenant, source_url").not("source_url", "is", null);
if (onlyTenant) q = q.eq("tenant", onlyTenant);
const { data: docs, error } = await q;
if (error) {
  console.error("query failed:", error.message);
  process.exit(1);
}

console.log(`Re-syncing ${docs?.length ?? 0} document(s)${onlyTenant ? ` for "${onlyTenant}"` : ""} ...`);
let changed = 0;
let skipped = 0;
for (const d of docs ?? []) {
  try {
    const n = await ingestUrl(d.tenant, d.source_url!);
    if (n > 0) {
      changed++;
      console.log(`  ✓ ${d.source_url} → ${n} chunks`);
    } else {
      skipped++;
    }
  } catch (e) {
    console.error(`  ✗ ${d.source_url}:`, (e as Error).message);
  }
}
console.log(`Done. ${changed} updated, ${skipped} unchanged.`);
