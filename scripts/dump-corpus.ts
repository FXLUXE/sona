// dump-corpus.ts — print a tenant's ingested chunk text (no Gemini; read-only).
// Usage: bun run scripts/dump-corpus.ts <tenant-slug>
import { sb } from "../src/lib";

const slug = process.argv[2];
if (!slug) { console.error("usage: bun run scripts/dump-corpus.ts <tenant-slug>"); process.exit(1); }

const db = sb();
const { data: t } = await db.from("tenants").select("slug,name").eq("slug", slug).maybeSingle();
const { data: chunks, error } = await db.from("chunks").select("content").eq("tenant", slug);
if (error) { console.error("chunks query failed:", error.message); process.exit(1); }

console.log(`# TENANT: ${slug}  (name: ${t?.name ?? "?"})  chunks: ${chunks?.length ?? 0}\n`);
chunks?.forEach((c, i) => {
  console.log(`--- chunk ${i + 1} ---`);
  console.log((c.content ?? "").trim());
  console.log("");
});
