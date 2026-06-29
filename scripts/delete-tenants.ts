// delete-tenants.ts — hard-delete specific tenants (chunks/docs/child rows + tenant row).
// Usage: bun run scripts/delete-tenants.ts slug1 slug2 ...
import { sb } from "../src/lib";
const CHILD = ["chunks", "documents", "messages", "conversations", "usage_events", "unanswered_questions", "leads", "feedback", "bookings"];
const slugs = process.argv.slice(2);
const db = sb();
for (const slug of slugs) {
  for (const t of CHILD) { try { await db.from(t).delete().eq("tenant", slug); } catch {} }
  try { await db.from("tenants").delete().eq("slug", slug); } catch {}
  console.log("deleted " + slug);
}
console.log(`Done. ${slugs.length} tenants removed.`);
