// find-prospects.ts — FREE local-business finder via the OpenStreetMap Overpass API.
// No API key, no account, no cost. Finds businesses in an area that have a website listed,
// by vertical, and writes a prospect list for the outreach generator.
//
// Usage:  bun scripts/find-prospects.ts <vertical> "<area name>" [outfile]
//   e.g.  bun scripts/find-prospects.ts salons "Leeds"
//         bun scripts/find-prospects.ts dental "Greater Manchester" prospects.json
//
// Verticals map to OSM tags. Output: JSON array of { name, url, email?, phone?, vertical }.

import { writeFile } from "node:fs/promises";

const OSM_TAGS: Record<string, string[]> = {
  salons: ['shop"="hairdresser', 'shop"="beauty', 'shop"="nails'],
  dental: ['amenity"="dentist', 'healthcare"="dentist'],
  trades: ['craft"="plumber', 'craft"="electrician', 'craft"="carpenter', 'shop"="trade'],
  clinics: ['amenity"="clinic', 'healthcare"="clinic', 'amenity"="doctors'],
  fitness: ['leisure"="fitness_centre', 'leisure"="sports_centre'],
  auto: ['shop"="car_repair', 'shop"="tyres'],
};

const vertical = (process.argv[2] || "").toLowerCase();
const area = process.argv[3] || "";
const outfile = process.argv[4] || `prospects-${vertical}.json`;

if (!OSM_TAGS[vertical] || !area) {
  console.log("Usage: bun scripts/find-prospects.ts <vertical> \"<area>\" [outfile]");
  console.log("Verticals:", Object.keys(OSM_TAGS).join(", "));
  process.exit(1);
}

// Build an Overpass query: businesses of the vertical's tags, within the named area, that
// have a website. `out tags` keeps it light; capped so we never hammer the free endpoint.
const filters = OSM_TAGS[vertical]
  .flatMap((t) => [`node["${t}"]["website"](area.a);`, `way["${t}"]["website"](area.a);`])
  .join("\n  ");
const query = `[out:json][timeout:30];
area["name"="${area.replace(/"/g, "")}"]->.a;
(
  ${filters}
);
out tags 250;`;

console.log(`Searching OpenStreetMap for ${vertical} in "${area}" with a website…`);
// Overpass mirrors 406 requests that lack a UA/Accept; send both, and fall back across mirrors.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
let data: { elements?: any[] } | null = null;
for (const ep of ENDPOINTS) {
  try {
    const res = await fetch(ep, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "user-agent": "SonaProspectFinder/1.0 (+https://sona.app; prospecting own outreach)",
      },
      body: "data=" + encodeURIComponent(query),
    });
    if (res.ok) { data = (await res.json()) as { elements?: any[] }; break; }
    console.log(`  ${ep} → ${res.status}, trying next mirror…`);
  } catch (e: any) { console.log(`  ${ep} → ${e.message}, trying next mirror…`); }
}
if (!data) { console.error("All Overpass mirrors failed. Try again shortly (they rate-limit)."); process.exit(1); }
const seen = new Set<string>();
const prospects: any[] = [];
for (const el of data.elements ?? []) {
  const t = el.tags || {};
  let url: string = t.website || t["contact:website"] || "";
  if (!url || !/^https?:\/\//i.test(url)) { if (url && /^[\w.-]+\.[a-z]{2,}/i.test(url)) url = "https://" + url; else continue; }
  let h: string;
  try { h = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
  // skip social/aggregator pages — we want their own site to train on
  if (/facebook|instagram|linktr|google\.|booksy|treatwell|yell\.|tripadvisor/i.test(h)) continue;
  if (seen.has(h)) continue;
  seen.add(h);
  prospects.push({
    name: t.name || "",
    url,
    email: t.email || t["contact:email"] || "",
    phone: t.phone || t["contact:phone"] || "",
    vertical,
  });
}

await writeFile(outfile, JSON.stringify(prospects, null, 2));
console.log(`Found ${prospects.length} ${vertical} with their own website. Saved → ${outfile}`);
console.log("Note: OSM rarely lists email; use the site's contact page or an email-finder for addresses.");
process.exit(0);
