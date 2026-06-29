# Sona Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

| | |
|---|---|
| **Project** | Sona — AI receptionist widget for local-service SMBs |
| **Document** | Launch implementation plan (low-touch self-serve SaaS) |
| **Date** | 2026-06-25 |
| **Status** | Ready to execute next session |
| **Goal** | Make Sona sellable: take payment, deploy live, and turn any URL into an instant demo — all with zero founder involvement |

**Goal:** Turn the working-but-unsellable app into a self-serve product that strangers can discover, try, and pay for without the founder ever making a call.

**Architecture:** Keep the existing Bun + Hono + Supabase stack. Add a framework-agnostic `billing.ts` (mirrors `lib.ts`), a public marketing/demo surface, and a deploy config. No new frameworks. Lead generation + delivery is already built; this plan adds *money*, *reach*, and *liveness*.

**Tech Stack:** Bun, Hono, Supabase (pgvector), Gemini (`gemini-2.5-flash` + `gemini-embedding-001`), Stripe, a Node-compatible host (Railway/Render/Fly).

## Global Constraints

- **Low-touch, always.** No feature may require the founder to call, meet, or manually onboard anyone. Everything self-serve + automated. (See memory `daniel-low-touch-saas`.)
- Verification = `bun run typecheck` (rc=0) + boot probe + targeted `curl`. There is **no test framework** in this repo; do not invent one — verify via typecheck, server boot, and HTTP probes.
- The project is **not a git repo** — there are no commit steps. "Done" = typecheck green + probe passes.
- Service key bypasses RLS → every tenant-scoped route MUST stay gated by `requireMember`. Webhook is the only unauthenticated new route (Stripe-signature-verified instead).
- All tenant-controlled URLs must go through `safeFetch`/`validCalLink`-style validation. All DB values `esc()`'d before innerHTML.
- Pricing tiers (match `PLAN_LIMITS` in `lib.ts`): Trial (14d, 100 convo, 5 src) · Starter $29 · Pro $79 · Business $199.
- Chat model `gemini-2.5-flash`; embeddings `gemini-embedding-001` @768 dims. Don't revert these.
- **Any external `<script>` MUST carry `integrity="sha384-…"` + `crossorigin="anonymous"`** (SRI). Prefer no external scripts at all on new surfaces (landing page needs none). The only allowed CDN script is the existing SRI-pinned supabase-js in `dashboard.ts`.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/billing.ts` | Stripe: checkout, portal, webhook handling, plan resolution | **Create** |
| `src/index.ts` | Wire billing endpoints + enforcement | Modify |
| `src/lib.ts` | `planLimits()` helper + source-limit enforcement in `ingestUrl` | Modify |
| `src/dashboard.ts` | Billing tab (plan, usage, upgrade/manage buttons) | Modify |
| `src/landing.ts` | Public marketing + auto-demo page (paste URL → live bot) | **Create** |
| `migrations/2026-06-25-billing.sql` | (only if new columns needed beyond existing stripe_* cols) | **Create if needed** |
| `Dockerfile` / host config | Deploy to a real domain | **Create** |
| `.env.example` | Add Stripe + base-url vars | Modify |

> Schema already has `stripe_customer_id`, `stripe_subscription_id`, `plan` on `tenants` — Task 1 likely needs **no migration**. Confirm before writing one.

---

## Task 1: Stripe billing (`src/billing.ts`)

**Files:**
- Create: `src/billing.ts`
- Modify: `src/index.ts` (endpoints + source-limit enforcement)
- Modify: `src/lib.ts` (`planLimits()` + enforce in `ingestUrl`)
- Modify: `.env.example`

**Interfaces:**
- Produces: `createCheckout(tenant, plan): Promise<{url}>`, `createPortal(tenant): Promise<{url}>`, `handleWebhook(rawBody, sig): Promise<void>`, `planLimits(tenant): {conversations, sources}`.
- Consumes: `cfg` from `lib.ts`, `sb()`, `getTenant()`.

- [ ] **Step 1: Add Stripe deps + env.** Run `cd product && bun add stripe`. Add to `.env.example`: `STRIPE_SECRET_KEY=`, `STRIPE_WEBHOOK_SECRET=`, `STRIPE_PRICE_STARTER=`, `STRIPE_PRICE_PRO=`, `STRIPE_PRICE_BUSINESS=`. Add same keys (blank) to `.env`.

- [ ] **Step 2: Add Stripe config to `lib.ts` `cfg`.** Add `stripeSecret: env("STRIPE_SECRET_KEY")`, `stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET")`, and a `stripePrices` map `{starter: env("STRIPE_PRICE_STARTER"), pro: env("STRIPE_PRICE_PRO"), business: env("STRIPE_PRICE_BUSINESS")}`. Add a `configWarnings()` line: if `!cfg.stripeSecret` push "STRIPE_SECRET_KEY missing — billing disabled."

- [ ] **Step 3: Write `src/billing.ts`.** Implement:
```ts
import Stripe from "stripe";
import { cfg, getTenant, sb, PLAN_LIMITS } from "./lib";

const stripe = () => new Stripe(cfg.stripeSecret);

export function planLimits(t: any) {
  return {
    conversations: t?.monthly_conversation_limit ?? PLAN_LIMITS[t?.plan ?? "trial"]?.conversations ?? 100,
    sources: t?.source_limit ?? PLAN_LIMITS[t?.plan ?? "trial"]?.sources ?? 5,
  };
}

export async function createCheckout(tenant: string, plan: string): Promise<{ url: string }> {
  if (!cfg.stripeSecret) throw new Error("billing disabled");
  const price = (cfg.stripePrices as any)[plan];
  if (!price) throw new Error("unknown plan");
  const t = await getTenant(tenant);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: t?.stripe_customer_id || undefined,
    client_reference_id: tenant,
    metadata: { tenant, plan },
    success_url: `${cfg.baseUrl}/dashboard?billing=success`,
    cancel_url: `${cfg.baseUrl}/dashboard?billing=cancel`,
  });
  return { url: session.url! };
}

export async function createPortal(tenant: string): Promise<{ url: string }> {
  const t = await getTenant(tenant);
  if (!t?.stripe_customer_id) throw new Error("no customer");
  const s = await stripe().billingPortal.sessions.create({
    customer: t.stripe_customer_id,
    return_url: `${cfg.baseUrl}/dashboard`,
  });
  return { url: s.url };
}

export async function handleWebhook(rawBody: string, sig: string): Promise<void> {
  const event = stripe().webhooks.constructEvent(rawBody, sig, cfg.stripeWebhookSecret);
  const db = sb();
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as any;
    await db.from("tenants").update({
      plan: s.metadata?.plan ?? "starter",
      stripe_customer_id: s.customer,
      stripe_subscription_id: s.subscription,
    }).eq("slug", s.client_reference_id ?? s.metadata?.tenant);
  }
  if (event.type === "customer.subscription.deleted") {
    const s = event.data.object as any;
    await db.from("tenants").update({ plan: "trial" }).eq("stripe_subscription_id", s.id);
  }
}
```

- [ ] **Step 4: Add endpoints to `index.ts`.** Import `{ createCheckout, createPortal, handleWebhook, planLimits }`. Add:
```ts
app.post("/api/t/:tenant/billing/checkout", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  const { plan } = await c.req.json();
  try { return c.json(await createCheckout(tenant, plan)); }
  catch (e: any) { return c.json({ error: e.message }, e.message === "billing disabled" ? 503 : 400); }
});
app.post("/api/t/:tenant/billing/portal", async (c) => {
  const tenant = c.req.param("tenant");
  const { user, ok } = await requireMember(c, tenant);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!ok) return c.json({ error: "forbidden" }, 403);
  try { return c.json(await createPortal(tenant)); }
  catch (e: any) { return c.json({ error: e.message }, 400); }
});
// Webhook: RAW body, signature-verified. Register BEFORE any json body parsing.
app.post("/api/billing/webhook", async (c) => {
  const sig = c.req.header("stripe-signature") ?? "";
  const raw = await c.req.text();
  try { await handleWebhook(raw, sig); return c.json({ received: true }); }
  catch (e: any) { return c.json({ error: e.message }, 400); }
});
```

- [ ] **Step 5: Enforce source limit in `ingestUrl` (`lib.ts`).** Before inserting a new document, count existing docs for the tenant; if `>= planLimits(t).sources`, throw a typed error. In the dashboard/`/api/t/:tenant/ingest` route, catch it and return **402** with `{error, upgrade:true}`. (Conversation quota already enforced via `overQuota`.)

- [ ] **Step 6: Verify.** Run `bun run typecheck` → rc=0. Boot probe: `/api/t/x/billing/checkout` unauth → 401; `/api/billing/webhook` with bad sig → 400. With Stripe test keys in `.env`, run `stripe listen --forward-to localhost:4000/api/billing/webhook` and `stripe trigger checkout.session.completed` → confirm a tenant row's `plan` updates.

---

## Task 2: Auto-demo generator + public landing (`src/landing.ts`)

The no-calls acquisition engine: a public page where anyone (or the founder, in bulk) pastes a website URL and instantly gets a live bot trained on that site, with a shareable link and a "claim this / sign up" CTA.

**Files:**
- Create: `src/landing.ts` (exports `landingHtml(base)`)
- Modify: `src/index.ts` (`GET /` serves landing; `POST /api/demo` builds a demo)

**Interfaces:**
- Produces: `landingHtml(base): string`; route `POST /api/demo {url}` → `{slug, demoUrl}`.

- [ ] **Step 1: Add `POST /api/demo` to `index.ts`.** Public, rate-limited. Derive a slug from the URL host (reuse the dashboard's slug logic; ensure `^[a-z0-9-]{2,40}$`). Prefix demo slugs with `demo-` to keep them separate from claimed tenants. `ensureTenant(slug)`, then `ingestUrl(slug, url)` (SSRF-guarded already). Return `{slug, demoUrl: base+"/demo/"+slug}`. Rate-limit per IP (reuse `rateLimit`, e.g. 3/min) to prevent abuse of the public embed budget.
```ts
app.post("/api/demo", async (c) => {
  const { url } = await c.req.json();
  if (!url || !/^https?:\/\//i.test(url)) return c.json({ error: "valid url required" }, 400);
  const ip = (c.req.header("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (!rateLimit(`demo:${ip}`, 3)) return c.json({ error: "slow down" }, 429);
  const host = new URL(url).hostname.replace(/^www\./, "");
  let slug = "demo-" + host.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "").slice(0, 34);
  if (slug.length < 2) slug = "demo-site";
  await ensureTenant(slug, host);
  const chunks = await ingestUrl(slug, url);
  return c.json({ slug, demoUrl: `${cfg.baseUrl}/demo/${slug}`, chunks });
});
```
(Re-add `ensureTenant` to the `index.ts` import.)

- [ ] **Step 2: Write `src/landing.ts`.** A polished public page (reuse the dashboard's CSS direction): headline ("Turn your website visitors into booked leads — 24/7"), one URL input + "See it on my site" button → calls `/api/demo`, shows progress, then embeds the resulting bot in an iframe (`/demo/<slug>`) + a "Get this on your site" CTA linking to `/dashboard`. All values `esc()`'d. No external scripts beyond the existing SRI'd supabase one (not even needed here — landing has no auth).

- [ ] **Step 3: Serve it.** In `index.ts`, change `GET /` from the plain text to `c.html(landingHtml(cfg.baseUrl))`. Keep a `GET /health` returning `ok` for uptime checks.

- [ ] **Step 4: Verify.** `bun run typecheck` → rc=0. Boot probe: `/` returns 200 HTML containing the headline; `POST /api/demo {url:"https://example.com"}` returns `{slug, demoUrl}`; visiting `demoUrl` renders the widget. Bad url → 400; spam → 429.

---

## Task 3: Deploy to a real domain

**Files:**
- Create: `Dockerfile` (or host-native config)
- Modify: `.env.example` (note `PUBLIC_BASE_URL` must be the real https URL)

- [ ] **Step 1: Dockerfile.**
```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --production
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["bun", "src/index.ts"]
```

- [ ] **Step 2: Pick host (Railway recommended — Bun-native, ~$5/mo, no cold starts).** Create project, connect repo or `railway up`. Set ALL env vars from `.env` in the host dashboard (Supabase, Gemini, Stripe, and `PUBLIC_BASE_URL=https://<your-domain>`).

- [ ] **Step 3: Domain.** Point a domain (or use the host subdomain initially) at the service. Update `PUBLIC_BASE_URL` to match exactly — the widget embed + demo links + Stripe redirects all build from it.

- [ ] **Step 4: Stripe webhook.** In Stripe dashboard → Webhooks → add endpoint `https://<domain>/api/billing/webhook`, copy the signing secret into the host's `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 5: Verify.** Hit `https://<domain>/` (landing), `/dashboard` (login works — add the domain to Supabase Auth → URL Configuration → redirect allow-list), embed `<script src="https://<domain>/widget.js?tenant=...">` on a test page, confirm chat works.

---

## Task 4: End-to-end live verification

- [ ] **Step 1: Full funnel on the live deploy.** Landing → paste a real URL → demo builds → bot answers from that site's content.
- [ ] **Step 2: Signup → bot → embed.** `/dashboard` → magic-link login → create bot → ingest → copy embed → paste on a test page → ask a question → answer is grounded.
- [ ] **Step 3: Lead path.** In the widget, leave an email → confirm a lead row appears in the dashboard Leads tab AND (if configured) the alert email/SMS fires.
- [ ] **Step 4: Payment path.** Dashboard billing tab → Upgrade → Stripe checkout (test mode) → pay → webhook flips `plan` → dashboard shows new plan + limits.
- [ ] **Step 5: Rotate the secrets** pasted in chat earlier (Supabase `service_role`, Gemini key) before announcing/launch.

---

## Out of scope (later)
Prompt caching + chunk-count reduction (cost cut), sandboxed-iframe widget, source-attribution RPC fix, server-signed session IDs, agency white-label, annual plans.

## Self-review notes
- Spec coverage: payment (T1), reach/demo (T2), liveness (T3), proof (T4) — all four "must-work-now" items covered.
- No migration assumed for T1 (stripe_* cols exist) — **confirm** before launch; if `plan` enum needs values, add them.
- Low-touch constraint honored: demo + signup + checkout + delivery are all self-serve, zero founder contact.
