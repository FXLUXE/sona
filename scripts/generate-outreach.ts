// generate-outreach.ts — the demo-led outreach pipeline. Reads a prospect list, builds each
// one a LIVE personalized demo (trained on their own site), and writes ready-to-send emails.
// Sending is NOT done here — you paste the output into your own email tool. Account-gated by
// design; we never blast unattended.
//
// Usage:  bun scripts/generate-outreach.ts <prospects.json> [limit]
//   e.g.  bun scripts/generate-outreach.ts prospects-salons.json 5
// Writes: outreach.md (review) + outreach.csv (mail-merge import).
//
// NOTE: each prospect triggers a crawl + embeddings (real Gemini spend) and creates a demo-
// tenant, so `limit` defaults to 5 for a cheap review run. Demo links use PUBLIC_BASE_URL —
// set it to your deployed https domain before sending for real (localhost links won't work
// for recipients).

import { readFile, writeFile } from "node:fs/promises";
import { ensureTenant, ingestSite, ingestUrl, cfg } from "../src/lib";
import { buildOutreach, type Prospect } from "../src/outreach";

const infile = process.argv[2];
const limit = Math.max(1, Math.min(Number(process.argv[3]) || 5, 200));
if (!infile) { console.log("Usage: bun scripts/generate-outreach.ts <prospects.json> [limit]"); process.exit(1); }

const all = JSON.parse(await readFile(infile, "utf8")) as Prospect[];
const list = all.slice(0, limit);
console.log(`Generating demos + emails for ${list.length}/${all.length} prospects (PUBLIC_BASE_URL=${cfg.baseUrl})…`);
if (/localhost/.test(cfg.baseUrl)) console.log("⚠ Demo links point at localhost — set PUBLIC_BASE_URL to your live domain before sending.");

const csvCell = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
const rows: string[] = [["to", "business", "website", "demoUrl", "subject"].join(",")];
const md: string[] = ["# Sona outreach — review before sending\n"];

for (const p of list) {
  let host: string;
  try { host = new URL(p.url).hostname.replace(/^www\./, ""); } catch { console.log("skip (bad url):", p.url); continue; }
  let slug = "demo-" + host.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "").slice(0, 34);
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) slug = "demo-site";
  try {
    await ensureTenant(slug, host);
    let n = await ingestSite(slug, p.url, 5);
    if (!n) n = await ingestUrl(slug, p.url);
    const demoUrl = `${cfg.baseUrl}/demo/${slug}`;
    const o = buildOutreach(p, demoUrl);
    rows.push([o.to, o.business, o.website, o.demoUrl, o.subject].map(csvCell).join(","));
    md.push(
      `## ${o.business}  \n**Site:** ${o.website}  ·  **Demo:** ${demoUrl}  ·  **Chunks:** ${n}  ·  **Email:** ${o.to || "(find address)"}\n\n` +
      `**Subject:** ${o.subject}  \n_(alt: ${o.subjectAlt})_\n\n> ${o.body.replace(/\n/g, "\n> ")}\n\n` +
      `**Follow-up (~3 days later):**\n\n> ${o.followUp.replace(/\n/g, "\n> ")}\n\n---\n`
    );
    console.log(`  ✓ ${o.business} (${n} chunks) → ${demoUrl}`);
  } catch (e: any) {
    console.log(`  ✗ ${p.url}: ${e.message}`);
  }
}

await writeFile("outreach.md", md.join("\n"));
await writeFile("outreach.csv", rows.join("\n"));
console.log(`\nDone. Review outreach.md, mail-merge outreach.csv. Sending is your step (own email account).`);
process.exit(0);
