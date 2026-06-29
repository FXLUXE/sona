// inspect-corpus.ts — show each tenant's doc + chunk counts (pre/post re-ingest sanity).
import { sb } from "../src/lib";

const db = sb();
const { data: tenants, error } = await db.from("tenants").select("slug, name, plan");
if (error) { console.error("tenants query failed:", error.message); process.exit(1); }

console.log(`Tenants: ${tenants?.length ?? 0}\n`);
for (const t of tenants ?? []) {
  const { count: docs } = await db.from("documents").select("*", { count: "exact", head: true }).eq("tenant", t.slug);
  const { count: chunks } = await db.from("chunks").select("*", { count: "exact", head: true }).eq("tenant", t.slug);
  const flag = (chunks ?? 0) < 5 ? "  ⚠ THIN" : "";
  console.log(`${t.slug.padEnd(28)} docs=${String(docs ?? 0).padStart(3)}  chunks=${String(chunks ?? 0).padStart(4)}${flag}`);
}
