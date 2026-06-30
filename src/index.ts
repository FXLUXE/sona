import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import {
  cfg, ingestUrl, answer, getTenant, overQuota, rateLimit, sessionExists,
  configWarnings, recordBooking, tenantStats, getUser, userTenants, isMember, claimTenant,
  recentLeads, recentConversations, contentGaps, exportSubject, deleteSubject,
  getTenantSettings, updateTenantSettings, validCalLink, ensureTenant,
  recentBookings, conversationMessages, resolveGap, recordFeedback, ingestSite,
  chat, sampleChunks, retrieve, finalizeDemo, purgeTenant, findContactEmail,
  safeFetch, detectChatWidget, feedbackList, cleanUrl, unlocksProFeatures,
  purgeOldDemos, sendWeeklyDigest, tenantsForDigest, normalizeUrlInput, promoteDemo,
} from "./lib";
import { buildOutreach, linkedinMessage } from "./outreach";
import { findProspects, slugForUrl, geocodePlace, VERTICAL_OPTIONS } from "./prospects";
import { upsertProspects, listProspects, setStage, patchProspect, funnel, remove, clearAll, type Stage } from "./outreach-store";
import { createCheckout, createPortal, handleWebhook, planLimits } from "./billing";
import { dashboardHtml } from "./dashboard";
import { landingHtml } from "./landing";
import { privacyHtml, termsHtml } from "./legal";
import { seoPageHtml, sitemapXml, getVertical } from "./seo";

// Map a thrown error to a response. Plan-limit hits become 402 (Payment Required) with
// an upgrade flag so the dashboard can surface an Upgrade CTA instead of a generic fail.
function ingestError(c: any, e: any) {
  if (e?.message === "SOURCE_LIMIT_REACHED")
    return c.json({ error: "Source limit reached for your plan.", upgrade: true }, 402);
  const m = String(e?.message ?? "");
  // Big/anti-bot-protected sites (e.g. Harrods behind Akamai) hang until our fetch aborts. Show a
  // human message, not the raw "operation timed out" — the visitor didn't do anything wrong.
  if (/timed out|aborted|timeout/i.test(m))
    return c.json({ error: "That website took too long to respond — it may block automated visits. Try a different site." }, 504);
  if (/HTTP [45]\d\d|fetch failed|network|ENOTFOUND|EAI_AGAIN|certificate|SSL|ECONNREFUSED/i.test(m))
    return c.json({ error: "Couldn't read that website — it may block automated visits or be unavailable right now. Try a different site." }, 502);
  return c.json({ error: "Couldn't build a demo from that site. Try a different one." }, 500);
}

// Surface missing-but-required env at boot so failures are obvious, not cryptic.
for (const w of configWarnings()) console.warn("⚠ config:", w);
// PUBLIC_BASE_URL feeds every outreach + weekly-digest link and the widget script src. If it's unset
// or still localhost in a deployed environment, those links 404 for recipients — warn loudly at boot.
if (!process.env.PUBLIC_BASE_URL || /localhost|127\.0\.0\.1/.test(process.env.PUBLIC_BASE_URL))
  console.warn("⚠ config: PUBLIC_BASE_URL is unset or localhost — outreach/digest links and the widget embed will point at localhost. Set it to your live domain before launch.");

const app = new Hono();

// Gzip/brotli every response. Biggest single payload win — the landing, dashboard and widget.js are
// large text assets that compress ~75%. Registered first so it wraps all routes on the way out.
app.use("*", compress());

// The embeddable widget runs on customers' OWN domains, so its public API calls are
// cross-origin and (sending JSON) trigger a CORS preflight. Without these headers the
// browser blocks every chat/suggest/feedback/book call on a live customer site — only the
// same-origin /demo preview worked. Scoped to the public widget endpoints only; the
// authenticated dashboard API (Authorization-bearer) is deliberately left same-origin.
// No credentials are sent by the widget, so origin:"*" is safe here.
const widgetCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["content-type"],
  maxAge: 86400,
});
app.use("/api/chat", widgetCors);
app.use("/api/suggest/*", widgetCors);
app.use("/api/feedback", widgetCors);
app.use("/api/book", widgetCors);

// Trusted client IP for rate-limit keys. Behind a single proxy (the prod deploy on
// Railway/Render), the proxy APPENDS the real client IP as the LAST x-forwarded-for hop;
// the left-most value is client-controlled and was being used to mint a fresh rate-limit
// bucket per request (bypassing every per-IP limit, incl. the paid /api/demo + /api/chat).
// Trust the last hop; fall back to Bun's socket address, then "anon".
function clientIp(c: any): string {
  const xff = (c.req.header("x-forwarded-for") ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
  if (xff.length) return xff[xff.length - 1];
  try { const a = (c.env as any)?.requestIP?.(c.req.raw); if (a?.address) return a.address; } catch {}
  return "anon";
}

// Global denial-of-wallet backstop for the public auto-demo: cap total demo ingests/hour
// across ALL IPs (per process), independent of the spoofable per-IP limit. Each demo ingest
// is real Gemini embedding spend, so this is the hard ceiling on cost from anonymous abuse.
let demoWindow = { t: 0, n: 0 };
function demoBudgetOk(maxPerHour = 120): boolean {
  const now = Date.now();
  if (now - demoWindow.t > 3_600_000) demoWindow = { t: now, n: 0 };
  demoWindow.n++;
  return demoWindow.n <= maxPerHour;
}

// Public marketing + auto-demo landing page (the no-calls acquisition surface).
app.get("/", (c) => {
  c.header("content-type", "text/html");
  c.header("x-content-type-options", "nosniff");
  // CSP backstop: the page carries inline script/style and pulls Google Fonts; lock the
  // rest down so any future reflected sink can't load off-origin code or exfiltrate.
  c.header(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
      "img-src 'self' https: data:; connect-src 'self'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'"
  );
  return c.body(landingHtml(cfg.baseUrl));
});

// Liveness probe for the host (uptime checks / load balancer).
app.get("/health", (c) => c.text("ok"));

// Legal pages (required by Stripe + GDPR; linked from the landing footer + dashboard).
const legalRoute = (path: string, render: (b: string) => string) =>
  app.get(path, (c) => {
    c.header("content-type", "text/html");
    c.header("x-content-type-options", "nosniff");
    return c.body(render(cfg.baseUrl));
  });
legalRoute("/privacy", privacyHtml);
legalRoute("/terms", termsHtml);

// Programmatic SEO: one differentiated landing page per vertical (autonomous inbound).
app.get("/for/:vertical", (c) => {
  const v = getVertical(c.req.param("vertical"));
  if (!v) return c.text("not found", 404);
  c.header("content-type", "text/html");
  c.header("x-content-type-options", "nosniff");
  c.header(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
      "img-src 'self' https: data:; connect-src 'self'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'"
  );
  return c.body(seoPageHtml(cfg.baseUrl, v));
});

app.get("/sitemap.xml", (c) => {
  c.header("content-type", "application/xml");
  return c.body(sitemapXml(cfg.baseUrl));
});

app.get("/robots.txt", (c) => {
  c.header("content-type", "text/plain");
  return c.body(`User-agent: *\nAllow: /\nSitemap: ${cfg.baseUrl}/sitemap.xml\n`);
});

// Branded social-share image (Open Graph / Twitter card). An SVG so it needs no build step
// or binary asset; referenced by the landing/demo meta tags. (For platforms that reject SVG
// OG images, the founder can later drop in a PNG at the same path.)
app.get("/og-image.svg", (c) => {
  c.header("content-type", "image/svg+xml");
  c.header("cache-control", "public, max-age=86400");
  return c.body(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
      `<rect width="1200" height="630" fill="#11212b"/>` +
      `<circle cx="600" cy="170" r="280" fill="#162a34"/>` +
      `<g fill="none" stroke="#c79a4b" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" transform="translate(548,96) scale(4.3)">` +
      `<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></g>` +
      `<text x="600" y="360" text-anchor="middle" fill="#f6f1e9" font-family="Georgia,serif" font-size="76" font-weight="600">The front desk that never clocks out</text>` +
      `<text x="600" y="430" text-anchor="middle" fill="#c79a4b" font-family="system-ui,sans-serif" font-size="34">Sona — an AI receptionist for your website</text>` +
      `<text x="600" y="500" text-anchor="middle" fill="#9fb0ad" font-family="system-ui,sans-serif" font-size="26">Paste your URL · live in seconds · no calls</text>` +
      `</svg>`
  );
});

// Public auto-demo: paste a URL → instant bot trained on that site. Rate-limited per IP
// (the embed budget is real money). Demo tenants are prefixed `demo-` to keep them out
// of the claimed-tenant namespace.
app.post("/api/demo", async (c) => {
  const { url: rawUrl } = await c.req.json().catch(() => ({}));
  // Forgive typos/missing protocol in what they paste (htps://, .cmo, bare domain, …) before the
  // SSRF guard. Returns a clean https:// URL or null if it still isn't a domain.
  const url = normalizeUrlInput(rawUrl);
  if (!url)
    return c.json({ error: "that doesn't look like a website address — try yourbusiness.com" }, 400);
  const ip = clientIp(c);
  if (!rateLimit(`demo:${ip}`, 3)) return c.json({ error: "slow down — try again in a minute" }, 429);
  if (!demoBudgetOk()) return c.json({ error: "demos are busy right now — try again shortly" }, 429);
  let host: string;
  try { host = new URL(url).hostname.replace(/^www\./, ""); }
  catch { return c.json({ error: "valid http(s) url required" }, 400); }
  let slug = "demo-" + host.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "").slice(0, 34);
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) slug = "demo-site";
  // Never let an anonymous demo write into a claimed tenant's knowledge base (answer-poisoning).
  // Claimed tenants can't use a demo- slug (see /api/me/claim), so this is belt-and-suspenders.
  const owned = await getTenant(slug);
  if (owned?.owner_id) return c.json({ error: "this site already has an account" }, 409);
  await ensureTenant(slug, host);
  try {
    // Speed: ingest the homepage FIRST and return the demo right away (~3s instead of ~20s),
    // then crawl more pages in the BACKGROUND so the bot keeps getting richer while the
    // visitor reads. Per-page + global budgets bound the embedding cost either way.
    const chunks = await ingestUrl(slug, url); // SSRF-guarded in lib
    void ingestSite(slug, url, 6).catch(() => {}); // fire-and-forget enrichment
    // Relative URL — the landing preview iframe loads it same-origin, so it never points at the
    // wrong host/port if PUBLIC_BASE_URL differs from where the page is actually served.
    return c.json({ slug, demoUrl: `/demo/${slug}`, chunks });
  } catch (e: any) { return ingestError(c, e); }
});

// ── Billing (Stripe) ──
app.post("/api/t/:tenant/billing/checkout", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { plan } = await c.req.json().catch(() => ({}));
  try { return c.json(await createCheckout(tenant, plan)); }
  catch (e: any) { return c.json({ error: e.message }, e.message === "billing disabled" ? 503 : 400); }
});

app.post("/api/t/:tenant/billing/portal", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  try { return c.json(await createPortal(tenant)); }
  catch (e: any) { return c.json({ error: e.message }, e.message === "billing disabled" ? 503 : 400); }
});

// Stripe webhook: UNAUTHENTICATED but signature-verified (the signature IS the perimeter).
// Reads the raw body — never parse/normalize it before constructEvent, or verification breaks.
app.post("/api/billing/webhook", async (c) => {
  const sig = c.req.header("stripe-signature") ?? "";
  const raw = await c.req.text();
  try { await handleWebhook(raw, sig); return c.json({ received: true }); }
  catch (e: any) { return c.json({ error: e.message }, 400); }
});

app.post("/api/ingest", async (c) => {
  const { tenant, url } = await c.req.json();
  if (!tenant || !url) return c.json({ error: "tenant and url required" }, 400);
  // Service key bypasses RLS, so the membership check IS the perimeter — gate it.
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  try {
    const n = await ingestUrl(tenant, url);
    return c.json({ ok: true, chunks: n });
  } catch (e: any) { return ingestError(c, e); }
});

app.post("/api/chat", async (c) => {
  const { tenant, message, sessionId, pageUrl } = await c.req.json();
  if (!tenant || !message) return c.json({ error: "tenant and message required" }, 400);

  // Per-tenant+IP rate limit (abuse guard).
  const ip = clientIp(c);
  if (!rateLimit(`${tenant}:${ip}`))
    return c.json({ reply: "You're sending messages too fast — give it a second.", rateLimited: true }, 429);

  // Monthly conversation quota: block only brand-new conversations; let ongoing sessions finish.
  const t = await getTenant(tenant);
  if (t && (await overQuota(t)) && !(await sessionExists(tenant, sessionId)))
    return c.json({ reply: "This assistant has hit its monthly limit. Please leave your email and the team will reply.", quota: true }, 429);

  try {
    return c.json(await answer(tenant, message, { sessionId, pageUrl }));
  } catch (e) {
    // Never surface raw provider/DB error text to the visitor (it can leak operational detail).
    console.error("chat answer failed:", e);
    return c.json({ reply: "Sorry — I hit a snag answering that. Please leave your email and the team will follow up.", error: "service_unavailable" }, 503);
  }
});

app.post("/api/book", async (c) => {
  const { tenant, conversationId, name, email, startAt } = await c.req.json();
  if (!tenant || !email) return c.json({ error: "tenant and email required" }, 400);
  // Public endpoint (the widget books) — rate-limit + validate to stop spam/enumeration.
  const ip = clientIp(c);
  if (!rateLimit(`book:${tenant}:${ip}`, 5)) return c.json({ error: "too many requests" }, 429);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: "invalid email" }, 400);
  if (!(await getTenant(tenant))) return c.json({ error: "unknown tenant" }, 404);
  try {
    const booking = await recordBooking(tenant, { conversationId, name, email, startAt });
    return c.json({ ok: true, booking });
  } catch (e) {
    console.error("recordBooking failed:", e);
    return c.json({ error: "Booking could not be saved — please try again" }, 500);
  }
});

app.get("/api/stats", async (c) => {
  const tenant = c.req.query("tenant");
  if (!tenant) return c.json({ error: "tenant required" }, 400);
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  return c.json(await tenantStats(tenant));
});

// ── Dashboard API (Supabase Auth magic-link; JWT verified server-side) ──

// Public bootstrap: the browser needs the anon key + url to start a session.
app.get("/api/config", (c) =>
  c.json({ supabaseUrl: cfg.supabaseUrl, supabaseAnonKey: cfg.supabaseAnonKey })
);

// Pull the bearer token, verify it, return the user — or 401.
async function requireUser(c: any) {
  const jwt = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const user = await getUser(jwt);
  if (!user) return null;
  return user;
}

// Verify the user AND that they manage `tenant`. Returns user or null (caller 401/403s).
async function requireMember(c: any, tenant: string) {
  const user = await requireUser(c);
  if (!user) return { user: null, ok: false };
  return { user, ok: await isMember(tenant, user.id) };
}

// Founder-only gate (Outreach is Daniel's prospecting tooling, not a customer feature). Customers
// must NOT see the prospect pipeline. `ok` is true only for the configured ADMIN_EMAIL.
function isAdminUser(user: any): boolean {
  return !!cfg.adminEmail && !!user?.email && String(user.email).toLowerCase() === cfg.adminEmail.toLowerCase();
}
async function requireAdmin(c: any) {
  const user = await requireUser(c);
  if (!user) return { user: null, ok: false };
  return { user, ok: isAdminUser(user) };
}

app.get("/api/me/tenants", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  return c.json({ tenants: await userTenants(user.id), isAdmin: isAdminUser(user) });
});

app.post("/api/me/claim", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const { slug, name } = await c.req.json();
  if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug))
    return c.json({ error: "slug must be 2-40 chars: a-z 0-9 -" }, 400);
  // Reserve the demo- namespace for anonymous auto-demos so a claimed tenant can never
  // collide with (or be poisoned via) the public /api/demo ingest path.
  if (/^demo-/.test(slug)) return c.json({ error: "that name is reserved — pick another" }, 400);
  const t = await claimTenant(slug, user.id, name);
  if (!t) return c.json({ error: "that slug is already taken" }, 409);
  return c.json({ ok: true, tenant: t });
});

// Promote a tested demo into the signed-in user's account: copies the demo's knowledge + branding
// into a fresh OWNED clean-slug tenant (the demo- tenant itself is never claimed — it's left to be
// purged). This is the only controlled path that reads a demo- tenant for a logged-in user; it only
// ever copies OUT, so the demo- reservation/SSRF guarantees are untouched.
app.post("/api/me/promote", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const { from, name } = await c.req.json().catch(() => ({}));
  if (!from || typeof from !== "string" || !/^demo-[a-z0-9-]{1,40}$/.test(from))
    return c.json({ error: "from must be a demo- slug" }, 400);
  const r = await promoteDemo(from, user.id, typeof name === "string" ? name.slice(0, 80) : undefined);
  if ("error" in r) {
    const code = r.error === "not_found" ? 404 : (r.error === "already_claimed" || r.error === "slug_taken") ? 409 : 400;
    return c.json({ error: r.error }, code);
  }
  return c.json({ ok: true, tenant: r.tenant });
});

// Generic guarded read for the per-tenant dashboard tabs.
function guardedTenantRoute(path: string, loader: (tenant: string) => Promise<unknown>) {
  app.get(path, async (c) => {
    const tenant = c.req.param("tenant") ?? "";
    const { user, ok } = await requireMember(c, tenant);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (!ok) return c.json({ error: "forbidden" }, 403);
    try {
      return c.json(await loader(tenant));
    } catch (e) {
      console.error("guardedTenantRoute loader error:", path, e);
      return c.json({ error: "Something went wrong" }, 500);
    }
  });
}

guardedTenantRoute("/api/t/:tenant/stats", (t) => tenantStats(t));
guardedTenantRoute("/api/t/:tenant/leads", (t) => recentLeads(t));
guardedTenantRoute("/api/t/:tenant/convos", (t) => recentConversations(t));
guardedTenantRoute("/api/t/:tenant/gaps", (t) => contentGaps(t));
guardedTenantRoute("/api/t/:tenant/settings", (t) => getTenantSettings(t));
guardedTenantRoute("/api/t/:tenant/bookings", (t) => recentBookings(t));

// Download captured leads as a CSV (opens in Excel/Sheets). Guarded; the dashboard fetches
// it with the auth header and triggers a file download.
app.get("/api/t/:tenant/leads.csv", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const leads = await recentLeads(tenant, 1000);
  const cols = ["captured_at", "name", "email", "phone", "score", "question", "page_url"];
  const cell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...leads.map((l: any) => cols.map((k) => cell(l[k])).join(","))].join("\r\n");
  c.header("content-type", "text/csv; charset=utf-8");
  c.header("content-disposition", `attachment; filename="${tenant}-leads.csv"`);
  return c.body("﻿" + csv); // BOM so Excel reads UTF-8 + accents correctly
});

// Billing status for the dashboard Billing tab: current plan, plan limits, and usage
// against them. Read-only; the upgrade/manage actions are the checkout/portal endpoints.
app.get("/api/t/:tenant/billing/status", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const t = await getTenant(tenant);
  const limits = planLimits(t);
  const stats = await tenantStats(tenant);
  return c.json({
    plan: t?.plan ?? "trial",
    limits,
    usage: { conversations: stats.conversations30d, sources: stats.sources },
    billingEnabled: !!cfg.stripeSecret,
    hasSubscription: !!t?.stripe_subscription_id,
  });
});

// ── Outreach pipeline ──────────────────────────────────────────────────────
// A founder-only, single-operator pipeline: FIND prospects (free, via OpenStreetMap) →
// BUILD each a live demo trained on their own site → review the ready-to-send copy →
// manually mark progress (sent/opened/replied/signed). State lives in outreach-store.json
// (no DB migration). We never SEND — that is account-gated to the founder by design.
const STAGES: Stage[] = ["found", "built", "ready", "sent", "opened", "replied", "signed", "skipped"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// A clean fallback business name from a domain when the finder gave none (pasted URLs):
// "therawdonbarbershop.co.uk" → "Therawdonbarbershop". Can't word-split reliably, but it's a
// clean placeholder the operator can correct — never a garbage token.
function titleFromHost(host: string): string {
  const base = host.replace(/\.(com|co\.uk|io|net|org|co|app|shop|store|uk|biz)$/i, "").split(".").pop() || host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Detect a lapsed/repurposed domain: the verified business name has no word-overlap with what
// the live page calls itself AND no keyword of the expected vertical appears in the content.
// Returns a warning string for the pipeline (so the operator skips it), or "" when it looks fine.
const VERTICAL_KW: Record<string, string[]> = {
  salons: ["hair", "salon", "barber", "beauty", "nail", "stylist"],
  dental: ["dental", "dentist", "teeth", "tooth", "implant", "orthodont"],
  plumbers: ["plumb", "heating", "boiler", "drain"],
  electricians: ["electric", "rewir", "lighting", "fuse"],
  physio: ["physio", "rehab", "injury", "sports therapy"],
  gyms: ["gym", "fitness", "train", "workout", "class"],
  garages: ["car", "mot", "tyre", "garage", "vehicle", "repair"],
  estate: ["property", "estate", "letting", "homes", "rent", "sale"],
  accountants: ["account", "tax", "bookkeep", "payroll", "audit"],
  vets: ["vet", "pet", "animal", "veterinary"],
};
function siteMismatch(name: string, vertical: string | undefined, pageName: string, sample: string): string {
  const toks = (s: string) => new Set((s || "").toLowerCase().match(/[a-z]{3,}/g) || []);
  const a = toks(name), b = toks(pageName);
  let overlap = 0; a.forEach((t) => { if (b.has(t)) overlap++; });
  const nameOff = pageName.length > 1 && overlap === 0;
  const kws = VERTICAL_KW[vertical ?? ""] ?? [];
  const vfound = !kws.length || kws.some((k) => sample.includes(k));
  if (nameOff && !vfound) return "⚠ Live site looks unrelated to this business — the domain may have changed or expired. Review before sending.";
  if (!vfound && sample.length > 40 && kws.length) return `⚠ Live site doesn't read like a ${vertical} — review before sending.`;
  return "";
}

// Attach demo URL + ready-to-paste copy + quality-gate flags to a stored prospect.
function decorate(p: any) {
  const demoUrl = p.demoUrl || `${cfg.baseUrl}/demo/${p.slug}`;
  const o = buildOutreach({ name: p.business, url: p.url, email: p.email }, demoUrl);
  return {
    ...p,
    demoUrl,
    subject: o.subject, subjectAlt: o.subjectAlt, body: o.body, followUp: o.followUp,
    linkedin: linkedinMessage({ name: p.business, url: p.url }, demoUrl),
    qa: {
      demoOk: (p.chunks ?? 0) >= 3,          // enough content to answer (thin sites fail this)
      emailValid: EMAIL_RE.test(p.email ?? ""),
      humanTone: true,                        // copy is hand-written, not generated per-send
    },
  };
}

app.get("/api/outreach/verticals", async (c) => {
  const { user } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  return c.json({ verticals: VERTICAL_OPTIONS });
});

// GEOCODE: place name → confirmable candidate points (the owner clicks the right one).
app.get("/api/outreach/geocode", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const q = c.req.query("q") || "";
  if (!q.trim()) return c.json({ places: [] });
  try { return c.json({ places: await geocodePlace(q) }); }
  catch (e: any) { return c.json({ error: e.message ?? "geocode failed" }, 502); }
});

// FIND: OSM lookup by business type near a confirmed point (radius) + optional filters.
// Persists results at stage "found".
app.post("/api/outreach/find", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const body = await c.req.json().catch(() => ({} as any));
  const type = body.type ?? body.vertical; // accept legacy `vertical`
  if (!type || typeof type !== "string") return c.json({ error: "Enter a business type." }, 400);
  const lat = Number(body.lat), lon = Number(body.lon);
  const geo = Number.isFinite(lat) && Number.isFinite(lon)
    ? { lat, lon, radiusMiles: Number(body.radiusMiles) || 5 }
    : undefined;
  if (!geo && !(body.area && typeof body.area === "string"))
    return c.json({ error: "Pick a location first." }, 400);
  try {
    const { prospects, scanned, skippedNoEmail, skippedChain } = await findProspects({
      type,
      area: typeof body.area === "string" ? body.area : "",
      geo,
      limit: Math.min(Number(body.limit) || 25, 50),
      requireEmail: !!body.requireEmail,
      nameKeyword: typeof body.nameKeyword === "string" ? body.nameKeyword : "",
    });
    // "Hide already-built": drop slugs already past the "found" stage in the pipeline.
    let out = prospects;
    if (body.hideBuilt) {
      const existing = await listProspects();
      const builtSlugs = new Set(existing.filter((p) => p.stage && p.stage !== "found").map((p) => p.slug));
      out = out.filter((p) => !builtSlugs.has(p.slug));
    }
    if (out.length) await upsertProspects(out);
    return c.json({ found: out.length, prospects: out, scanned, skippedNoEmail, skippedChain });
  } catch (e: any) { return c.json({ error: e.message ?? "find failed" }, 502); }
});

// BUILD: train a demo for given prospect slugs (from finder) and/or pasted URLs.
// Homepage-fast + background enrich (like /api/demo); advances stage found→ready.
app.post("/api/outreach/build", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const body = await c.req.json().catch(() => ({}));
  const store = await listProspects();
  const bySlug = Object.fromEntries(store.map((p) => [p.slug, p]));

  // Resolve a work list: explicit slugs from the pipeline + any pasted raw URLs.
  const slugs: string[] = Array.isArray(body.slugs) ? body.slugs : [];
  const rawUrls: string[] = Array.isArray(body.urls)
    ? body.urls
    : String(body.urls ?? "").split(/[\n,]+/).map((u: string) => u.trim()).filter(Boolean);
  const jobs: { slug: string; url: string }[] = [];
  for (const s of slugs) if (bySlug[s]) jobs.push({ slug: s, url: bySlug[s].url });
  for (let u of rawUrls) {
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    const slug = slugForUrl(u);
    if (slug) jobs.push({ slug, url: u });
  }

  const built: any[] = [];
  for (const { slug, url } of jobs.slice(0, 25)) {
    if (!demoBudgetOk()) break; // global denial-of-wallet cap
    let host: string;
    try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
    const rec = bySlug[slug];
    // Verified business name: the finder's OSM name, else a clean title from the domain. This
    // overrides whatever the live page calls itself (parked domains lie).
    const verifiedName = (rec?.business && rec.business.trim()) || titleFromHost(host);
    try {
      const owned = await getTenant(slug);
      if (owned?.owner_id) continue; // never overwrite a claimed tenant
      await ensureTenant(slug, verifiedName);
      // Pre-fetch homepage once: avoids a double fetch, enables widget detection (#30),
      // and captures the final URL after any redirect (#22).
      const homeRes = await safeFetch(url, { headers: { "user-agent": "SonaBot/1.0" } });
      const homeHtml = homeRes.ok ? await homeRes.text() : "";
      // #22 Redirect host: record when the final URL's host differs from what was requested.
      const finalHost = homeRes.url ? new URL(homeRes.url).hostname.replace(/^www\./, "") : host;
      const redirectHost: string | undefined = finalHost !== host ? finalHost : undefined;
      // Ensure prospect record exists before any setStage call (needed for raw-URL jobs too).
      if (!bySlug[slug]) await upsertProspects([{ slug, business: verifiedName, url, stage: "found", updated: new Date().toISOString() } as any]);
      // #30 Chat-widget detection: if site already has a support widget, skip outreach.
      const chatbot = homeHtml ? detectChatWidget(homeHtml) : "";
      if (chatbot) {
        await setStage(slug, "skipped", { business: verifiedName, email: rec?.email || "", notes: `already has an assistant (${chatbot})`, chatbot, redirectHost, demoUrl: "", chunks: 0, updated: new Date().toISOString() } as any);
        built.push({ slug, host, skipped: true, chatbot });
        continue;
      }
      const n = await ingestUrl(slug, url, homeHtml || undefined);
      void ingestSite(slug, url, 6).catch(() => {});
      const demoUrl = `${cfg.baseUrl}/demo/${slug}`;
      // Lock in the verified name, grab the scraped contact email, and check the live site still
      // matches this business (catches lapsed/repurposed domains — e.g. a salon URL now serving a
      // casino — so the operator doesn't send a broken demo).
      const fin = await finalizeDemo(slug, verifiedName);
      // Email is the whole point of outreach: prefer the finder's, else the homepage scrape, else
      // sweep the contact/about pages synchronously (the crawl is fire-and-forget so won't have it yet).
      // Always sweep contact pages for an email; don't rely on fin.email alone (homepage-only).
      const swept = await findContactEmail(url).catch(() => "");
      const email = rec?.email || swept || fin.email || "";
      const warn = siteMismatch(verifiedName, rec?.industry, fin.pageName, fin.sample);
      if (warn) {
        // Dead/repurposed domain (e.g. a lapsed salon URL now serving a casino): DELETE the demo
        // so no wrong-business content is ever live or sent, and park the prospect as skipped.
        await purgeTenant(slug);
        await setStage(slug, "skipped", { business: verifiedName, email, notes: warn, redirectHost, demoUrl: "", chunks: 0, updated: new Date().toISOString() } as any);
        built.push({ slug, host, skipped: true, warn });
      } else {
        await setStage(slug, "ready", { demoUrl, chunks: n, business: verifiedName, email, notes: "", redirectHost, updated: new Date().toISOString() } as any);
        built.push({ slug, host, demoUrl, chunks: n, ...(redirectHost ? { redirectHost } : {}) });
      }
    } catch { /* skip failures, keep going */ }
  }
  return c.json({ built });
});

// LIST: the whole pipeline, decorated with demo URL + copy + QA flags.
app.get("/api/outreach/list", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  return c.json((await listProspects()).map(decorate));
});

// FUNNEL: per-stage counts for the dashboard summary bar.
app.get("/api/outreach/funnel", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  return c.json(await funnel());
});

// STAGE: manual progress toggle (the founder marks sent/opened/replied/signed/skipped).
app.post("/api/outreach/stage", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { slug, stage, notes, email } = await c.req.json().catch(() => ({}));
  // stage is optional — if omitted only notes/email fields are patched (e.g. email input save).
  if (stage != null && !STAGES.includes(stage)) return c.json({ error: "invalid stage" }, 400);
  const patch: any = { updated: new Date().toISOString() };
  if (typeof notes === "string") patch.notes = notes.slice(0, 500);
  // #6 Editable email: founder can manually correct a missing/wrong contact address.
  if (typeof email === "string") {
    if (email && !EMAIL_RE.test(email)) return c.json({ error: "invalid email" }, 400);
    patch.email = email;
  }
  const rec = stage != null ? await setStage(slug, stage, patch) : await patchProspect(slug, patch);
  if (!rec) return c.json({ error: "unknown prospect" }, 404);
  return c.json(decorate(rec));
});

// CLEAR: wipe the entire prospect pipeline (founder-only, irreversible).
app.post("/api/outreach/clear", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  await clearAll();
  return c.json({ ok: true });
});

// DELETE: remove a single prospect by slug.
app.post("/api/outreach/delete", async (c) => {
  const { user, ok } = await requireAdmin(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { slug } = await c.req.json().catch(() => ({}));
  if (!slug) return c.json({ error: "slug required" }, 400);
  await remove(slug);
  return c.json({ ok: true });
});

// Conversation transcript drill-down (guarded; tenant-scoped in the query).
app.get("/api/t/:tenant/convos/:id/messages", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  return c.json(await conversationMessages(tenant, c.req.param("id")));
});

// Mark a content-gap question resolved.
app.post("/api/t/:tenant/gaps/resolve", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { question } = await c.req.json().catch(() => ({}));
  if (!question) return c.json({ error: "question required" }, 400);
  return c.json(await resolveGap(tenant, question));
});

// #12 Feedback detail list: question+answer pairs with thumbs ratings, newest first.
app.get("/api/t/:tenant/feedback", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  return c.json(await feedbackList(tenant));
});

// Public widget feedback (👍/👎 on an assistant reply). Rate-limited; validated.
app.post("/api/feedback", async (c) => {
  const { tenant, messageId, rating } = await c.req.json().catch(() => ({}));
  if (!tenant || !messageId || (rating !== 1 && rating !== -1))
    return c.json({ error: "tenant, messageId, rating (1|-1) required" }, 400);
  const ip = clientIp(c);
  if (!rateLimit(`fb:${tenant}:${ip}`, 30)) return c.json({ error: "too many requests" }, 429);
  await recordFeedback(tenant, String(messageId), rating);
  return c.json({ ok: true });
});

// Save owner-editable settings (whitelisted + validated in lib).
app.patch("/api/t/:tenant/settings", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const patch = await c.req.json();
  return c.json(await updateTenantSettings(tenant, patch));
});

// GDPR / DSAR (guarded): the tenant admin exports or erases one visitor's data by email.
app.post("/api/t/:tenant/gdpr/export", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "email required" }, 400);
  return c.json(await exportSubject(tenant, email));
});

app.post("/api/t/:tenant/gdpr/delete", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "email required" }, 400);
  return c.json(await deleteSubject(tenant, email));
});

// Ingest from the dashboard (guarded: only the tenant's owner can add sources).
app.post("/api/t/:tenant/ingest", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { url } = await c.req.json();
  if (!url) return c.json({ error: "url required" }, 400);
  try {
    const n = await ingestUrl(tenant, url);
    return c.json({ ok: true, chunks: n });
  } catch (e: any) { return ingestError(c, e); }
});

// Crawl a whole site (guarded): BFS same-domain pages up to maxPages, so an owner can train
// the assistant on their full site in one click instead of pasting URLs one at a time.
app.post("/api/t/:tenant/crawl", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { url, maxPages } = await c.req.json();
  if (!url || !/^https?:\/\//i.test(url)) return c.json({ error: "valid http(s) url required" }, 400);
  const pages = Math.min(Math.max(Number(maxPages) || 15, 1), 30); // bound crawl cost
  try {
    const n = await ingestSite(tenant, url, pages);
    return c.json({ ok: true, chunks: n });
  } catch (e: any) { return ingestError(c, e); }
});

app.get("/dashboard", (c) => {
  c.header("content-type", "text/html");
  // Lock down the blast radius of any XSS. The real win is connect-src: an injected
  // script can't exfiltrate the Supabase session token to an off-origin host.
  c.header(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; " +
      "connect-src 'self' https://*.supabase.co; base-uri 'none'; frame-ancestors 'none'"
  );
  c.header("x-frame-options", "DENY");
  c.header("x-content-type-options", "nosniff");
  return c.body(dashboardHtml(cfg.baseUrl));
});

app.get("/widget.js", async (c) => {
  const tenant = c.req.query("tenant") ?? "demo";
  // The widget loads on customers' sites — it must never hard-fail. Degrade to
  // defaults if the tenant lookup errors (DB down, missing env, unknown tenant).
  let t: any = null;
  try { t = await getTenant(tenant); } catch { t = null; }
  // Tenant-controlled values are concatenated into widget innerHTML — validate to block self-XSS.
  const safeColor = /^#[0-9a-f]{3,8}$/i.test(t?.brand_color ?? "") ? t.brand_color : "#11212b";
  const safeLogo = /^https:\/\/[^"'<>]+$/i.test(t?.logo_url ?? "") ? t.logo_url : "";
  // Booking is a Pro perk: a Starter tenant with a saved cal link still shouldn't get the in-chat
  // calendar. Trials/demos pass (unlocksProFeatures) so the pitch stays whole.
  const proUnlocked = unlocksProFeatures(t);
  const rawBook = t?.booking_enabled && proUnlocked ? cleanUrl(t?.booking_config?.calLink) : "";
  const safeBook = rawBook && validCalLink(rawBook) ? rawBook : "";
  const safeHero = /^https:\/\/[^"'<>]+$/i.test(t?.facts?.__hero ?? "") ? t.facts.__hero : "";
  // Surface extracted facts in the chrome so the demo VISIBLY proves it already knows THIS
  // business (live hours badge + contact strip), not just inside chat answers. Strip angle
  // brackets defensively; everything is rendered via textContent client-side, so this is belt+braces.
  const f = t?.facts ?? {};
  const clean = (s: any, max: number) => (typeof s === "string" ? s.replace(/[<>]/g, "").trim().slice(0, max) : "");
  // Junk-fact guard (belt+braces over extraction): never surface placeholders like a phone of
  // "00000080" or an address that's just a region ("England"). Rule: show a real value or nothing.
  const cleanPhone = (s: any) => {
    const v = clean(s, 40);
    const d = v.replace(/\D/g, "");
    if (d.length < 9 || d.length > 13) return "";          // too short/long to be a real number
    if (/^0{5,}/.test(d) || /^(\d)\1+$/.test(d)) return ""; // 0000008…, or all-same-digit = junk
    return v;
  };
  const cleanAddress = (s: any) => {
    const v = clean(s, 160);
    if (!v) return "";
    // A bare region word is a placeholder; a real address carries a number/postcode or a comma.
    if (/^(england|scotland|wales|northern ireland|united kingdom|uk|gb|great britain)$/i.test(v.trim())) return "";
    if (!/\d/.test(v) && !v.includes(",")) return "";
    return v;
  };
  const facts = {
    hours: clean(f.opening_hours, 300),
    phone: cleanPhone(f.phone),
    address: cleanAddress(f.address),
    price: clean(f.price_range, 40),
  };
  // embed=1 renders the chat as a full-panel surface (for the /demo preview) instead of a
  // floating corner bubble.
  const embed = c.req.query("embed") === "1";
  // Industry only matters for the demo backdrop — only pay the lookup there, never on a
  // customer's live site (keeps widget.js fast for paying tenants).
  // Industry powers the ambient backdrop (demo + the in-widget booking overlay). Derive it cheaply
  // from the name/slug/facts we already loaded so the FLOATING widget pays no extra DB cost; the
  // demo additionally samples real content for a sharper guess.
  const guess = `${t?.name ?? tenant} ${tenant.replace(/-/g, " ")} ${facts.address} ${facts.price}`;
  let industry: Industry;
  if (embed) {
    try { industry = detectIndustry(`${t?.name ?? tenant} ${(await sampleChunks(tenant, 8)).join(" ")} ${guess}`); }
    catch { industry = detectIndustry(guess); }
  } else {
    industry = detectIndustry(guess);
  }
  const theme = {
    name: t?.name ?? tenant,
    color: safeColor,
    logo: safeLogo,
    greeting: t?.persona === "formal"
      ? `Hello — I'm ${t?.name ?? tenant}'s assistant. I've read the whole website, so please ask anything below.`
      : `Hi! I'm ${t?.name ?? tenant}'s assistant — I've just read the whole website, so ask me anything below.`,
    book: safeBook,
    bookOn: !!t?.booking_enabled && proUnlocked,
    brand: !proUnlocked, // show "Powered by Sona" only on Starter/unpaid; hidden for Pro+/trial/demo
    hero: safeHero,
    industry,
    facts,
  };
  c.header("content-type", "application/javascript");
  // No caching while we iterate — a stale widget.js was rendering blank/old demos. (Re-add a
  // versioned cache for production once the embed is stable.)
  c.header("cache-control", "no-store, must-revalidate");
  return c.body(widgetJs(tenant, cfg.baseUrl, theme, embed));
});

// Starter questions tailored to THIS business (AI reads their ingested content), so a salon
// gets salon questions and a trading firm gets trading questions — not generic "opening hours".
const suggestCache = new Map<string, string[]>();
const suggestInflight = new Map<string, Promise<string[]>>(); // collapse concurrent first-hits into one compute
const DEFAULT_QS = ["What do you offer?", "Where are you based?", "How do I get started?"];
app.get("/api/suggest/:tenant", async (c) => {
  const t = c.req.param("tenant");
  if (!/^[a-z0-9-]{2,40}$/.test(t)) return c.json({ questions: DEFAULT_QS });
  if (suggestCache.has(t)) return c.json({ questions: suggestCache.get(t) });
  // Public path that spends real money (1 chat + up to 3 retrieval embeds per cache miss).
  // Rate-limit per IP so it can't be looped to drain the LLM budget, and de-dup in-flight
  // requests so a shared demo link landing 50 visitors at once warms the cache with ONE compute.
  if (!rateLimit(`suggest:${clientIp(c)}`, 10)) return c.json({ questions: DEFAULT_QS });
  let inflight = suggestInflight.get(t);
  if (!inflight) {
    inflight = computeSuggest(t);
    suggestInflight.set(t, inflight);
    inflight.finally(() => suggestInflight.delete(t));
  }
  return c.json({ questions: await inflight });
});
async function computeSuggest(t: string): Promise<string[]> {
  try {
    const chunks = await sampleChunks(t, 6); // raw content, not similarity-filtered
    if (!chunks.length) return DEFAULT_QS;
    // Over-generate candidates, then keep ONLY questions the corpus can actually answer.
    // Without this, a JS-heavy site (FTMO) yields plausible-but-ungroundable chips and the
    // demo escalates on every preset question — the exact bug a prospect would see first.
    const out = await chat(
      "You write 8 questions a real customer would type into THIS specific business's website chat. Each under 9 words, natural, specific to this business, and answerable from the page text. Output exactly 8 lines — no numbers, no quotes, no preamble.",
      chunks.join("\n").slice(0, 3500)
    );
    const cands = out.split("\n").map((s) => s.replace(/^[\s\-\d.)*]+/, "").replace(/^["']|["']$/g, "").trim()).filter((s) => s.length > 3 && s.length < 72);
    // Validate candidates against the corpus: a grounded question won't escalate when clicked.
    const grounded: string[] = [];
    for (const q of cands) {
      if (grounded.length === 3) break;
      try { if ((await retrieve(t, q)).length > 0) grounded.push(q); } catch {}
    }
    // Prefer grounded; if short, pad with the OTHER tailored candidates (still on-topic for this
    // business) before ever falling back to generic geography questions that would escalate.
    const tailoredRest = cands.filter((q) => !grounded.includes(q));
    const final = [...grounded, ...tailoredRest, ...DEFAULT_QS].slice(0, 3);
    if (final.length === 3) suggestCache.set(t, final); // don't cache a thin/empty result
    return final;
  } catch { return DEFAULT_QS; }
}

app.get("/demo/:tenant", async (c) => {
  const t = c.req.param("tenant");
  // Reflected into HTML — constrain to the slug charset to kill XSS (Hono c.html does not escape).
  if (!/^[a-z0-9-]{2,40}$/.test(t)) return c.text("invalid tenant", 400);
  // A purged/never-built demo (e.g. a dead/repurposed prospect domain we deleted) must NOT render
  // an empty shell showing the raw slug as the business name — serve a clean "not available" page.
  if (!(await getTenant(t))) {
    c.header("content-type", "text/html");
    return c.html(
      `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width, initial-scale=1"><title>Demo not available — Sona</title>` +
        `<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;` +
        `font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f1e9;color:#11212b}` +
        `.c{max-width:420px;text-align:center;padding:32px}.c h1{font-size:20px;margin:0 0 8px}` +
        `.c p{color:#6b7280;line-height:1.5;margin:0 0 18px}` +
        `.c a{display:inline-block;background:linear-gradient(180deg,#c79a4b,#a87f33);color:#231706;` +
        `text-decoration:none;font-weight:600;padding:10px 18px;border-radius:9px}</style></head><body>` +
        `<div class="c"><h1>This demo isn’t available</h1>` +
        `<p>It may have expired, or the website it was built from has changed. You can build a fresh one in seconds.</p>` +
        `<a href="/">Create a demo →</a></div></body></html>`,
      404
    );
  }
  const q = encodeURIComponent(t);
  // The label shown to the prospect: strip the internal "demo-" prefix for a clean name.
  const label = t.replace(/^demo-/, "");
  c.header("x-content-type-options", "nosniff");
  // frame-ancestors 'self' so the landing page (same origin) can iframe this demo, but
  // nobody else can clickjack it; loads same-origin widget.js + Google Fonts only.
  c.header(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
      "img-src 'self' https: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'self'"
  );
  // The preview a prospect sees the instant their bot loads (and what the landing embeds in
  // its iframe). The CHAT is the hero here — a full-height embedded panel, not a marketing
  // stage with a tiny corner bubble — with a slim brand bar + a persistent "get this" CTA.
  return c.html(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${label} — live Sona demo</title>` +
      `<link rel="preconnect" href="https://fonts.googleapis.com">` +
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
      // Non-blocking font load (media=print then swap) so a slow Google Fonts never stalls the page.
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">` +
      `<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"></noscript>` +
      // Direct link = framed ~62% window. Inside the landing modal's iframe the modal IS the window,
      // so fill it instead of nesting a second card. Set before paint to avoid a flash of the frame.
      `<script>try{if(window.self!==window.top)document.documentElement.className='embedded'}catch(e){document.documentElement.className='embedded'}</script>` +
      `<style>` +
      `*{box-sizing:border-box}` +
      `html,body{margin:0;height:100%}` +
      // Soft, barely-there aurora behind the framed demo so the window reads as a product, not a raw page.
      `body{height:100dvh;overflow:hidden;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#11212b;` +
      `background:#efe7da;` +
      `background-image:radial-gradient(58% 58% at 16% 12%,rgba(199,154,75,.10),transparent 60%),` +
      `radial-gradient(54% 54% at 86% 16%,rgba(58,90,80,.10),transparent 60%),` +
      `radial-gradient(70% 70% at 50% 110%,rgba(199,154,75,.07),transparent 64%);` +
      `display:flex;align-items:center;justify-content:center;padding:clamp(16px,3.4vh,40px)}` +
      `@media (prefers-reduced-motion:reduce){*{animation:none!important}}` +
      // The window: ~62% of a desktop screen (half–2/3), fixed proportion, one cohesive card.
      `.frame{display:flex;flex-direction:column;width:min(100%,1000px);height:min(82vh,820px);` +
      `background:#f6f1e9;border:1px solid #e4dccb;border-radius:16px;overflow:hidden;` +
      `box-shadow:0 30px 80px -30px rgba(17,33,43,.45),0 8px 24px -16px rgba(17,33,43,.3)}` +
      `.bar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;` +
      `padding:11px 16px;background:#fff;border-bottom:1px solid #e4dccb}` +
      `.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px}` +
      `.brand .b{color:#c79a4b;font-size:17px}` +
      `.brand .tag{font-weight:500;color:#6b7280;font-size:12.5px}` +
      `.dot{width:7px;height:7px;border-radius:50%;background:#3a5a50;display:inline-block;margin-right:5px;` +
      `box-shadow:0 0 0 0 rgba(58,90,80,.5);animation:pulse 2.4s ease-out infinite}` +
      `@keyframes pulse{70%{box-shadow:0 0 0 7px rgba(58,90,80,0)}100%{box-shadow:0 0 0 0 rgba(58,90,80,0)}}` +
      `.cta{display:inline-flex;align-items:center;gap:6px;background:#11212b;color:#f6f1e9;` +
      `text-decoration:none;font-weight:600;font-size:13.5px;padding:9px 15px;border-radius:9px;white-space:nowrap;border:1px solid #11212b}` +
      `.cta:hover{background:#1c2f3b}` +
      `.cta:focus-visible{outline:3px solid #c79a4b;outline-offset:2px}` +
      `#sona-mount{flex:1 1 auto;min-height:0;position:relative;isolation:isolate;contain:layout paint;overflow:hidden}` +
      // Embedded in the landing iframe or on a phone: drop the framing and fill, so it never double-shrinks.
      `@media (max-width:900px),(max-height:620px){body{padding:0}` +
      `.frame{width:100%;height:100dvh;border:0;border-radius:0;box-shadow:none}}` +
      `html.embedded body{padding:0}` +
      `html.embedded .frame{width:100%;height:100dvh;border:0;border-radius:0;box-shadow:none}` +
      `</style></head>` +
      `<body>` +
      `<div class="frame">` +
      `<div class="bar"><div class="brand"><span class="b">&#128276;</span> Sona <span class="tag">· demo for ${label}</span></div>` +
      `<div style="display:flex;align-items:center;gap:12px"><span class="tag" style="font-size:12.5px;color:#6b7280"><span class="dot"></span>On duty</span>` +
      `<a class="cta" href="/dashboard?from=${q}">Get this on my site &rarr;</a></div></div>` +
      `<div id="sona-mount"></div>` +
      `</div>` +
      `<script src="/widget.js?tenant=${q}&embed=1"></script></body></html>`
  );
});

// Map a business to one of a fixed set of industries from its name + page text, so the demo
// backdrop can be themed to THEIR world (a trading firm gets a rising market chart, a salon
// gets shears + sparkle). Keyword-scored; falls back to a neutral "ai" motif.
type Industry = "finance" | "beauty" | "health" | "fitness" | "food" | "trades" | "legal" | "auto" | "property" | "ai";
function detectIndustry(text: string): Industry {
  const t = (text || "").toLowerCase();
  const groups: [Industry, string[]][] = [
    ["finance", ["trading", "trader", "forex", "invest", "fund", "prop firm", "prop trading", "capital", "broker", "crypto", "stocks", "portfolio", "payout"]],
    ["beauty", ["salon", "hair", "nails", "spa", "beauty", "barber", "lash", "brow", "makeup", "aesthetic", "waxing"]],
    ["health", ["clinic", "dental", "dentist", "doctor", "medical", "physio", "therapy", "wellness", "chiro", "patient", "treatment", "health"]],
    ["fitness", ["gym", "fitness", "personal training", "yoga", "pilates", "crossfit", "workout", "coach"]],
    ["food", ["restaurant", "cafe", "coffee", "bar ", "kitchen", "menu", "dining", "bakery", "takeaway", "catering", "pizza"]],
    ["trades", ["plumb", "electric", "builder", "roofing", "construction", "joiner", "carpenter", "contractor", "hvac", "heating", "landscap"]],
    ["legal", ["law", "solicitor", "legal", "attorney", "conveyancing", "barrister", "litigation"]],
    ["auto", ["garage", "mechanic", " car ", "vehicle", " mot", "tyre", "automotive", "bodyshop", "servicing"]],
    ["property", ["estate agent", "property", "lettings", "realtor", "mortgage", "rentals", "homes for sale"]],
  ];
  let best: Industry = "ai", bestN = 0;
  for (const [ind, kws] of groups) {
    const n = kws.reduce((a, k) => a + (t.includes(k) ? 1 : 0), 0);
    if (n > bestN) { bestN = n; best = ind; }
  }
  return best;
}

// A refined, abstract line-motif per industry. Deliberately NOT literal clip-art (shears,
// wheels, scales read as tacky) — just elegant thin line-work tinted to the brand, shown very
// faint. Finance keeps a clean rising market line; health a clean pulse line; everything else
// uses soft flowing contour lines. Strokes use currentColor; the slow draw is the only motion.
function motifFor(ind: Industry): string {
  const s = (inner: string, vb = "0 0 480 320") => `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor">${inner}</svg>`;
  // Stacked smooth contour waves — premium, ambient, unmistakably tasteful at low opacity.
  const waves = (amp = 30, gap = 34, n = 9) =>
    s(Array.from({ length: n }, (_, i) => {
      const y = 20 + i * gap, a = i % 2 ? amp : -amp;
      return `<path class="m-dash" style="animation-delay:${(i * 0.7).toFixed(1)}s" d="M-10 ${y} Q120 ${y + a} 240 ${y} T490 ${y}" stroke-width="1.6" stroke-linecap="round"/>`;
    }).join(""));
  switch (ind) {
    case "finance": // clean rising market line (the look Daniel liked) — no heavy candle blocks
      return s(
        `<polyline class="m-dash" points="-10,255 70,215 150,230 230,150 310,172 390,92 490,38" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<polyline points="-10,300 70,272 150,285 230,222 310,240 390,176 490,128" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".5"/>`
      );
    case "health": // single clean ECG pulse line
      return s(`<polyline class="m-dash" points="-10,180 150,180 175,180 195,96 222,250 250,180 330,180 355,140 380,180 490,180" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`);
    default:
      return waves();
  }
}

function widgetJs(tenant: string, base: string, theme: { name: string; color: string; logo: string; greeting: string; book: string; bookOn?: boolean; brand?: boolean; hero?: string; industry?: Industry; facts?: { hours: string; phone: string; address: string; price: string } }, embed = false): string {
  // Premium "concierge" chat widget. Loads on customers' sites, so: styles are scoped to a
  // .sona- prefix (no host-page clashes), all message text is set via textContent (XSS-safe),
  // and the only interpolated values (C/L/K/N/G) are server-validated in /widget.js.
  // embed mode (the /demo preview): renders as a full panel inside #sona-mount, opens on load,
  // shows suggested-question chips — instead of a floating corner bubble.
  return `(()=>{var T=${JSON.stringify(tenant)},B=${JSON.stringify(base)},C=${JSON.stringify(theme.color)},N=${JSON.stringify(theme.name)},G=${JSON.stringify(theme.greeting)},L=${JSON.stringify(theme.logo)},K=${JSON.stringify(theme.book)},H=${JSON.stringify(theme.hero || "")},MOTIF=${JSON.stringify(motifFor(theme.industry ?? "ai"))},IND=${JSON.stringify(theme.industry ?? "ai")},FACTS=${JSON.stringify(theme.facts ?? { hours: "", phone: "", address: "", price: "" })},BOOKON=${theme.bookOn ? "true" : "false"},BRAND=${theme.brand === false ? "false" : "true"},EMBED=${embed ? "true" : "false"};
if(document.getElementById('sona-root'))return;
// Load the brand fonts WITHOUT blocking render: preconnect + a stylesheet <link> in the host head.
// The widget paints immediately on system fonts and swaps to Fraunces/Inter when this resolves.
(function(){try{var h=document.head||document.documentElement;
['https://fonts.googleapis.com','https://fonts.gstatic.com'].forEach(function(u,i){var p=document.createElement('link');p.rel='preconnect';p.href=u;if(i)p.crossOrigin='anonymous';h.appendChild(p)});
var fl=document.createElement('link');fl.rel='stylesheet';fl.href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap';h.appendChild(fl)}catch(e){}})();
var SID=(function(){try{var s=localStorage.getItem('sona-sid:'+T);if(!s){s=(Date.now().toString(36)+Math.random().toString(36).slice(2));localStorage.setItem('sona-sid:'+T,s)}return s}catch(e){return 'anon-'+Date.now()}})();
function lum(h){h=String(h||'').replace('#','');if(h.length===3||h.length===4)h=h.split('').map(function(x){return x+x}).join('');var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (0.299*r+0.587*g+0.114*b)/255}
var ON=lum(C)>0.6?'#1a1a1a':'#ffffff';
// --- "knows your business" proof: live opening-hours badge + contact pills + answer sources ---
// Parse the extracted opening_hours string (e.g. "Monday 09:00-17:00; Tuesday 09:00-17:00", or a
// freeform "Mon-Fri 9:00-17:00") into per-weekday ranges, then say whether they're open RIGHT NOW.
// If nothing parses, callers fall back to the neutral "Online now" — never show a wrong status.
var DAYS=['sun','mon','tue','wed','thu','fri','sat'],TWO={su:0,mo:1,tu:2,we:3,th:4,fr:5,sa:6};
function dayIdx(t){t=String(t||'').toLowerCase();var i=DAYS.indexOf(t.slice(0,3));if(i>=0)return i;var j=TWO[t.slice(0,2)];return j==null?-1:j}
function daysFromSpec(spec){spec=spec.toLowerCase();if(/weekday/.test(spec))return [1,2,3,4,5];if(/weekend/.test(spec))return [0,6];if(/dail|every\\s*day|all\\s*week|7\\s*days|mon\\W*sun/.test(spec))return [0,1,2,3,4,5,6];var rg=spec.match(/([a-z]{2,})\\s*(?:-|–|to)\\s*([a-z]{2,})/);if(rg){var a=dayIdx(rg[1]),b=dayIdx(rg[2]),o=[];if(a>=0&&b>=0){var i=a;for(var n=0;n<7;n++){o.push(i);if(i===b)break;i=(i+1)%7}return o}}var out=[];(spec.match(/[a-z]{2,}/g)||[]).forEach(function(w){var i=dayIdx(w);if(i>=0&&out.indexOf(i)<0)out.push(i)});return out}
function toMin(s){var m=/(\\d{1,2}):(\\d{2})/.exec(s);return m?(+m[1])*60+(+m[2]):null}
function parseHours(str){if(!str)return null;var R=[[],[],[],[],[],[],[]],ok=false;String(str).split(/[;,\\n]/).forEach(function(seg){seg=seg.trim();if(!seg||/closed/i.test(seg))return;var ts=seg.match(/\\d{1,2}:\\d{2}/g);if(!ts||ts.length<2)return;var o=toMin(ts[0]),cl=toMin(ts[1]);if(o==null||cl==null||cl<=o)return;var head=seg.slice(0,seg.search(/\\d{1,2}:\\d{2}/));daysFromSpec(head).forEach(function(i){R[i].push([o,cl]);ok=true})});return ok?R:null}
function fmtMin(m){var h=Math.floor(m/60),mm=m%60,ap=h>=12?'pm':'am',h12=h%12||12;return h12+(mm?':'+(mm<10?'0'+mm:mm):'')+ap}
function hoursStatus(){var R=parseHours(FACTS.hours);if(!R)return null;var d=new Date(),day=d.getDay(),now=d.getHours()*60+d.getMinutes(),td=R[day],open=false,lbl='';if(td&&td.length){lbl=td.map(function(x){return fmtMin(x[0])+'–'+fmtMin(x[1])}).join(', ');open=td.some(function(x){return now>=x[0]&&now<x[1]})}return {open:open,label:lbl}}
function shortLoc(addr){var p=String(addr||'').split(',').map(function(s){return s.trim()}).filter(Boolean);var REGION=/^(england|scotland|wales|northern ireland|n\\.? ?ireland|united kingdom|uk|gb|great britain)$/i;for(var i=p.length-1;i>=0;i--){var seg=p[i];if(/^[A-Za-z]{1,2}\\d/.test(seg))continue;if(REGION.test(seg))continue;if(seg.length>1&&!/^\\d+$/.test(seg))return seg}return p[0]||''}
function mkPill(opts){var e=document.createElement('span');e.className='sona-pill'+(opts.closed?' closed':'');if(opts.dot){var d=document.createElement('span');d.className='pdot';e.appendChild(d)}if(opts.icon){var ic=document.createElement('span');ic.textContent=opts.icon;e.appendChild(ic)}var tx=document.createElement('span');tx.textContent=opts.text;e.appendChild(tx);if(opts.mut){var mu=document.createElement('span');mu.className='pmut';mu.textContent=opts.mut;e.appendChild(mu)}return e}
function buildKB(){var pills=[],hs=hoursStatus();if(hs)pills.push(mkPill({dot:true,closed:!hs.open,text:hs.open?'Open now':'Closed',mut:hs.label?(' · today '+hs.label):''}));if(FACTS.address){var loc=shortLoc(FACTS.address);if(loc)pills.push(mkPill({icon:'\u{1F4CD}',text:loc}))}if(FACTS.phone)pills.push(mkPill({icon:'\u{1F4DE}',text:FACTS.phone}));if(!pills.length)return null;var cap=document.createElement('div');cap.className='sona-kbcap';cap.textContent='Here’s what I already know';var el=document.createElement('div');el.className='sona-kb';pills.forEach(function(p){el.appendChild(p)});return {cap:cap,el:el}}
function srcLine(after,srcs){var w=document.createElement('div');w.className='sona-src';var lbl=document.createElement('span');lbl.textContent='Source: ';w.appendChild(lbl);var added=0,seen={};srcs.forEach(function(u){if(added>=2)return;try{var p=new URL(u);if(p.protocol!=='https:'&&p.protocol!=='http:')return;var host=p.hostname.replace(/^www\\./,'');var path=p.pathname||'';if(path==='/')path='';else if(path.charAt(path.length-1)==='/')path=path.slice(0,-1);var disp=host+path;if(disp.length>44)disp=disp.slice(0,42)+'…';if(seen[disp])return;seen[disp]=1;var a=document.createElement('a');a.href=p.href;a.target='_blank';a.rel='noopener';a.textContent=disp;if(added)w.appendChild(document.createTextNode(', '));w.appendChild(a);added++}catch(e){}});if(added)after.appendChild(w)}
// brand-tinted ambiance: the ambient glow uses THEIR colour, so the demo feels like their world.
function hexrgb(h){h=String(h||'').replace('#','');if(h.length===3||h.length===4)h=h.split('').map(function(x){return x+x}).join('');return [parseInt(h.slice(0,2),16)||17,parseInt(h.slice(2,4),16)||33,parseInt(h.slice(4,6),16)||43]}
// Per-industry palette [deep base, vivid secondary accent]. Used when the site's own brand
// colour is unusable for a backdrop — missing, near-white (→grey) or near-black (→dull), which
// is exactly what happens when a prospect's site blocks the crawler (403/Cloudflare). Guarantees
// every demo gets a rich, on-theme backdrop instead of a flat black/grey void.
// Muted, deep, low-saturation pairs [base, soft accent] — calm and premium, never neon/garish.
var PAL={finance:['#0f1f2e','#3f6189'],beauty:['#241620','#8a6175'],health:['#0f2426','#3d8079'],fitness:['#221708','#a9763f'],food:['#211910','#9c7a45'],trades:['#0f2030','#3f6189'],legal:['#13241a','#3f7d5f'],auto:['#211318','#9c5258'],property:['#19222f','#6b7890'],ai:['#111f29','#566089']};
var DEF=PAL[IND]||PAL.ai;
var luC=lum(C);
// Use THEIR colour when it's a usable mid-tone; otherwise the industry default base.
var BG=(luC>0.8||luC<0.07)?DEF[0]:C;
var BR=hexrgb(BG),ACC='rgba('+BR[0]+','+BR[1]+','+BR[2]+',';
var D='rgb('+Math.round(BR[0]*.42)+','+Math.round(BR[1]*.42)+','+Math.round(BR[2]*.42)+')'; // deep shade for the bg
// Vivid secondary accent (industry-themed) for the colour wash + glow orbs.
var SR=hexrgb(DEF[1]),SEC='rgba('+SR[0]+','+SR[1]+','+SR[2]+',';
var RM=false;try{RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
// NOTE: fonts are loaded via a non-blocking <link> injected at startup (see top of the IIFE).
// A CSS @import here would be render-blocking — it stalled the whole widget for seconds on slow
// font connections. With the @import gone the widget paints instantly using the system-font
// fallbacks below, then upgrades to Fraunces/Inter when the link finishes.
var css='#sona-root{position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}'
+'#sona-root *{box-sizing:border-box}'
+'.sona-launch{display:flex;align-items:center;gap:10px;border:0;cursor:pointer;border-radius:999px;padding:16px 24px 16px 20px;background:'+C+';color:'+ON+';font-size:16.5px;font-weight:700;letter-spacing:.01em;box-shadow:0 0 0 4px rgba(255,255,255,.92),0 14px 34px -6px rgba(0,0,0,.5);transition:transform .18s ease,box-shadow .18s ease}'
+'.sona-launch:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 0 0 4px rgba(255,255,255,.96),0 20px 44px -8px rgba(0,0,0,.58)}'
+'.sona-launch:focus-visible{outline:3px solid '+C+';outline-offset:5px}'
+'.sona-launch svg{width:24px;height:24px}'
+(RM?'':'@keyframes sona-attn{0%,100%{box-shadow:0 0 0 4px rgba(255,255,255,.92),0 14px 34px -6px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 4px rgba(255,255,255,.92),0 14px 34px -6px rgba(0,0,0,.5),0 0 0 10px '+SEC+'.22)}}.sona-launch{animation:sona-attn 3.4s ease-in-out infinite}.sona-launch:hover{animation:none}')
+'.sona-panel{position:absolute;bottom:0;right:0;width:min(380px,92vw);height:min(560px,76vh);background:#fff;border-radius:20px;box-shadow:0 24px 70px -20px rgba(17,33,43,.5);overflow:hidden;display:none;flex-direction:column;opacity:0;transform:translateY(16px) scale(.98);transition:opacity .2s ease,transform .24s cubic-bezier(.2,.7,.3,1)}'
+'.sona-panel.open{display:flex}.sona-panel.in{opacity:1;transform:none}'
+'.sona-head{display:flex;align-items:center;gap:11px;padding:15px 16px;background:'+C+';color:'+ON+'}'
+'.sona-ava{height:34px;width:auto;min-width:34px;max-width:132px;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto;padding:0 6px}'
+'.sona-ava img{max-height:26px;max-width:118px;width:auto;height:auto;object-fit:contain;display:block;margin:auto}.sona-ava svg{width:18px;height:18px;color:'+C+'}'
+'.sona-ttl{font-weight:700;font-size:15px;line-height:1.1}'
+'.sona-sub{font-size:11.5px;opacity:.85;display:flex;align-items:center;gap:5px;margin-top:2px}'
+'.sona-on{width:7px;height:7px;border-radius:50%;background:#54e08a;box-shadow:0 0 0 0 rgba(84,224,138,.6)'+(RM?'':';animation:sona-pulse 2.2s infinite')+'}'
+'@keyframes sona-pulse{70%{box-shadow:0 0 0 7px rgba(84,224,138,0)}100%{box-shadow:0 0 0 0 rgba(84,224,138,0)}}'
+'.sona-book{margin-left:auto;display:inline-flex;align-items:center;gap:6px;background:#fff;color:#16222b;font-size:12.5px;font-weight:700;border:0;border-radius:999px;padding:7px 13px 7px 11px;white-space:nowrap;cursor:pointer;box-shadow:0 5px 14px -6px rgba(0,0,0,.45);transition:transform .12s ease,box-shadow .12s ease}'
+'.sona-book:hover{transform:translateY(-1px);box-shadow:0 9px 20px -6px rgba(0,0,0,.5)}'
+'.sona-book svg{width:14px;height:14px;color:'+C+'}'
+'.sona-x{margin-left:auto;background:none;border:0;color:'+ON+';cursor:pointer;font-size:22px;opacity:.85;line-height:1;width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}.sona-x:hover{background:rgba(255,255,255,.14);opacity:1}'
+'.sona-msgs{flex:1;overflow:auto;padding:16px;background:#f7f5f1;display:flex;flex-direction:column;gap:10px}'
+'.sona-row{display:flex;gap:8px;max-width:88%}'
+'.sona-row.u{align-self:flex-end;flex-direction:row-reverse}'
+'.sona-bub{padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;min-width:0}'
+'.sona-row.a .sona-bub{background:#fff;color:#1a2530;border:1px solid #eadfce;border-bottom-left-radius:5px}'
+'.sona-row.u .sona-bub{background:'+C+';color:'+ON+';border-bottom-right-radius:5px}'
+'.sona-fb{display:flex;gap:4px;margin-top:5px;font-size:13px;color:#6b7480}'
+'.sona-fb button{border:0;background:none;cursor:pointer;font-size:15px;padding:6px 9px;min-width:34px;min-height:32px;border-radius:8px;line-height:1}'
+'.sona-fb button:hover{background:#eee}'
+'.sona-dots{display:inline-flex;gap:4px;padding:4px 2px}.sona-dots i{width:6px;height:6px;border-radius:50%;background:#b8bfc6'+(RM?'':';animation:sona-blink 1.2s ease-in-out infinite')+'}'
+'.sona-dots i:nth-child(2){animation-delay:.15s}.sona-dots i:nth-child(3){animation-delay:.3s}'
+'@keyframes sona-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}'
+'.sona-foot{border-top:1px solid #eee;background:#fff}'
+'.sona-in{display:flex;align-items:center;gap:8px;padding:10px}'
+'.sona-in input{flex:1;border:1px solid #e3ddd1;border-radius:999px;padding:11px 15px;font-size:16px;outline:0;background:#faf8f4}'
+'.sona-in input:focus{border-color:'+C+'}'
+'.sona-send{flex:0 0 auto;width:40px;height:40px;border-radius:50%;border:0;background:'+C+';color:'+ON+';cursor:pointer;display:flex;align-items:center;justify-content:center}'
+'.sona-send:disabled{opacity:.5;cursor:default}.sona-send svg{width:18px;height:18px}'
+'.sona-pb{text-align:center;font-size:11px;color:#9aa3ab;padding:0 0 9px}.sona-pb a{color:#9aa3ab;text-decoration:none;font-weight:600}'
+'.sona-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:2px}'
+'.sona-chip{border:1px solid #e3ddd1;background:#fff;border-radius:999px;padding:8px 13px;font-size:13.5px;cursor:pointer;color:#3f4a50;text-align:left;transition:border-color .15s ease,background .15s ease}'
+'.sona-chip:hover{border-color:'+C+';background:#fffaf2}'
// "knows your business" proof strip — live hours badge + contact pills (static, not buttons)
+'.sona-kbcap{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:#9aa3ab;margin:26px 0 0}'
+'.sona-kb{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:11px;margin-bottom:18px}'
+'.sona-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid #e4dccb;background:#fff;border-radius:999px;padding:7px 12px;font-size:13px;color:#3f4a50;font-weight:600;box-shadow:0 4px 12px -10px rgba(17,33,43,.4)}'
+'.sona-pill .pdot{width:7px;height:7px;border-radius:50%;background:#3aaf6a;flex:0 0 auto'+(RM?'':';box-shadow:0 0 0 0 rgba(58,175,106,.5);animation:sona-pulse 2.2s infinite')+'}'
+'.sona-pill.closed .pdot{background:#c2c8cd;animation:none;box-shadow:none}'
+'.sona-pill.closed{color:#8a939b}'
+'.sona-pill .pmut{color:#9aa3ab;font-weight:400}'
// answer source citation — subtle, under the bubble
+'.sona-src{margin-top:5px;font-size:11.5px;color:#9aa3ab;line-height:1.4}'
+'.sona-src a{color:#7a838b;text-decoration:none;border-bottom:1px dotted #c3cace}'
+'.sona-src a:hover{color:'+C+';border-bottom-color:'+C+'}'
// in-widget booking — dedicated premium overlay over the whole panel (Calendly/Intercom style)
+'.sona-bkview{position:absolute;inset:0;z-index:6;background:#f6f1e9;display:flex;flex-direction:column;overflow:hidden'+(RM?'':';animation:sona-bkv .26s cubic-bezier(.2,.7,.3,1)')+'}'
+'@keyframes sona-bkv{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
// ambient branded backdrop that fills the empty space — soft drifting orbs (brand-tinted) + a
// faint industry motif themed off their site. Barely-there per the subtle-animation rule.
+'.sona-bkview>.sona-bkvh,.sona-bkview>.sona-bkvb,.sona-bkview>.sona-bkvf{position:relative;z-index:1}'
// In the full-screen embed the booking view would stretch edge-to-edge (giant cells, dead space).
// Keep the top bar full width but centre the calendar/time/form column to a card-sized width.
+'.sona-embed .sona-bkvb,.sona-embed .sona-bkvf{max-width:560px;margin-left:auto;margin-right:auto;width:100%}'
+'.sona-embed .sona-bkvh{padding-left:max(16px,calc((100% - 560px)/2));padding-right:max(16px,calc((100% - 560px)/2))}'
// In the roomy embed the body would stretch full height with content stuck at the top, leaving a
// big empty lower half. Let it size to its content and sit vertically centred between bar + bottom.
+'.sona-embed .sona-bkvb{flex:0 1 auto;margin-top:auto;margin-bottom:auto}'
// Aurora: soft brand/accent colour blooms drifting gently — modern, premium, calm. No lines.
// Shared by the booking overlay AND the chat view so the widget feels consistent.
+'.sona-aura{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}'
+'.sona-aura .o{position:absolute;border-radius:50%;filter:blur(40px)}'
+'.sona-aura .o1{width:300px;height:300px;top:-70px;right:-80px;background:radial-gradient(circle,'+SEC+'.34),transparent 66%)'+(RM?'':';animation:sona-bko1 30s ease-in-out infinite')+'}'
+'.sona-aura .o2{width:330px;height:330px;bottom:-90px;left:-100px;background:radial-gradient(circle,'+SEC+'.26),transparent 66%)'+(RM?'':';animation:sona-bko2 38s ease-in-out infinite')+'}'
+'.sona-aura .o3{width:230px;height:230px;bottom:70px;right:-70px;background:radial-gradient(circle,'+ACC+'.20),transparent 70%)'+(RM?'':';animation:sona-bko3 46s ease-in-out infinite')+'}'
+'@keyframes sona-bko1{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,26px)}}'
+'@keyframes sona-bko2{0%,100%{transform:translate(0,0)}50%{transform:translate(28px,-22px)}}'
+'@keyframes sona-bko3{0%,100%{transform:translate(0,0)}50%{transform:translate(-22px,-18px)}}'
+'.sona-aura .wash{position:absolute;left:0;right:0;bottom:0;height:62%;background:linear-gradient(to top,'+SEC+'.12),transparent)}'
// chat view gets the same aurora behind the messages (floating widget only).
+'.sona-chatbg{background:#f7f5f1}'
+'.sona-aurachat>.sona-head,.sona-aurachat>.sona-msgs,.sona-aurachat>.sona-foot{position:relative;z-index:1}'
+'.sona-aurachat .sona-msgs{background:transparent}'
// hide the scrollbar chrome in the booking steps (they fit by design; a bar reads as "old/scrolly")
+'.sona-bkvb{scrollbar-width:none;-ms-overflow-style:none}.sona-bkvb::-webkit-scrollbar{width:0;height:0;display:none}'
+'.sona-bkdays{scrollbar-width:none;-ms-overflow-style:none}.sona-bkdays::-webkit-scrollbar{width:0;height:0;display:none}'
+'.sona-bkvh{display:flex;align-items:center;gap:11px;padding:15px 16px;background:'+C+';color:'+ON+';flex:0 0 auto;box-shadow:0 6px 20px -12px rgba(17,33,43,.6)}'
+'.sona-bkvh .bk{background:rgba(255,255,255,.14);border:0;color:'+ON+';cursor:pointer;font-size:17px;line-height:1;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;transition:background .15s}'
+'.sona-bkvh .bk:hover{background:rgba(255,255,255,.26)}'
+'.sona-bkvh .av{height:32px;width:auto;min-width:32px;max-width:96px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:0 6px;flex:0 0 auto}'
+'.sona-bkvh .av img{max-height:22px;max-width:84px;width:auto;object-fit:contain}.sona-bkvh .av svg{width:16px;height:16px;color:'+C+'}'
+'.sona-bkvh .t{font-weight:700;font-size:15px;line-height:1.15}'
+'.sona-bkvh .s{font-size:11.5px;opacity:.82;margin-top:1px}'
+'.sona-bkvb{flex:1;overflow-y:auto;padding:20px 17px 10px}'
+'.sona-bksec{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:10.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#a39a87;margin:0 0 13px}'
+'.sona-bksec.t2{margin-top:24px}'
+'.sona-bkdays{display:flex;gap:9px;overflow-x:auto;padding:2px 0 8px}'
+'.sona-bkday{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:2px;border:1.5px solid #e7e0d3;background:#fff;border-radius:16px;padding:12px 13px;cursor:pointer;min-width:62px;transition:transform .14s,border-color .14s,box-shadow .14s;box-shadow:0 4px 14px -10px rgba(17,33,43,.5)}'
+'.sona-bkday .dn{font-size:10.5px;color:#a39a87;font-weight:700;text-transform:uppercase;letter-spacing:.04em}'
+'.sona-bkday .dd{font-size:18px;color:#27323b;font-weight:700;line-height:1.05}'
+'.sona-bkday .dm{font-size:10px;color:#a39a87;font-weight:600;text-transform:uppercase;letter-spacing:.03em}'
+'.sona-bkday:hover{border-color:'+C+';transform:translateY(-2px)}'
+'.sona-bkday.on{background:'+C+';border-color:'+C+';transform:translateY(-2px);box-shadow:0 12px 24px -10px rgba(17,33,43,.55)}'
+'.sona-bkday.on .dn,.sona-bkday.on .dd,.sona-bkday.on .dm{color:'+ON+'}'
+'.sona-bkday.off{opacity:.45;cursor:default;background:#efe9df;border-color:transparent;box-shadow:none}.sona-bkday.off:hover{transform:none;border-color:transparent}'
+'.sona-bkmon{text-align:center;font-weight:700;font-size:14px;color:#27323b;margin:0 0 12px}'
+'.sona-bkwd{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:7px}'
+'.sona-bkwd span{text-align:center;font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#a39a87}'
+'.sona-bkcal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}'
+'.sona-bkcell{aspect-ratio:1/1;border:1.5px solid #e7e0d3;background:#fff;border-radius:11px;font-size:14px;font-weight:700;color:#27323b;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .12s,border-color .14s,box-shadow .14s;box-shadow:0 3px 10px -9px rgba(17,33,43,.5)}'
+'.sona-bkcell:hover{border-color:'+C+';transform:translateY(-2px);box-shadow:0 10px 20px -10px rgba(17,33,43,.5)}'
+'.sona-bkcell.today{border-color:'+C+';box-shadow:0 0 0 1.5px '+C+' inset}'
+'.sona-bkcell.off{opacity:.4;cursor:default;background:#efe9df;border-color:transparent;color:#a39a87;box-shadow:none}.sona-bkcell.off:hover{transform:none;border-color:transparent;box-shadow:none}'
+'.sona-bkslots{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}'
+'.sona-bkslot{border:1.5px solid #e7e0d3;background:#fff;border-radius:13px;padding:12px 6px;font-size:13.5px;color:#27323b;font-weight:600;cursor:pointer;text-align:center;transition:transform .12s,border-color .14s,background .14s;box-shadow:0 4px 14px -11px rgba(17,33,43,.5)}'
+'.sona-bkslot:hover{border-color:'+C+';background:#fffaf2;transform:translateY(-1px)}'
+'.sona-bkslot.on{background:'+C+';border-color:'+C+';color:'+ON+';box-shadow:0 10px 20px -10px rgba(17,33,43,.5)}'
+'.sona-bknote{font-size:13px;color:#6b7480;line-height:1.55;background:#fff;border:1px solid #ece5d9;border-radius:14px;padding:14px 15px;box-shadow:0 6px 18px -14px rgba(17,33,43,.5)}'
+'.sona-bkvf{flex:0 0 auto;border-top:1px solid #e8e0d3;background:#fff;padding:14px 16px 15px;display:flex;flex-direction:column;gap:10px;box-shadow:0 -8px 24px -18px rgba(17,33,43,.5)}'
+'.sona-bksum{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#27323b;font-weight:700}'
+'.sona-bksum .cal{font-size:15px}'
+'.sona-bkin{border:1.5px solid #e7e0d3;border-radius:12px;padding:12px 14px;font-size:16px;outline:0;background:#faf8f4;width:100%;transition:border-color .15s,background .15s;color:#27323b}'
+'.sona-bkin:focus{border-color:'+C+';background:#fff}'
+'.sona-bkin::placeholder{color:#a39a87}'
+'.sona-bkrow{display:flex;gap:10px}.sona-bkrow .sona-bkin{flex:1}'
+'.sona-bkgo{border:0;background:'+C+';color:'+ON+';border-radius:13px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;transition:filter .15s,transform .1s;box-shadow:0 12px 26px -12px rgba(17,33,43,.6)}'
+'.sona-bkgo:hover{filter:brightness(1.07)}.sona-bkgo:active{transform:scale(.99)}'
+'.sona-bkgo:disabled{opacity:.6;cursor:default;filter:none}'
+'.sona-bkerr{font-size:12.5px;color:#c0392b;min-height:1px;font-weight:500}'
+'.sona-bkdirect{text-align:center;font-size:12.5px;color:#a39a87;text-decoration:none;display:block;padding:14px 4px 4px;font-weight:600}'
+'.sona-bkdirect:hover{color:'+C+'}'
+'.sona-bkhint{font-size:13px;color:#a39a87;margin-top:16px;text-align:center}'
+'.sona-bkchg{display:inline-flex;align-items:center;gap:5px;border:0;background:none;color:#6b7480;font-size:13px;cursor:pointer;padding:0 0 14px;font-weight:500}'
+'.sona-bkchg b{color:#27323b;font-weight:700}.sona-bkchg:hover{color:'+C+'}'
+'.sona-bkchosen{display:flex;align-items:center;gap:9px;width:100%;border:1.5px solid #e7e0d3;background:#fff;border-radius:13px;padding:13px 14px;cursor:pointer;text-align:left;box-shadow:0 4px 14px -11px rgba(17,33,43,.5);transition:border-color .15s}'
+'.sona-bkchosen:hover{border-color:'+C+'}'
+'.sona-bkchosen .cal{font-size:16px;flex:0 0 auto}.sona-bkchosen .cx{font-size:14px;font-weight:700;color:#27323b;flex:1}.sona-bkchosen .ed{font-size:12.5px;font-weight:700;color:'+C+';flex:0 0 auto}'
+'.sona-bkfield{margin-top:14px}'
+'.sona-bklab{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:10px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:#a39a87;margin:0 0 6px 2px}'
+'.sona-bkre{font-size:12px;color:#9aa3ab;margin-top:13px;display:flex;align-items:center;gap:6px;line-height:1.4}'
+'.sona-bkseg{display:flex;gap:5px;margin-bottom:15px;background:#ebe4d8;border-radius:13px;padding:4px}'
+'.sona-bkseg button{flex:1;border:0;background:none;border-radius:10px;padding:9px 6px;font-size:12.5px;font-weight:700;color:#6b7480;cursor:pointer;transition:color .15s,background .15s,box-shadow .15s}'
+'.sona-bkseg button.on{background:#fff;color:#27323b;box-shadow:0 4px 12px -6px rgba(17,33,43,.4)}'
+'.sona-bkok{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 28px;gap:7px}'
+'.sona-bkok .ring{width:66px;height:66px;border-radius:50%;background:'+C+';color:'+ON+';display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 16px 34px -12px rgba(17,33,43,.55);margin-bottom:10px'+(RM?'':';animation:sona-pop .4s cubic-bezier(.2,.8,.3,1) both')+'}'
+'@keyframes sona-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}'
+'.sona-bkok .t{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:23px;color:#16222b;letter-spacing:-.01em}'
+'.sona-bkok .s{font-size:14px;color:#5b6670;line-height:1.55;max-width:290px}'
+'.sona-bkok .dn{margin-top:16px;border:1.5px solid #e7e0d3;background:#fff;border-radius:12px;padding:11px 26px;font-size:14px;font-weight:700;color:#27323b;cursor:pointer;transition:border-color .15s,transform .1s}'
+'.sona-bkok .dn:hover{border-color:'+C+'}.sona-bkok .dn:active{transform:scale(.98)}'
+'.sona-bkpick{margin-top:6px;border:1px solid '+C+';background:#fffaf2;color:'+C+';border-radius:999px;padding:8px 14px;font-size:13.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px}'
+'.sona-bkpick:hover{background:'+C+';color:'+ON+'}'
+'@media (prefers-reduced-motion: reduce){.sona-panel{transition:none}.sona-launch{transition:none}}'
+(EMBED?('#sona-root.sona-embed{position:absolute;inset:0;font-family:Inter,system-ui,-apple-system,sans-serif}'
+'.sona-embed .sona-panel{position:absolute;inset:0;width:auto;height:auto;border-radius:0;box-shadow:none;display:flex;opacity:1;transform:none;overflow:hidden;background:#f7f5f1}'
/* two very soft, slow-drifting glows — ambient, barely perceptible */
+'.sona-orb{position:absolute;border-radius:50%;pointer-events:none;z-index:0;filter:blur(10px)}'
+'.sona-orb.o1{width:560px;height:560px;top:-180px;left:-150px;background:radial-gradient(circle,'+SEC+'.16),transparent 70%)'+(RM?'':';animation:sona-d1 38s ease-in-out infinite')+'}'
+'.sona-orb.o2{width:500px;height:500px;bottom:-170px;right:-140px;background:radial-gradient(circle,'+ACC+'.2),transparent 70%)'+(RM?'':';animation:sona-d2 46s ease-in-out infinite')+'}'
+'@keyframes sona-bg{0%,100%{background-position:50% 0}50%{background-position:50% 100%}}'
+'@keyframes sona-d1{0%,100%{transform:translate(0,0)}50%{transform:translate(70px,50px)}}'
+'@keyframes sona-d2{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,-40px)}}'
/* BRANDED backdrop: a deep brand-shade base (never washed grey), a slow-drifting colour
   wash in THEIR colour, and a large animated motif themed to THEIR industry (a market chart
   for a trading firm, shears for a salon, an ECG for a clinic). This is "their world". */
+'.sona-embed .sona-bg{position:absolute;inset:0;z-index:0;overflow:hidden;background:linear-gradient(160deg,'+BG+' 0%,'+D+' 100%)}'
+'.sona-embed .sona-bg .tint{position:absolute;inset:-12%;background:radial-gradient(46% 46% at 16% 18%,'+SEC+'.16),transparent 64%),radial-gradient(50% 50% at 88% 22%,'+ACC+'.2),transparent 62%),radial-gradient(66% 66% at 60% 104%,'+SEC+'.14),transparent 66%);background-size:170% 170%'+(RM?'':';animation:sona-bg 40s ease-in-out infinite')+'}'
+'.sona-embed .sona-bg .grid{position:absolute;inset:0;opacity:.18;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:52px 52px'+(RM?'':';animation:sona-grid 90s linear infinite')+'}'
+'@keyframes sona-grid{to{background-position:52px 52px}}'
/* the industry motif — a faint texture, barely-there motion. Subtle, not a centrepiece. */
+'.sona-embed .sona-motif{position:absolute;inset:0;z-index:0;color:#fff;opacity:.06;pointer-events:none}'
+'.sona-embed .sona-motif svg{width:100%;height:100%;display:block}'
+(RM?'':'.m-dash{stroke-dasharray:900;stroke-dashoffset:900;animation:sona-draw 16s ease-in-out infinite alternate}'
+'.m-rise{transform-origin:center bottom;animation:sona-grow 11s ease-in-out infinite}'
+'.m-eq{transform-origin:center bottom;animation:sona-eq 7s ease-in-out infinite}')
/* m-spin / m-tw intentionally NOT animated — no spinning, no twinkling (kept static + faint) */
+'@keyframes sona-draw{from{stroke-dashoffset:900}to{stroke-dashoffset:0}}'
+'@keyframes sona-grow{0%,100%{transform:scaleY(.94)}50%{transform:scaleY(1.02)}}'
+'@keyframes sona-eq{0%,100%{transform:scaleY(.82)}50%{transform:scaleY(1)}}'
/* hide plain header; content floats above the orbs */
+'.sona-embed .sona-head,.sona-embed .sona-x{display:none}'
+'.sona-embed .sona-msgs{position:relative;z-index:1;padding:24px clamp(16px,4vw,72px);gap:12px;justify-content:center;background:#f6f1e9}'
+'.sona-embed.chatting .sona-msgs{justify-content:flex-start}'
+'.sona-embed .sona-foot{position:relative;z-index:1;border-top:1px solid #e4dccb;background:rgba(246,241,233,.94);backdrop-filter:blur(8px)}'
+'.sona-embed .sona-in input{background:#fff;border-color:#e4dccb;box-shadow:0 6px 16px -12px rgba(17,33,43,.4)}'
+'.sona-embed .sona-pb{color:#9aa3ab}.sona-embed .sona-pb a{color:#7a8088}'
+'.sona-embed .sona-foot>*{max-width:1040px;margin-left:auto;margin-right:auto}'
+'.sona-embed .sona-in{padding:14px 18px}'
+'.sona-embed .sona-row{max-width:1040px;width:100%}'
/* welcome — logo floats + pulses continuously (visible motion you actually catch) */
+'.sona-welcome{text-align:center;max-width:520px;margin:0 auto;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.7);border-radius:26px;padding:34px 30px 28px;box-shadow:0 40px 90px -34px rgba(0,0,0,.6)}'
+'.sona-welcome .wl{position:relative;min-width:84px;height:84px;max-width:200px;padding:14px 18px;border-radius:22px;margin:-72px auto 16px;display:inline-flex;align-items:center;justify-content:center;background:#fff;color:'+C+';overflow:hidden;border:1px solid rgba(17,33,43,.07);box-shadow:0 20px 44px -16px rgba(0,0,0,.5)'+(RM?'':';animation:sona-float 4.5s ease-in-out infinite')+'}'
+'.sona-welcome .flow-cap{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:'+C+';margin:26px 0 0;padding-top:22px;border-top:1px solid rgba(228,220,203,.8)}'
+'.sona-welcome .flow{display:flex;align-items:flex-start;justify-content:center;gap:3px;margin-top:14px;width:100%}'
+'.sona-welcome .fstep{display:flex;flex-direction:column;align-items:center;gap:9px;flex:1 1 0;min-width:0;padding:0 2px}'
+'.sona-welcome .fic{position:relative;width:46px;height:46px;border-radius:14px;background:#fff;border:1px solid #e4dccb;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 8px 18px -10px rgba(17,33,43,.45)}'
// One calm motion: a soft brand-tinted highlight travels step-by-step (border+shadow tint, a 3px lift)
// and the connector ahead of it briefly fills. No flying dots — barely-there, premium. The per-step
// animation-delay is set in JS by index (welcome()), so it scales to 4 or 5 steps and reads left→right.
+'@keyframes sona-flowstep{0%,10%,46%,100%{border-color:#e4dccb;box-shadow:0 8px 18px -10px rgba(17,33,43,.45);transform:translateY(0)}20%,30%{border-color:'+C+';box-shadow:0 14px 26px -10px '+ACC+'.5);transform:translateY(-3px)}}'
+'@keyframes sona-flowarrow{0%,12%,50%,100%{background:rgba(17,33,43,.18)}22%,32%{background:'+C+'}}'
+'.sona-welcome .flb{font-size:11px;color:#56616b;font-weight:500;line-height:1.2;text-align:center}'
// Connector, vertically centred on the 46px tiles. Rest state is faint; the flow animation fills it.
+'.sona-welcome .farrow{flex:0 0 auto;width:22px;height:2px;margin-top:22px;border-radius:2px;background:rgba(17,33,43,.18)}'
+'.sona-welcome .wl::after{content:"";position:absolute;inset:-7px;border-radius:24px;border:1.5px solid '+C+';opacity:.14}'
+'.sona-welcome .wl img{max-width:172px;max-height:52px;width:auto;height:auto;object-fit:contain;display:block}.sona-welcome .wl svg{width:38px;height:38px}'
+'.sona-welcome h3{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:31px;letter-spacing:-.015em;color:#11212b;margin:0;line-height:1.1}'
+'.sona-welcome p{color:#5b6670;font-size:15px;margin:8px 0 0}'
+'.sona-welcome .sona-chips{justify-content:center;margin-top:22px}'
+'.sona-embed .sona-chip{font-size:14.5px;padding:11px 16px;background:#fff;border:1px solid #e4dccb;box-shadow:0 6px 16px -12px rgba(17,33,43,.4)}'
+'.sona-embed .sona-chip:hover{border-color:'+C+';transform:translateY(-1px)}'
+'@keyframes sona-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}'
+'@keyframes sona-ring{0%{transform:scale(.95);opacity:.45}70%{transform:scale(1.18);opacity:0}100%{opacity:0}}'
+(RM?'':'.sona-welcome h3{animation:sona-rise .6s .05s both}.sona-welcome p{animation:sona-rise .6s .12s both}.sona-welcome .sona-chips{animation:sona-rise .6s .2s both}.sona-embed .sona-row{animation:sona-rise .4s cubic-bezier(.2,.7,.3,1) both}')
+'@keyframes sona-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'):'');
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
var mount=EMBED?document.getElementById('sona-mount'):null;
var EMBEDDED=!!mount;
// In the demo, lead with the wow: make clear it already read THIS site.
if(EMBEDDED){G="Hi — I'm "+N+"'s assistant, and I've just read this website. Ask me anything a customer would: opening hours, services, prices, or how to book.";}
var root=document.createElement('div');root.id='sona-root';if(EMBEDDED)root.className='sona-embed';
var avatar=L?('<img src="'+L+'" alt="">'):bell;
var panel=document.createElement('div');panel.className='sona-panel';
panel.innerHTML='<div class="sona-head"><div class="sona-ava">'+avatar+'</div><div><div class="sona-ttl"></div><div class="sona-sub"><span class="sona-on"></span>Online now</div></div>'+(BOOKON?'<button class="sona-book" type="button" aria-label="Book an appointment"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Book</button>':'')+'<button class="sona-x" aria-label="Close">×</button></div>'
+'<div class="sona-msgs" role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false" aria-label="Conversation"></div>'
+'<div class="sona-foot"><div class="sona-in"><input aria-label="Ask us anything" placeholder="Ask us anything…"><button class="sona-send" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></button></div>'+(BRAND?'<div class="sona-pb">Powered by <a href="'+B+'" target="_blank" rel="noopener">Sona</a></div>':'')+'</div>';
panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',N+' — chat assistant');
panel.querySelector('.sona-ttl').textContent=N;
// Live opening-hours in the header sub-line when we know the hours; else neutral "Online now".
(function(){var hs=hoursStatus();if(!hs)return;var sub=panel.querySelector('.sona-sub');if(!sub)return;sub.textContent='';var dt=document.createElement('span');dt.className='sona-on';if(!hs.open)dt.style.background='#c2c8cd';sub.appendChild(dt);var tx=document.createElement('span');tx.textContent=hs.open?('Open now'+(hs.label?' · '+hs.label:'')):'Closed now';sub.appendChild(tx)})();
// A wide wordmark logo crushed into the 34px header reads as an illegible smear. If the
// logo's aspect ratio is too extreme to render legibly, drop it for the bell mark — the
// header title already shows the business name, so nothing is lost.
(function(){var im=panel.querySelector('.sona-ava img');if(!im)return;function fb(){var av=im.parentNode;if(av)av.innerHTML=bell}im.onload=function(){if(!im.naturalHeight||im.naturalWidth/im.naturalHeight>4.2)fb()};im.onerror=fb;if(im.complete&&im.naturalHeight===0)fb()})();
root.appendChild(panel);
var launch=null;
if(EMBEDDED){var bg=document.createElement('div');bg.className='sona-bg';var tint=document.createElement('div');tint.className='tint';var grid=document.createElement('div');grid.className='grid';var mo=document.createElement('div');mo.className='sona-motif';mo.innerHTML=MOTIF;bg.appendChild(tint);bg.appendChild(grid);bg.appendChild(mo);var o1=document.createElement('div');o1.className='sona-orb o1';var o2=document.createElement('div');o2.className='sona-orb o2';panel.insertBefore(o2,panel.firstChild);panel.insertBefore(o1,panel.firstChild);panel.insertBefore(bg,panel.firstChild);mount.appendChild(root)}
else{var caura=document.createElement('div');caura.className='sona-aura sona-chatbg';['o o1','o o2','o o3','wash'].forEach(function(cn){var e=document.createElement('div');e.className=cn;caura.appendChild(e)});panel.insertBefore(caura,panel.firstChild);panel.classList.add('sona-aurachat');launch=document.createElement('button');launch.className='sona-launch';launch.innerHTML=bell+'<span>Ask us</span>';root.appendChild(launch);document.body.appendChild(root)}
var M=panel.querySelector('.sona-msgs'),I=panel.querySelector('input'),SB=panel.querySelector('.sona-send');
var opened=false;
function chips(){var ideas=['What are your opening hours?','What services do you offer?','How do I book an appointment?'];var w=document.createElement('div');w.className='sona-row a';var c=document.createElement('div');c.className='sona-chips';ideas.forEach(function(q){var x=document.createElement('button');x.className='sona-chip';x.textContent=q;x.onclick=function(){chipGo(q)};c.appendChild(x)});w.appendChild(c);M.appendChild(w);M.scrollTop=M.scrollHeight}
// ── In-widget booking (tier-1 "request a time") ─────────────────────────────
// Slots are derived from the business's real opening hours so they look right, but this is a
// REQUEST, not a confirmed slot (we don't read live availability) — the success copy says so,
// avoiding any double-booking promise. Past times today are filtered; closed days are disabled.
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function fmtDay(d){return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}
function monShort(d){return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}
function fmtDate(d){return d.getDate()+' '+monShort(d)}
function slotsFor(d){var R=parseHours(FACTS.hours),day=d.getDay(),ranges=null;if(R){if(R[day]&&R[day].length)ranges=R[day]}else if(day>=1&&day<=5){ranges=[[540,1020]]}if(!ranges)return [];var out=[],now=new Date(),cut=sameDay(d,now)?(now.getHours()*60+now.getMinutes()+60):-1;ranges.forEach(function(rg){var a=rg[0],b=rg[1];if(b<=a)b=1440;/* overnight (e.g. 20:00–02:00): show the evening up to midnight instead of dropping it silently */for(var t=a;t+30<=b;t+=30){if(t>cut)out.push(t)}});return out}
function monLong(d){return ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]}
// Natural-language "when" parser → {date, min}. Lets a typed request like "12:30 tuesday next week"
// pre-select the day + nearest time instead of dumping the visitor on a blank calendar.
function parseWhen(q){var s=' '+(q||'').toLowerCase()+' ';var now=new Date();var min=null,date=null;
 var ap=s.match(/\\b(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m|p\\.?m)\\b/);
 var hm=s.match(/\\b(\\d{1,2}):(\\d{2})\\b/);
 if(ap){var h=(+ap[1])%12;if(/p/.test(ap[3]))h+=12;min=h*60+(ap[2]?+ap[2]:0)}else if(hm){min=(+hm[1])*60+(+hm[2])}
 var nextWeek=s.indexOf('next week')>=0;var days=['sun','mon','tue','wed','thu','fri','sat'];var dow=-1;
 for(var i=0;i<7;i++){if(s.indexOf(days[i])>=0){dow=i;break}}
 if(s.indexOf('tomorrow')>=0){date=new Date();date.setDate(now.getDate()+1)}
 else if(s.indexOf('today')>=0){date=new Date()}
 else if(dow>=0){var raw=(dow-now.getDay()+7)%7,add;if(nextWeek){add=raw+7;if(raw===0)add=7}else{add=raw===0?7:raw}date=new Date();date.setDate(now.getDate()+add)}
 else if(nextWeek){var a2=(8-now.getDay()+7)%7;if(a2===0)a2=7;date=new Date();date.setDate(now.getDate()+a2)}
 if(date)date.setHours(0,0,0,0);return {date:date,min:min}}
function chipGo(q){if(BOOKON&&/book|appoint|reserve|schedul/i.test(q)){openBook()}else{I.value=q;send()}}
function openBook(prefill){
 if(panel.querySelector('.sona-bkview'))return;
 var sel={date:null,min:null},view='day',period=null,want=null;
 var V=document.createElement('div');V.className='sona-bkview';V.setAttribute('role','dialog');V.setAttribute('aria-modal','true');V.setAttribute('aria-label','Book an appointment');
 var head=document.createElement('div');head.className='sona-bkvh';
 var back=document.createElement('button');back.type='button';back.className='bk';back.setAttribute('aria-label','Back');back.innerHTML='←';back.onclick=function(){if(view==='time'){view='day';render()}else if(view==='form'){view='time';render()}else{V.remove()}};
 var av=document.createElement('div');av.className='av';av.innerHTML=avatar;
 var ti=document.createElement('div');var t1=document.createElement('div');t1.className='t';t1.textContent='Book an appointment';var t2=document.createElement('div');t2.className='s';t2.textContent=N;ti.appendChild(t1);ti.appendChild(t2);
 head.appendChild(back);head.appendChild(av);head.appendChild(ti);
 var body=document.createElement('div');body.className='sona-bkvb';
 var foot=document.createElement('div');foot.className='sona-bkvf';foot.style.display='none';
 var bbg=document.createElement('div');bbg.className='sona-aura';['o o1','o o2','o o3','wash'].forEach(function(cn){var e=document.createElement('div');e.className=cn;bbg.appendChild(e)});
 V.appendChild(bbg);V.appendChild(head);V.appendChild(body);V.appendChild(foot);panel.appendChild(V);
 // De-stretch a wide wordmark in the booking header too (mirror the chat header fallback).
 (function(){var im=av.querySelector('img');if(!im)return;function fb(){av.innerHTML=bell}im.onload=function(){if(!im.naturalHeight||im.naturalWidth/im.naturalHeight>4.2)fb()};im.onerror=fb;if(im.complete&&im.naturalHeight===0)fb()})();
 function dayLabel(d){return fmtDay(d)+' '+d.getDate()+' '+monShort(d)}
 function field(lab,input){var f=document.createElement('div');f.className='sona-bkfield';var l=document.createElement('div');l.className='sona-bklab';l.textContent=lab;f.appendChild(l);f.appendChild(input);return f}
 // Stepped wizard (day → time → details) so each screen fits the panel without scrolling.
 function render(){
  body.innerHTML='';foot.innerHTML='';foot.style.display='none';body.scrollTop=0;
  if(view==='day'){
   t1.textContent='Book an appointment';
   var today=new Date();today.setHours(0,0,0,0);
   // Calendar grid (Mon–Sun, 3 weeks from this Monday). Past + closed days greyed; fills the panel
   // and keeps next week visible at a glance instead of a hidden side-scroll.
   var start=new Date(today);start.setDate(start.getDate()-((start.getDay()+6)%7));
   var WEEKS=3,endd=new Date(start);endd.setDate(start.getDate()+WEEKS*7-1);
   var mon=document.createElement('div');mon.className='sona-bkmon';mon.textContent=(start.getMonth()===endd.getMonth())?(monLong(start)+' '+start.getFullYear()):(monShort(start)+' – '+monShort(endd)+' '+endd.getFullYear());body.appendChild(mon);
   var wd=document.createElement('div');wd.className='sona-bkwd';['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(function(x){var e=document.createElement('span');e.textContent=x;wd.appendChild(e)});body.appendChild(wd);
   var cal=document.createElement('div');cal.className='sona-bkcal';var anyDay=false;
   for(var i=0;i<WEEKS*7;i++){(function(i){var d=new Date(start);d.setDate(start.getDate()+i);d.setHours(0,0,0,0);var b=document.createElement('button');b.type='button';b.className='sona-bkcell';b.textContent=d.getDate();var sl=(d<today)?[]:slotsFor(d);if(sameDay(d,today))b.className+=' today';if(!sl.length){b.disabled=true;b.className+=' off'}else{anyDay=true;b.onclick=function(){sel.date=d;sel.min=null;period=null;want=null;view='time';render()}}cal.appendChild(b)})(i)}
   body.appendChild(cal);
   if(anyDay){var hint=document.createElement('div');hint.className='sona-bkhint';hint.textContent='Pick a day to see available times.';body.appendChild(hint)}else{var nn=document.createElement('div');nn.className='sona-bknote';nn.style.marginTop='12px';nn.textContent='There are no times to request online in the next three weeks.'+(FACTS.phone?(' Please call '+FACTS.phone+' and the team will help.'):'');body.appendChild(nn)}
   if(K){var dl=document.createElement('a');dl.className='sona-bkdirect';dl.href=K;dl.target='_blank';dl.rel='noopener';dl.textContent='Or book on our own page →';body.appendChild(dl)}
  }else if(view==='time'){
   t1.textContent='Choose a time';
   var ch=document.createElement('button');ch.type='button';ch.className='sona-bkchg';ch.innerHTML='‹ <b>'+dayLabel(sel.date)+'</b> · change';ch.onclick=function(){view='day';render()};body.appendChild(ch);
   // Group into Morning/Afternoon/Evening so only one part of the day shows at once — never scrolls.
   var sl=slotsFor(sel.date),groups={am:[],pm:[],eve:[]};sl.forEach(function(m){(m<720?groups.am:(m<1020?groups.pm:groups.eve)).push(m)});
   var avail=[['am','Morning'],['pm','Afternoon'],['eve','Evening']].filter(function(g){return groups[g[0]].length});
   // If the visitor typed a time, land on the part of day holding the nearest slot and highlight it.
   var near=null;if(want!=null&&sl.length){near=sl[0];sl.forEach(function(m){if(Math.abs(m-want)<Math.abs(near-want))near=m});period=(near<720?'am':(near<1020?'pm':'eve'))}
   if(!period||!groups[period]||!groups[period].length)period=avail.length?avail[0][0]:'am';
   if(avail.length>1){var seg=document.createElement('div');seg.className='sona-bkseg';avail.forEach(function(g){var sb=document.createElement('button');sb.type='button';sb.textContent=g[1];if(period===g[0])sb.className='on';sb.onclick=function(){period=g[0];render()};seg.appendChild(sb)});body.appendChild(seg)}
   var grid=document.createElement('div');grid.className='sona-bkslots';groups[period].forEach(function(m){var b=document.createElement('button');b.type='button';b.className='sona-bkslot';b.textContent=fmtMin(m);if(near!=null&&m===near){b.className+=' on';setTimeout(function(){try{b.scrollIntoView({block:'nearest'})}catch(e){}},0)}b.onclick=function(){sel.min=m;view='form';render()};grid.appendChild(b)});body.appendChild(grid);
   want=null;
  }else if(view==='form'){
   t1.textContent='Your details';
   var card=document.createElement('button');card.type='button';card.className='sona-bkchosen';var ci=document.createElement('span');ci.className='cal';ci.textContent='\u{1F4C5}';var cx=document.createElement('span');cx.className='cx';cx.textContent=fmtMin(sel.min)+' · '+dayLabel(sel.date);var ce=document.createElement('span');ce.className='ed';ce.textContent='Edit';card.appendChild(ci);card.appendChild(cx);card.appendChild(ce);card.onclick=function(){view='time';render()};body.appendChild(card);
   var ni=document.createElement('input');ni.className='sona-bkin';ni.placeholder='e.g. Jane Smith';body.appendChild(field('Your name',ni));
   var ei=document.createElement('input');ei.className='sona-bkin';ei.type='email';ei.placeholder='you@email.com';body.appendChild(field('Email for confirmation',ei));
   var err=document.createElement('div');err.className='sona-bkerr';err.style.marginTop='9px';body.appendChild(err);
   var re=document.createElement('div');re.className='sona-bkre';re.textContent='\u{1F512} No payment now — '+N+' confirms by email.';body.appendChild(re);
   foot.style.display='flex';
   var go=document.createElement('button');go.type='button';go.className='sona-bkgo';go.textContent='Request appointment';foot.appendChild(go);
   go.onclick=function(){var nm=ni.value.trim(),em=ei.value.trim();if(!nm){err.textContent='Please enter your name so we know who the booking is for.';ni.focus();return}if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em)){err.textContent='Please enter a valid email so we can confirm.';ei.focus();return}err.textContent='';go.disabled=true;go.textContent='Sending…';var dt=new Date(sel.date);dt.setHours(Math.floor(sel.min/60),sel.min%60,0,0);fetch(B+'/api/book',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant:T,conversationId:SID,name:nm,email:em,startAt:dt.toISOString()})}).then(function(r){return r.json()}).then(function(j){if(j&&j.ok){success(dt,em)}else{err.textContent='Could not send that — please try again.';go.disabled=false;go.textContent='Request appointment'}}).catch(function(){err.textContent='Connection problem — please try again.';go.disabled=false;go.textContent='Request appointment'})};
   setTimeout(function(){ni.focus()},60);
  }
 }
 function success(dt,em){view='done';back.style.visibility='hidden';t1.textContent='Booking requested';foot.style.display='none';foot.innerHTML='';body.innerHTML='';var ok=document.createElement('div');ok.className='sona-bkok';var ring=document.createElement('div');ring.className='ring';ring.textContent='✓';var t=document.createElement('div');t.className='t';t.textContent='Request sent';var s=document.createElement('div');s.className='s';s.textContent=N+' will confirm your '+fmtMin(sel.min)+' appointment on '+fmtDay(dt)+' '+dt.getDate()+' '+monShort(dt)+'. A confirmation goes to '+em+'.';var dn=document.createElement('button');dn.type='button';dn.className='dn';dn.textContent='Done';dn.onclick=function(){V.remove()};ok.appendChild(ring);ok.appendChild(t);ok.appendChild(s);ok.appendChild(dn);body.appendChild(ok)}
 // A typed request ("book 12:30 next tuesday") can pre-pick the day → jump straight to times.
 if(prefill&&prefill.date){var pd=new Date(prefill.date);pd.setHours(0,0,0,0);if(slotsFor(pd).length){sel.date=pd;want=(prefill.min!=null?prefill.min:null);view='time'}}
 render();
}
function welcome(){var w=document.createElement('div');w.className='sona-welcome';
var l=document.createElement('div');l.className='wl';l.innerHTML=avatar;
// Same guard as the header tile: if the logo is missing, broken, or an extreme wordmark that would
// render as a squished/blurry strip, fall back to the clean bell mark.
(function(){var im=l.querySelector('img');if(!im)return;function fb(){l.innerHTML=bell}im.onload=function(){if(!im.naturalHeight||im.naturalWidth/im.naturalHeight>5)fb()};im.onerror=fb;if(im.complete&&im.naturalHeight===0)fb()})();
var h=document.createElement('h3');h.textContent=N;
var p=document.createElement('p');p.textContent="I've just read this website — ask me anything a customer would.";
var c=document.createElement('div');c.className='sona-chips';
function fillChips(arr){c.innerHTML='';arr.forEach(function(q){var x=document.createElement('button');x.className='sona-chip';x.textContent=q;x.onclick=function(){chipGo(q)};c.appendChild(x)})}
fillChips(['What do you offer?','Where are you based?','How do I get started?']);
// swap in questions tailored to THIS business once the server has read its content
fetch(B+'/api/suggest/'+encodeURIComponent(T)).then(function(r){return r.json()}).then(function(j){if(j&&j.questions&&j.questions.length===3)fillChips(j.questions)}).catch(function(){});
var cap=document.createElement('div');cap.className='flow-cap';cap.textContent='How I work for '+N;
var flow=document.createElement('div');flow.className='flow';
// Steps adapt to what this tenant actually does: booking-enabled (paid) tenants get a 5th step.
var steps=[['\u{1F4AC}','Visitor asks'],['\u{1F4D6}','Reads your site'],['⚡','Instant answer'],['\u{1F4E5}','Captures lead']];if(BOOKON)steps.push(['\u{1F4C5}','Books you in']);
var STEP=0.62,DUR=steps.length*STEP+2.4;
steps.forEach(function(it,i){if(i){var ar=document.createElement('div');ar.className='farrow';if(!RM){ar.style.animation='sona-flowarrow '+DUR+'s ease-in-out infinite';ar.style.animationDelay=((i-0.5)*STEP)+'s'}flow.appendChild(ar)}var d=document.createElement('div');d.className='fstep';var ic=document.createElement('div');ic.className='fic';ic.textContent=it[0];if(!RM){ic.style.animation='sona-flowstep '+DUR+'s ease-in-out infinite';ic.style.animationDelay=(i*STEP)+'s'}var lb=document.createElement('div');lb.className='flb';lb.textContent=it[1];d.appendChild(ic);d.appendChild(lb);flow.appendChild(d)});
w.appendChild(l);w.appendChild(h);w.appendChild(p);var kb=buildKB();if(kb){w.appendChild(kb.cap);w.appendChild(kb.el)}w.appendChild(c);w.appendChild(cap);w.appendChild(flow);M.appendChild(w)}
function greet(){if(opened)return;opened=true;if(EMBEDDED){welcome()}else{row('a',G);var kb=buildKB();if(kb){kb.cap.style.textAlign='center';M.appendChild(kb.cap);M.appendChild(kb.el)}chips()}}
function open(){panel.classList.add('open');requestAnimationFrame(function(){panel.classList.add('in')});if(launch)launch.style.display='none';greet();setTimeout(function(){I.focus()},120)}
function close(){if(!launch)return;panel.classList.remove('in');launch.style.display='flex';setTimeout(function(){panel.classList.remove('open')},RM?0:220)}
if(launch)launch.onclick=open;panel.querySelector('.sona-x').onclick=close;
// Escape: step out of the booking overlay if it's open, otherwise close the floating widget.
panel.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var bv=panel.querySelector('.sona-bkview');if(bv){bv.remove()}else if(launch){close()}});
var bkBtn=panel.querySelector('.sona-book');if(bkBtn)bkBtn.onclick=openBook;
if(EMBEDDED){greet();setTimeout(function(){I.focus()},150)}
function row(who,text){var r=document.createElement('div');r.className='sona-row '+who;var bub=document.createElement('div');bub.className='sona-bub';if(who==='a'){var parts=String(text||'').split(/(https?:\\/\\/[^\\s]+)/g);parts.forEach(function(p){if(/^https?:\\/\\//.test(p)){var a=document.createElement('a');try{a.textContent=new URL(p).hostname}catch(e){a.textContent=p}a.href=p;a.target='_blank';a.rel='noopener';bub.appendChild(a)}else if(p){bub.appendChild(document.createTextNode(p))}});}else{bub.textContent=text;}r.appendChild(bub);M.appendChild(r);M.scrollTop=M.scrollHeight;return {row:r,bub:bub}}
function typing(){var r=document.createElement('div');r.className='sona-row a';r.innerHTML='<div class="sona-bub"><span class="sona-dots"><i></i><i></i><i></i></span></div>';M.appendChild(r);M.scrollTop=M.scrollHeight;return r}
function fb(after,mid){var w=document.createElement('div');w.className='sona-fb';
function mk(lab,rt){var x=document.createElement('button');x.type='button';x.setAttribute('aria-label',rt>0?'This answer was helpful':'This answer was not helpful');x.textContent=lab;x.onclick=function(){w.textContent='Thanks for the feedback';fetch(B+'/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant:T,messageId:mid,rating:rt})}).catch(function(){})};return x}
w.appendChild(mk('\u{1F44D}',1));w.appendChild(mk('\u{1F44E}',-1));after.appendChild(w)}
async function send(){var q=I.value.trim();if(!q)return;var wel=M.querySelector('.sona-welcome');if(wel){wel.remove();root.classList.add('chatting');Array.prototype.forEach.call(panel.querySelectorAll('.sona-fbub'),function(n){n.remove()})}else if(!root.classList.contains('chatting')){root.classList.add('chatting');M.innerHTML=''}row('u',q);I.value='';
// Clear booking intent → jump straight to the booking form (don't ask the LLM, which would just
// say "leave your contact info"). \\bbook\\b won't match "books".
if(BOOKON&&/\\b(book|booking|appointment|appt|reserve|reservation|schedule)\\b/i.test(q)){var pw=parseWhen(q);var ok=pw.date&&slotsFor(pw.date).length;row('a',ok?("Of course — here's "+fmtDay(pw.date)+' '+pw.date.getDate()+' '+monShort(pw.date)+". Pick a time below \u{1F447}"):"Of course — let's get you booked in. Pick a time below \u{1F447}");openBook(ok?pw:null);return}
SB.disabled=true;var tp=typing();
try{var r=await fetch(B+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenant:T,message:q,sessionId:SID,pageUrl:location.href})});var j=await r.json();tp.remove();var m=row('a',j.reply||'Sorry, I had trouble there — please try again.');if(j.sources&&j.sources.length&&!j.unsure)srcLine(m.bub,j.sources);if(j.messageId)fb(m.row,j.messageId)}catch(e){tp.remove();row('a','I could not connect just now. Please try again in a moment.')}finally{SB.disabled=false;I.focus()}}
SB.onclick=send;I.addEventListener('keydown',function(e){if(e.key==='Enter')send()});
})();`;
}

// Warm the Gemini + Supabase clients on boot. The FIRST chat after a cold start otherwise
// pays for TLS handshakes + client/DB-pool init all at once (seen as a ~20s hang on the very
// first message); a warm path replies in ~2-4s. Fire-and-forget, errors ignored — this only
// primes connections, it never blocks serving. Costs one tiny embed + one tiny chat per boot.
(async () => {
  try { await Promise.allSettled([retrieve("__warmup__", "hi", 1), chat("Reply with OK.", "warmup")]); } catch {}
})();

// ── In-process scheduler ──────────────────────────────────────────────────────────────────────
// No external cron in the deploy, so the two recurring jobs run here: clean up old demo tenants
// (controls accrued storage/cost) and send each owner their weekly recap (retention). Gated to a
// real deployment — never fires on localhost, so local dev never emails anyone or deletes demos.
// Single-instance assumption: if scaled horizontally, move these to one worker / a real cron.
const IS_PRODUCTION = !!process.env.PUBLIC_BASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.PUBLIC_BASE_URL);
if (IS_PRODUCTION) {
  const DAY = 864e5;
  // Purge demos older than 14 days, daily.
  const purgeTick = async () => {
    try { const r = await purgeOldDemos(14); if (r.purged) console.log(`🧹 purged ${r.purged} old demo tenant(s)`); }
    catch (e) { console.warn("scheduler: demo purge failed", e); }
  };
  // Weekly recap to every claimed tenant with a notify email.
  let lastDigest = 0;
  const digestTick = async () => {
    if (Date.now() - lastDigest < 7 * DAY) return; // once a week even though we check daily
    lastDigest = Date.now();
    try {
      const tenants = await tenantsForDigest();
      let sent = 0;
      for (const t of tenants) {
        try { const r = await sendWeeklyDigest(t.slug, t.name || t.slug, (t as any).lead_notify_email); if (r.sent) sent++; }
        catch (e) { console.warn("scheduler: digest failed for", t.slug, e); }
      }
      console.log(`📬 weekly digest sent to ${sent}/${tenants.length} tenant(s)`);
    } catch (e) { console.warn("scheduler: digest sweep failed", e); }
  };
  // First purge shortly after boot, then daily. Digest checks daily but self-throttles to weekly so a
  // restart can't double-send. (lastDigest starts at 0 → the first daily check WILL send; acceptable.)
  setTimeout(purgeTick, 60_000);
  setInterval(purgeTick, DAY);
  setInterval(digestTick, DAY);
  console.log("⏰ scheduler on: daily demo purge + weekly owner digest");
}

export default { port: Number(process.env.PORT ?? 3000), fetch: app.fetch };
