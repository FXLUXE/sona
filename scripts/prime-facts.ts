// prime-facts.ts — create tenant rows for ICP demos that only had chunks, then re-run ingest so
// brand + structured facts (hours/phone/address/booking) populate. Re-ingest is content-hash
// deduped, so NO chunks are re-embedded and golden grounding is untouched — it only fills facts.
import { sb, ingestSite, getTenant } from "../src/lib";

const TENANTS: { slug: string; name: string; url: string }[] = [
  { slug: "demo-cambsphysioclinic-co-uk",    name: "Cambridge Physiotherapy Clinic", url: "https://cambsphysioclinic.co.uk" },
  { slug: "demo-johncayley-plumbing-co-uk",  name: "John Cayley Gas Engineer",        url: "https://johncayley-plumbing.co.uk" },
  { slug: "demo-bests-co-uk",                name: "Bests Estate Agents",             url: "https://www.bests.co.uk" },
  { slug: "demo-crundellandco-co-uk",        name: "Crundell & Co Accountancy",       url: "https://www.crundellandco.co.uk" },
  { slug: "demo-electrician-norwich-co-uk",  name: "Excel Electrical Services",       url: "https://electrician-norwich.co.uk" },
  { slug: "demo-movementsbodymindyou-co-uk", name: "Movements",                       url: "https://movementsbodymindyou.co.uk" },
  { slug: "demo-adderleygreengarage-co-uk",  name: "Adderley Green Garage",           url: "https://adderleygreengarage.co.uk" },
];

const db = sb();
for (const t of TENANTS) {
  const existing = await getTenant(t.slug);
  if (!existing) {
    const apiKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { error } = await db.from("tenants").insert({
      slug: t.slug, name: t.name, plan: "trial", persona: "friendly",
      provider: "gemini", brand_color: "#111111", api_key: apiKey,
    });
    if (error) { console.log(`  ! ${t.slug}: row insert failed — ${error.message}`); continue; }
    console.log(`row created: ${t.slug}`);
  } else console.log(`row exists:  ${t.slug}`);
  // Re-ingest: dedup skips re-embedding; autoBrandTenant + extractFacts run and now have a row to write to.
  try { const n = await ingestSite(t.slug, t.url, 15); console.log(`  primed (${n} new chunks)`); }
  catch (e) { console.log(`  ! ingest failed: ${(e as Error).message}`); }
  const after = await getTenant(t.slug);
  const f = after?.facts ? Object.keys(after.facts).filter((k) => !k.startsWith("__")) : [];
  console.log(`  facts: [${f.join(", ")}]`);
}
console.log("\nDone.");
