// re-embed-chunks.ts — re-embed every stored chunk's `content` with taskType "RETRIEVAL_DOCUMENT"
// so the document space matches the new query space (retrieveScored now uses "RETRIEVAL_QUERY").
// Content is NOT re-chunked — only the embedding column is rewritten in place, so golden grounding
// stays valid. Query & doc spaces MUST agree; this re-embed is required after the taskType change.
import { sb, embed } from "../src/lib";

const db = sb();
const CONCURRENCY = Number(process.env.EMBED_CONCURRENCY ?? 8);
const PAGE = 1000;

// Pull all chunk ids+content, paginated (Supabase caps rows per request).
type Row = { id: string; content: string };
const rows: Row[] = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await db
    .from("chunks")
    .select("id, content")
    .order("id", { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) throw new Error("fetch chunks failed: " + error.message);
  if (!data?.length) break;
  rows.push(...(data as Row[]));
  if (data.length < PAGE) break;
}
console.log(`fetched ${rows.length} chunks to re-embed`);

let done = 0, failed = 0;
for (let i = 0; i < rows.length; i += CONCURRENCY) {
  const batch = rows.slice(i, i + CONCURRENCY);
  await Promise.all(
    batch.map(async (r) => {
      try {
        const e = await embed(r.content, "RETRIEVAL_DOCUMENT");
        const { error } = await db.from("chunks").update({ embedding: e }).eq("id", r.id);
        if (error) throw new Error(error.message);
        done++;
      } catch (err) {
        failed++;
        console.log(`  ! chunk ${r.id}: ${(err as Error).message}`);
      }
    }),
  );
  if (done % 50 < CONCURRENCY) console.log(`  ${done}/${rows.length} re-embedded`);
}
console.log(`\nDone. re-embedded ${done}, failed ${failed}.`);
