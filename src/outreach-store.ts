// outreach-store.ts — a simple JSON-file pipeline store for the Outreach tab. Avoids a DB
// migration (works immediately) and persists across restarts. Single-operator scale; if this
// ever needs concurrency/multi-user, promote it to a Supabase table with the same shape.
//
// Each prospect moves through stages: found → built → ready → sent → opened → replied → signed.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Stage = "found" | "built" | "ready" | "sent" | "opened" | "replied" | "signed" | "skipped";
export type ProspectRec = {
  slug: string;            // demo tenant slug (demo-…)
  business: string;
  url: string;
  industry?: string;
  area?: string;
  email?: string;
  contactPage?: string;
  demoUrl?: string;
  chunks?: number;         // demo content depth (quality signal)
  subject?: string;
  body?: string;
  linkedin?: string;       // suggested LinkedIn message
  stage: Stage;
  qa?: { demoOk: boolean; humanTone: boolean; emailValid: boolean }; // quality-gate results
  notes?: string;
  updated?: string;
};

const FILE = join(process.cwd(), "outreach-store.json");

export async function loadStore(): Promise<Record<string, ProspectRec>> {
  try { return JSON.parse(await readFile(FILE, "utf8")); } catch { return {}; }
}
export async function saveStore(s: Record<string, ProspectRec>): Promise<void> {
  await writeFile(FILE, JSON.stringify(s, null, 2));
}

export async function upsertProspects(recs: ProspectRec[]): Promise<void> {
  const s = await loadStore();
  for (const r of recs) s[r.slug] = { ...s[r.slug], ...r };
  await saveStore(s);
}
export async function setStage(slug: string, stage: Stage, patch: Partial<ProspectRec> = {}): Promise<ProspectRec | null> {
  const s = await loadStore();
  if (!s[slug]) return null;
  s[slug] = { ...s[slug], ...patch, stage };
  await saveStore(s);
  return s[slug];
}
export async function listProspects(): Promise<ProspectRec[]> {
  const s = await loadStore();
  return Object.values(s).sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
}

// Funnel metrics for the tab.
export async function funnel(): Promise<Record<string, number>> {
  const all = await listProspects();
  const f: Record<string, number> = { total: all.length, found: 0, built: 0, ready: 0, sent: 0, opened: 0, replied: 0, signed: 0, skipped: 0 };
  for (const p of all) f[p.stage] = (f[p.stage] || 0) + 1;
  return f;
}

// Patch fields on a prospect without changing its stage (e.g. email edit).
export async function patchProspect(slug: string, patch: Partial<ProspectRec>): Promise<ProspectRec | null> {
  const s = await loadStore();
  if (!s[slug]) return null;
  s[slug] = { ...s[slug], ...patch };
  await saveStore(s);
  return s[slug];
}

// Remove a single prospect by slug.
export async function remove(slug: string): Promise<void> {
  const s = await loadStore();
  delete s[slug];
  await saveStore(s);
}

// Wipe the entire pipeline store.
export async function clearAll(): Promise<void> {
  await saveStore({});
}
