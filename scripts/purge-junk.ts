// purge-junk.ts — delete empty/test tenants (<5 chunks), protecting the 10 golden question-set
// tenants. Mirrors purgeOldDemos child-table cleanup. Read the kill-list it prints before trusting.
import { sb } from "../src/lib";

// The 10 live ICP eval tenants — never purge these (must mirror scripts/golden/*.json).
const GOLDEN = new Set([
  "demo-leedscitydentalcare-co-uk", "demo-yazzhair-co", "demo-yorkshirevets-co-uk",
  "demo-cambsphysioclinic-co-uk", "demo-johncayley-plumbing-co-uk", "demo-bests-co-uk",
  "demo-crundellandco-co-uk", "demo-electrician-norwich-co-uk",
  "demo-movementsbodymindyou-co-uk", "demo-adderleygreengarage-co-uk",
]);
const CHILD = ["chunks", "documents", "messages", "conversations", "usage_events", "unanswered_questions", "leads", "feedback", "bookings"];

const db = sb();
const { data: tenants } = await db.from("tenants").select("slug");
const targets: string[] = [];
for (const t of tenants ?? []) {
  if (GOLDEN.has(t.slug)) continue;
  const { count } = await db.from("chunks").select("*", { count: "exact", head: true }).eq("tenant", t.slug);
  if ((count ?? 0) < 5) targets.push(t.slug);
}

console.log(`Kill-list (${targets.length} tenants, all <5 chunks, golden excluded):`);
targets.forEach((s) => console.log("  - " + s));
if (process.argv.includes("--dry")) { console.log("\n[dry run] nothing deleted."); process.exit(0); }

let purged = 0;
for (const slug of targets) {
  for (const table of CHILD) { try { await db.from(table).delete().eq("tenant", slug); } catch {} }
  const { error } = await db.from("tenants").delete().eq("slug", slug);
  if (error) console.log(`  ! ${slug}: tenant delete failed — ${error.message}`);
  else purged++;
}
console.log(`\nDone. Purged ${purged}/${targets.length} tenants.`);
