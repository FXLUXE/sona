// prospects.ts — server-side prospect discovery for the Outreach pipeline.
// Finds local businesses (by business type + a confirmed location) that list their OWN website
// on OpenStreetMap, via the free Overpass API (no key, no cost), then best-effort discovers a
// real contact email from each business's own site.
//
// SSRF: the Overpass + Nominatim endpoints are HARDCODED public APIs. Business-site fetches go
// through `safeFetch` (IP-pinned, redirect-revalidated). The Overpass query is built from a fixed
// type→tag map (or a sanitized name term) and a numeric lat/lon/radius — no user host reaches fetch.
import type { ProspectRec } from "./outreach-store";
import { safeFetch, looksLikeChainName } from "./lib";

// Business type → OSM tag selectors. UK-wide; the confirmed location + radius scopes it.
export const OSM_TAGS: Record<string, string[]> = {
  salons:       ['shop"="hairdresser', 'shop"="beauty', 'shop"="nails'],
  barbers:      ['shop"="hairdresser'],
  dental:       ['amenity"="dentist', 'healthcare"="dentist'],
  plumbers:     ['craft"="plumber'],
  electricians: ['craft"="electrician'],
  physio:       ['healthcare"="physiotherapist', 'amenity"="physiotherapist'],
  gyms:         ['leisure"="fitness_centre', 'leisure"="sports_centre'],
  garages:      ['shop"="car_repair', 'shop"="tyres'],
  estate:       ['office"="estate_agent'],
  accountants:  ['office"="accountant'],
  vets:         ['amenity"="veterinary'],
  cafes:        ['amenity"="cafe'],
  restaurants:  ['amenity"="restaurant'],
  takeaways:    ['amenity"="fast_food'],
  pubs:         ['amenity"="pub', 'amenity"="bar'],
  opticians:    ['shop"="optician'],
  pharmacies:   ['amenity"="pharmacy', 'healthcare"="pharmacy'],
  florists:     ['shop"="florist'],
  bakeries:     ['shop"="bakery'],
  butchers:     ['shop"="butcher'],
  tattoo:       ['shop"="tattoo'],
  cleaners:     ['shop"="dry_cleaning', 'shop"="laundry'],
  carwash:      ['amenity"="car_wash'],
  petgrooming:  ['shop"="pet_grooming'],
  jewellers:    ['shop"="jewelry'],
  spas:         ['leisure"="spa', 'shop"="beauty'],
  childcare:    ['amenity"="childcare', 'amenity"="kindergarten'],
  drivinginstructors: ['office"="driving_school', 'amenity"="driving_school'],
};

// Friendly labels for the dropdown (value stays the key above).
export const VERTICAL_LABELS: Record<string, string> = {
  salons: "Salons & beauty", barbers: "Barbers", dental: "Dentists", plumbers: "Plumbers",
  electricians: "Electricians", physio: "Physiotherapists", gyms: "Gyms", garages: "Car garages",
  estate: "Estate agents", accountants: "Accountants", vets: "Vets", cafes: "Cafés & coffee shops",
  restaurants: "Restaurants", takeaways: "Takeaways", pubs: "Pubs & bars", opticians: "Opticians",
  pharmacies: "Pharmacies", florists: "Florists", bakeries: "Bakeries", butchers: "Butchers",
  tattoo: "Tattoo studios", cleaners: "Dry cleaners & laundry", carwash: "Car washes",
  petgrooming: "Pet grooming", jewellers: "Jewellers", spas: "Spas", childcare: "Nurseries & childcare",
  drivinginstructors: "Driving instructors",
};

// Free-text aliases → vertical key. Lets the owner type what they actually mean.
const ALIASES: Record<string, string> = {
  hairdresser: "salons", hair: "salons", "hair salon": "salons", beauty: "salons", "beauty salon": "salons",
  nails: "salons", "nail salon": "salons", "nail bar": "salons",
  barber: "barbers", "barber shop": "barbers", barbershop: "barbers", "mens grooming": "barbers",
  dentist: "dental", orthodontist: "dental", "dental practice": "dental", "dental surgery": "dental",
  plumber: "plumbers", plumbing: "plumbers", heating: "plumbers", "gas engineer": "plumbers", boiler: "plumbers",
  electrician: "electricians", electrical: "electricians",
  physiotherapist: "physio", physiotherapy: "physio", physiotherapists: "physio",
  gym: "gyms", fitness: "gyms", "fitness centre": "gyms", "personal trainer": "gyms",
  garage: "garages", mechanic: "garages", "car repair": "garages", mot: "garages", tyres: "garages", tires: "garages",
  "estate agent": "estate", realtor: "estate", lettings: "estate",
  accountant: "accountants", bookkeeper: "accountants", bookkeeping: "accountants",
  vet: "vets", veterinary: "vets", "vet clinic": "vets", "veterinary surgery": "vets",
  cafe: "cafes", "café": "cafes", coffee: "cafes", "coffee shop": "cafes", coffeeshop: "cafes", "coffee house": "cafes",
  restaurant: "restaurants", bistro: "restaurants", eatery: "restaurants", diner: "restaurants",
  takeaway: "takeaways", "fast food": "takeaways", chippy: "takeaways", "fish and chips": "takeaways", kebab: "takeaways",
  pub: "pubs", bar: "pubs", "wine bar": "pubs", tavern: "pubs",
  optician: "opticians", optometrist: "opticians", "eye test": "opticians",
  pharmacy: "pharmacies", chemist: "pharmacies",
  florist: "florists", "flower shop": "florists", flowers: "florists",
  bakery: "bakeries", baker: "bakeries", patisserie: "bakeries",
  butcher: "butchers", butchery: "butchers",
  "tattoo parlour": "tattoo", "tattoo studio": "tattoo", "tattoo shop": "tattoo", tattooist: "tattoo",
  "dry cleaner": "cleaners", "dry cleaning": "cleaners", laundrette: "cleaners", laundry: "cleaners", launderette: "cleaners",
  "car wash": "carwash", valeting: "carwash",
  "pet grooming": "petgrooming", "dog grooming": "petgrooming", groomer: "petgrooming", "dog groomer": "petgrooming",
  jeweller: "jewellers", jeweler: "jewellers", jewellery: "jewellers", jewelry: "jewellers",
  spa: "spas", "day spa": "spas", "beauty spa": "spas",
  nursery: "childcare", childminder: "childcare", "day care": "childcare", daycare: "childcare", kindergarten: "childcare",
  "driving instructor": "drivinginstructors", "driving school": "drivinginstructors", "driving lessons": "drivinginstructors",
};

export const VERTICALS = Object.keys(OSM_TAGS);
export const VERTICAL_OPTIONS = VERTICALS.map((key) => ({ key, label: VERTICAL_LABELS[key] ?? key }));

// Resolve a free-text or preset business type to OSM tags. If it can't be mapped to a tag set,
// return a `nameTerm` so the finder falls back to matching the business NAME — so it still
// "matches what you're saying" for unusual types.
export function resolveType(input: string): { key: string; label: string; tags: string[]; nameTerm?: string } {
  const raw = (input || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw) throw new Error("Enter a business type (e.g. salons, dentists, coffee shop).");
  const hit = (k: string) => ({ key: k, label: VERTICAL_LABELS[k] ?? k, tags: OSM_TAGS[k] });
  if (OSM_TAGS[raw]) return hit(raw);
  if (ALIASES[raw]) return hit(ALIASES[raw]);
  const sing = raw.replace(/s$/, "");
  if (OSM_TAGS[sing]) return hit(sing);
  if (ALIASES[sing]) return hit(ALIASES[sing]);
  // longest-alias substring match (so "best coffee shop" → cafes)
  const alias = Object.keys(ALIASES).sort((a, b) => b.length - a.length).find((a) => raw.includes(a));
  if (alias) return hit(ALIASES[alias]);
  const vert = VERTICALS.find((v) => raw.includes(v) || v.includes(sing));
  if (vert) return hit(vert);
  // Unknown → name-based fallback search.
  return { key: raw, label: input.trim(), tags: [], nameTerm: raw };
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// ── Geocoding (place → confirmable points the owner clicks) ──
export type GeoPlace = { name: string; display: string; lat: number; lon: number; kind: string };

// Look up a place name and return candidate points. The owner clicks the right one (like an
// address autocomplete), giving us an exact lat/lon — no brittle exact area-name matching.
export async function geocodePlace(q: string, limit = 6): Promise<GeoPlace[]> {
  const query = (q || "").replace(/[\r\n]+/g, " ").trim();
  if (!query) return [];
  let serviceOk = false; // did ANY provider actually respond? (distinguishes "down" from "no match")

  // PRIMARY: Open-Meteo geocoding — free, no key, and (unlike Nominatim) does NOT block
  // datacenter/hosting IPs, so it works reliably from Render. Filtered to GB to match the
  // outreach ICP (small independent UK businesses).
  try {
    const om = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
        `&count=${Math.min(limit * 3, 20)}&language=en&format=json`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12_000) }
    );
    if (om.ok) {
      serviceOk = true;
      const j = (await om.json()) as any;
      const places: GeoPlace[] = (j?.results ?? [])
        .filter((r: any) => r && r.country_code === "GB" && r.latitude && r.longitude)
        .map((r: any) => {
          const region = r.admin2 && r.admin2 !== r.name ? r.admin2 : r.admin1;
          return {
            name: String(r.name || query),
            display: [r.name, region, "United Kingdom"].filter(Boolean).join(", "),
            lat: Number(r.latitude),
            lon: Number(r.longitude),
            kind: String(r.feature_code || "place"),
          };
        })
        .slice(0, limit);
      if (places.length) return places;
    }
  } catch { /* fall through to Nominatim */ }

  // FALLBACK: Nominatim (catches places Open-Meteo lacks; works from non-datacenter IPs).
  try {
    const url =
      `${NOMINATIM}?q=${encodeURIComponent(query)}&format=jsonv2&limit=${limit}&countrycodes=gb&addressdetails=0`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "SonaProspectFinder/1.0 (+https://asksona.co.uk; outreach geocoding)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) {
      serviceOk = true;
      const rows = (await res.json()) as any[];
      return (rows ?? [])
        .filter((r) => r && r.lat && r.lon)
        .map((r) => ({
          name: r.name || String(r.display_name || "").split(",")[0].trim(),
          display: String(r.display_name || r.name || query),
          lat: Number(r.lat),
          lon: Number(r.lon),
          kind: String(r.type || r.addresstype || r.category || ""),
        }));
    }
  } catch { /* both providers failed */ }

  if (!serviceOk) throw new Error("Place lookup is busy — try again in a moment.");
  return [];
}

// ── Email discovery (find a real contact email on the business's own site) ──
const EMAIL_G = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const EMAIL_ONE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const EMAIL_JUNK = /(example\.|sentry|\.png|\.jpe?g|\.gif|\.svg|\.webp|@2x|@3x|wixpress|squarespace|godaddy|yourdomain|domain\.com|email\.com|sentry\.io|wordpress|cloudflare|w3\.org|schema\.org)/i;
const CONTACT_PREFIXES = new Set(["info", "hello", "hi", "contact", "enquiries", "enquiry", "inquiries", "bookings", "book", "admin", "reception", "office", "sales", "team", "mail", "appointments"]);

function rootDomain(host: string): string {
  const h = host.replace(/^www\./, "");
  const parts = h.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : h;
}

// Pick the most likely genuine contact email: prefer one on the business's OWN domain, then a
// contact-style prefix; penalise noreply/personal inboxes. Returns "" if nothing is trustworthy.
function pickBestEmail(emails: string[], host: string): string {
  const clean = [...new Set(emails.map((e) => e.toLowerCase().replace(/[.,;:)>"']+$/, "")))]
    .filter((e) => EMAIL_ONE.test(e) && !EMAIL_JUNK.test(e) && e.length < 64);
  if (!clean.length) return "";
  const own = host.replace(/^www\./, "");
  const root = rootDomain(host);
  const score = (e: string) => {
    const [local, dom = ""] = e.split("@");
    let s = 0;
    if (dom === own || dom === root || dom.endsWith("." + root)) s += 100; // own domain = "the right one"
    if (CONTACT_PREFIXES.has(local)) s += 20;
    if (/^(noreply|no-reply|donotreply|do-not-reply|mailer|postmaster|abuse|privacy|webmaster|hostmaster)/.test(local)) s -= 80;
    if (/(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|aol|btinternet|sky)\./.test(dom)) s -= 8; // personal inbox: allowed but weaker
    return s;
  };
  const best = clean.sort((a, b) => score(b) - score(a))[0];
  return score(best) <= -50 ? "" : best; // refuse if only noreply-type junk survived
}

// Best-effort: discover a real contact email on the business's own site (homepage + contact/about
// pages). Prefers an address on their own domain ("the right one"). Returns "" if none found.
export async function findSiteEmail(url: string): Promise<string> {
  let host = "";
  try { host = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url).hostname; } catch { return ""; }
  const base = (/^https?:\/\//i.test(url) ? url : "https://" + url).replace(/\/+$/, "");
  const pages = [base, base + "/contact", base + "/contact-us", base + "/about", base + "/about-us"];
  const found: string[] = [];
  for (const p of pages) {
    try {
      const res = await safeFetch(p, { headers: { "user-agent": "SonaBot/1.0 (+https://sona.app)" } });
      if (!res.ok) continue;
      const html = await res.text();
      for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) if (m[1]) found.push(decodeURIComponent(m[1]));
      for (const m of html.matchAll(EMAIL_G)) found.push(m[0]);
      // Early exit once we have a confident own-domain hit.
      const best = pickBestEmail(found, host);
      if (best && (best.split("@")[1] === host.replace(/^www\./, "") || best.split("@")[1] === rootDomain(host))) return best;
    } catch { /* try next page */ }
    if (found.length > 40) break;
  }
  return pickBestEmail(found, host);
}

// Run async tasks with a small concurrency cap (keeps email-scraping fast without hammering sites).
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

// ── Slug (mirrors /api/demo so finder + build agree on the store key) ──
export function slugForUrl(url: string): string | null {
  let host: string;
  try { host = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url).hostname.replace(/^www\./, ""); }
  catch { return null; }
  const slug = "demo-" + host.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "").slice(0, 34);
  return /^[a-z0-9-]{2,40}$/.test(slug) ? slug : null;
}

const TOO_BROAD = new Set(["uk", "u.k.", "gb", "britain", "great britain", "united kingdom", "england", "scotland", "wales", "northern ireland", "ireland", "usa", "u.s.a.", "us", "united states", "america", "europe", "world"]);

export type FindOpts = {
  type: string;
  area: string;
  geo?: { lat: number; lon: number; radiusMiles?: number };
  limit?: number;
  requireEmail?: boolean;
  nameKeyword?: string;
};
export type FindResult = { prospects: ProspectRec[]; scanned: number; skippedNoEmail: number; skippedChain: number };

// --- ICP gate: keep only small independent local businesses; drop national chains/franchises. ---
// Strongest free signal: OSM `brand`/`brand:wikidata` tags — independents almost never set them,
// multi-site brands/franchises almost always do. Backup: the shared known-UK-chains name check
// (defined in lib.ts so onboarding and the finder stay in sync).
function isChain(t: Record<string, any>, name: string): boolean {
  if (t.brand || t["brand:wikidata"] || t["brand:wikipedia"]) return true;
  return looksLikeChainName(name);
}

// Find businesses of `type` near the confirmed `geo` point (or, legacy, within a named area) that
// list a website. Dedupes by host, discovers a contact email when required, applies filters,
// caps at `limit`.
export async function findProspects(opts: FindOpts): Promise<FindResult> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);
  const resolved = resolveType(opts.type);
  const safeArea = (opts.area || "").replace(/["\\]/g, "").trim();
  const geo = opts.geo && Number.isFinite(opts.geo.lat) && Number.isFinite(opts.geo.lon) ? opts.geo : undefined;

  if (!geo) {
    if (!safeArea) throw new Error("Pick a location first.");
    if (TOO_BROAD.has(safeArea.toLowerCase()))
      throw new Error(`"${safeArea}" is too broad — search a town, city, or county (e.g. Leeds, Cardiff, Greater Manchester).`);
  }

  const scope = geo
    ? `around:${Math.round(Math.min(Math.max(geo.radiusMiles ?? 5, 1), 50) * 1609)},${geo.lat},${geo.lon}`
    : "area.a";

  let selectors: string;
  if (resolved.tags.length) {
    selectors = resolved.tags
      .flatMap((t) => [`node["${t}"]["website"](${scope});`, `way["${t}"]["website"](${scope});`])
      .join("\n  ");
  } else {
    // Name-fallback: any business-ish feature whose NAME matches the typed term and has a website.
    const term = (resolved.nameTerm || "").replace(/["\\]/g, "").trim();
    if (!term) throw new Error("Enter a business type (e.g. salons, dentists, coffee shop).");
    selectors = ["shop", "amenity", "craft", "office", "leisure", "healthcare"]
      .flatMap((k) => [
        `node["${k}"]["name"~"${term}",i]["website"](${scope});`,
        `way["${k}"]["name"~"${term}",i]["website"](${scope});`,
      ])
      .join("\n  ");
  }

  const query = geo
    ? `[out:json][timeout:50];\n(\n  ${selectors}\n);\nout tags 250;`
    : `[out:json][timeout:50];\narea["name"="${safeArea}"]->.a;\n(\n  ${selectors}\n);\nout tags 250;`;

  let data: { elements?: any[] } | null = null;
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          "user-agent": "SonaProspectFinder/1.0 (+https://sona.app; prospecting own outreach)",
        },
        body: "data=" + encodeURIComponent(query),
        signal: AbortSignal.timeout(40_000),
      });
      if (res.ok) { data = (await res.json()) as { elements?: any[] }; break; }
    } catch { /* try next mirror */ }
  }
  if (!data) throw new Error("All OpenStreetMap mirrors are busy — try again shortly.");

  // 1. Build raw candidate records (dedup by host, drop socials/aggregators, apply name keyword).
  const keyword = (opts.nameKeyword || "").trim().toLowerCase();
  const seen = new Set<string>();
  const now = new Date().toISOString();
  let skippedChain = 0;
  type Cand = ProspectRec & { _host: string; _osmEmail: string };
  const candidates: Cand[] = [];
  for (const el of data.elements ?? []) {
    const t = el.tags || {};
    let url: string = t.website || t["contact:website"] || "";
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) { if (/^[\w.-]+\.[a-z]{2,}/i.test(url)) url = "https://" + url; else continue; }
    let h: string;
    try { h = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
    if (/facebook|instagram|linktr|google\.|booksy|treatwell|yell\.|tripadvisor|fresha|wix\.com/i.test(h)) continue;
    if (seen.has(h)) continue;
    const business = t.name || h.split(".")[0];
    if (keyword && !business.toLowerCase().includes(keyword)) continue;
    if (isChain(t, business)) { skippedChain++; continue; }  // ICP gate: independents only, no chains
    seen.add(h);
    const slug = slugForUrl(url);
    if (!slug) continue;
    const osmEmail = t.email || t["contact:email"] || "";
    candidates.push({
      _host: h,
      _osmEmail: osmEmail,
      slug,
      business,
      url,
      industry: resolved.key,
      area: geo ? safeArea || resolved.label : safeArea,
      email: osmEmail,
      contactPage: t["contact:website"] || "",
      stage: "found",
      updated: now,
    });
  }

  // 2. Email discovery. When required, scrape sites that lack an OSM email; drop any we still
  //    can't email (per the owner's rule: no real email → it doesn't count). Cap how many we
  //    scrape so a big result set doesn't run forever.
  let skippedNoEmail = 0;
  const out: ProspectRec[] = [];
  if (opts.requireEmail) {
    const SCRAPE_CAP = Math.min(candidates.length, Math.max(limit * 2, 30));
    const pool = candidates.slice(0, SCRAPE_CAP);
    await mapPool(pool.filter((c) => !c._osmEmail), 6, async (c) => {
      c.email = await findSiteEmail(c.url).catch(() => "");
    });
    for (const c of pool) {
      const { _host, _osmEmail, ...rec } = c;
      if (!rec.email || !EMAIL_ONE.test(rec.email)) { skippedNoEmail++; continue; }
      out.push(rec);
      if (out.length >= limit) break;
    }
  } else {
    for (const c of candidates) {
      const { _host, _osmEmail, ...rec } = c;
      out.push(rec);
      if (out.length >= limit) break;
    }
  }

  return { prospects: out, scanned: candidates.length, skippedNoEmail, skippedChain };
}
