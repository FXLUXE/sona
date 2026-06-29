# Sona — Launch-Readiness Assessment

| | |
|---|---|
| **Project** | Sona — self-serve AI receptionist for local-service SMBs |
| **Document** | Launch-readiness research: what is needed to charge money & launch |
| **Date** | 2026-06-25 |
| **Status** | Pre-launch review — grounded in the actual codebase |
| **Stack** | Bun · Hono · Supabase (pgvector) · Gemini 2.5 Flash + gemini-embedding-001 · Stripe · Resend/Twilio |
| **Constraint** | Fully self-serve, low-touch. No calls, meetings, or manual onboarding — ever. |
| **Goal** | Sell within days. |

---

## 1. What Is Already Built (Do Not Re-Build)

A careful read of `src/index.ts`, `src/lib.ts`, `src/billing.ts`, `src/landing.ts`, `schema.sql`, and the migrations confirms a genuinely capable product already exists. The launch plan below assumes all of this is **done** and recommends only the gaps around it.

| Capability | Where | State |
|---|---|---|
| Stripe checkout, billing portal, signature-verified webhook | `src/billing.ts`, `index.ts` `/api/t/:tenant/billing/*`, `/api/billing/webhook` | Built. Webhook flips `plan` on `checkout.session.completed`; drops to trial on `subscription.deleted` |
| Plan limits + enforcement (conversations + sources) | `lib.ts` `PLAN_LIMITS`, `overQuota`, `ingestUrl` source cap → `402 upgrade` | Built |
| Public auto-demo (paste URL → live bot) + concierge demo stage | `index.ts` `/api/demo`, `/demo/:tenant` | Built. Per-IP rate-limited (3/min), SSRF-guarded, `demo-` slug namespace |
| Polished marketing landing page (no external scripts) | `src/landing.ts` | Built. "Concierge desk" design, pricing, FAQ, demo embed |
| RAG: crawl → chunk → embed → retrieve → grounded answer | `lib.ts` `ingestUrl`, `ingestSite`, `retrieve`, `answer` | Built. SSRF guard, redirect re-validation, content-hash dedup |
| Lead capture + scoring + multi-channel alerts (email/SMS/webhook) | `lib.ts` `answer`, `notifyLead`, `sendLeadEmail`, `sendLeadSms`, `fireLeadWebhook` | Built. Best-effort, deduped per conversation |
| GDPR DSAR export + delete by visitor email | `lib.ts` `exportSubject`, `deleteSubject`; `index.ts` `/api/t/:tenant/gdpr/*` | Built (owner-triggered) |
| Dashboard: stats, leads, convos, transcripts, gaps, bookings, billing, CSAT | `index.ts` guarded routes, `src/dashboard.ts` | Built. Magic-link auth, JWT-verified, `requireMember` on every tenant route |
| Widget with 👍/👎 feedback, booking link, auto-brand theming | `index.ts` `/widget.js`, `lib.ts` `extractBrand`/`autoBrandTenant` | Built |
| Content-gap report (unanswered questions) | `lib.ts` `contentGaps`, `resolveGap` | Built |
| Provider routing: paid/regulated tenants → Anthropic (no-train) | `lib.ts` `resolveProvider` | Built |
| Multi-tenant RLS + service-key perimeter | `schema.sql`, migration wave-1 | Built |
| Dockerfile (Bun, port 8080) | `Dockerfile` | Built (not yet deployed) |

**Implication:** The remaining work is almost entirely *non-code, operational, and trust/abuse* work — exactly the items easy to forget. The software is closer to sellable than it looks; the **business** around it is not yet wired.

---

## 2. LAUNCH BLOCKERS — Must Exist Before Taking a Single Payment

These are ordered by "what stops you from legally and safely charging money." Most are founder-gated (an account, a secret, a domain) — none require re-architecting the app.

| # | Blocker | Why it blocks launch | Effort | Owner |
|---|---|---|---|---|
| B1 | **Secret rotation** | Founder pasted live `service_role` + Gemini keys into chat earlier. The `service_role` key bypasses **all** RLS — anyone holding it owns every tenant's data. This is the single highest-severity item. Rotate Supabase service+anon keys, Gemini key, and any Stripe/Resend/Twilio keys touched, then re-set them only in the host's env. | S | Founder-gated |
| B2 | **Privacy Policy + Terms of Service** | Stripe **requires** a published privacy policy + ToS to keep an account in good standing. Independently, the product stores visitor PII (emails, phones, chat transcripts, IPs via rate-limit) and runs in the EU SMB market → GDPR demands a lawful-basis statement, a controller/processor split (Sona is processor; tenant is controller), sub-processor list (Supabase, Google/Gemini, Resend, Twilio, Stripe), and a DPA offer. Without these, both Stripe risk and GDPR exposure are live. | M | Code-only (host pages) + founder (legal text) |
| B3 | **Cookie / consent stance** | The widget writes `localStorage` (`aiw-sid:*`) and captures PII. Need a clear stance: document that the session key is strictly-functional (defensible as no-consent) and that the *tenant* is responsible for surfacing consent on their own site. Add a one-line consent note to the widget or a clause in the embed instructions. Today there is no stated position — a gap a privacy-conscious buyer or regulator will probe. | S | Code-only |
| B4 | **Demo denial-of-wallet protection** | `/api/demo` is public and runs `ingestUrl` → crawl + **embed every chunk** on Gemini, creating a permanent `demo-*` tenant + chunks each time. Protection today is only per-IP (3/min) with **no cleanup and no global cap**. An attacker rotating IPs (or just organic abuse) drives unbounded embedding cost + unbounded DB growth. Need: a global daily demo budget/counter, a cap on pages crawled per demo, a max chunks per demo, and a TTL/cron that deletes `demo-*` tenants older than N days. | M | Code-only |
| B5 | **Real domain + live deploy** | `PUBLIC_BASE_URL` is `localhost`. Every embed link, demo URL, and Stripe redirect is built from it, so nothing works off-box until deployed. Deploy the Dockerfile to a Bun-native host (Railway/Render/Fly), point a domain, set `PUBLIC_BASE_URL` to the exact https origin, and add the domain to Supabase Auth redirect allow-list. | M | Founder-gated |
| B6 | **Stripe products/prices created + webhook registered** | `billing.ts` reads `STRIPE_PRICE_STARTER/PRO/BUSINESS` from env, but those price IDs must be **created in the Stripe dashboard** ($29/$79/$199) and the live webhook endpoint registered to get `STRIPE_WEBHOOK_SECRET`. Until then, checkout throws "unknown plan" and webhooks fail signature verification. Activate the Stripe account (business details, bank) so payouts work. | S | Founder-gated |
| B7 | **Email deliverability: SPF / DKIM / DMARC** | Lead alerts go out via Resend from `leads@sona.app` (`FROM_EMAIL`). Without verifying the sending domain (SPF + DKIM) and a DMARC record, the **single most important product moment** — the instant lead alert — lands in spam or is rejected. A self-serve SMB tool whose alerts don't arrive is silently broken. Verify the domain in Resend before launch. | S | Founder-gated |
| B8 | **Error monitoring** | There is no error tracking. Many failures are deliberately swallowed (`.catch(()=>{})` on notify/webhook/brand) and a zero-touch model means **no human is watching**. A silent failure in embeddings, checkout, or webhook handling = lost revenue you never learn about. Add Sentry (or equivalent) to the server, plus alerting on `/api/billing/webhook` 4xx/5xx. | S | Code-only + founder (account) |

> **Top 5 blockers (most urgent first):** B1 secret rotation → B6 Stripe products/webhook → B2 Privacy Policy + ToS → B4 demo denial-of-wallet → B7 email deliverability (SPF/DKIM). B5 (deploy) and B8 (monitoring) are mandatory but are natural by-products of going live.

---

## 3. SHOULD-HAVE BEFORE SCALE

Not blockers for the *first* payment, but each will bite within the first weeks of real traffic. The zero-touch model raises the stakes: there is no one to manually paper over these.

| Item | Why it matters under zero-touch | Effort | Owner |
|---|---|---|---|
| **Onboarding email sequence (trial → paid)** | Trial is 14 days (`trial_ends_at`), but nothing emails the owner: no welcome, no "your bot is live," no day-10 "trial ending," no win-back. With no sales calls, email **is** the conversion engine. Wire Resend transactional sends on signup/claim and a scheduled trial-expiry nudge. | M | Code-only |
| **Status for failed embeddings** | `ingestUrl` throws on first chunk-insert failure, leaving a half-ingested source with no surfaced state. The owner sees a silent partial bot. Add an ingest status (`pending/ok/failed`) per document + a dashboard indicator and retry. | M | Code-only |
| **Abuse / cost caps per tenant** | Conversation quota blocks only *new* convos; chat output is capped at 1024 tokens, but there's no global LLM spend ceiling and the in-memory rate limiter resets on every deploy/restart and is per-process (won't hold across replicas). Add a hard monthly token/cost cap per tenant and a global circuit breaker. | M | Code-only |
| **Edge rate-limiting** | `rateLimit()` is an in-memory `Map` — it evaporates on restart and doesn't span instances. Put Cloudflare (or host edge) rate-limiting in front of `/api/demo`, `/api/chat`, `/api/book` as a durable backstop. | S | Founder-gated (DNS) + code |
| **Uptime / health monitoring** | `/health` exists but nothing pings it. Add an external uptime monitor (UptimeRobot/Betterstack) → the founder is paged if the desk goes down, since no one is watching. | S | Founder-gated |
| **Basic analytics / conversion tracking** | No funnel instrumentation on the landing/demo → can't tell what converts. Add lightweight, privacy-respecting analytics (Plausible) + count `/api/demo` → `/dashboard` claim conversions. | S | Founder-gated + code |
| **Backup / restore** | Supabase has automated backups on paid tiers, but confirm the project is on a tier with point-in-time recovery and document a restore runbook. Customer data loss is unrecoverable trust loss. | S | Founder-gated |

---

## 4. HIGH-ROI ADDITIONS — Conversion & Retention

Each is marked **effort (S/M/L)** and **code-only** (the agent can ship it) vs **founder-gated** (needs an account/secret/decision). Grounded in what exists today.

| Addition | Why it lifts conversion/retention | Effort | Type |
|---|---|---|---|
| **Annual plans (2 months free)** | Pulls cash forward and slashes the 3–7%/mo SMB self-serve churn risk. `billing.ts` already maps plan→price; add 3 more annual price IDs + a monthly/annual toggle on the landing pricing table. | S | Code-only + founder (Stripe prices) |
| **Weekly digest email to owners** | The retention killer for SMB tools is "I forgot it was working." A Friday "this week Sona answered 47 visitors, captured 6 leads worth ~$X" email (data already in `tenantStats`) keeps perceived value visible and reduces churn. Pairs with the onboarding sequence. | M | Code-only + founder (Resend domain) |
| **Multi-page crawl UX** | `ingestSite` (BFS, maxPages=20) already exists but the public demo and dashboard ingest call only single-URL `ingestUrl`. Exposing "crawl my whole site" makes the demo dramatically more impressive (the bot knows everything) — the core "trained on your site in 30s" wow moment. | S | Code-only |
| **Exit-intent demo prompt** | Landing already has the URL-paste demo; add an exit-intent trigger that nudges "before you go, watch it read your site" to recover bouncing visitors. Pure front-end in `landing.ts`. | S | Code-only |
| **OG / social share image** | No `og:image` on the landing or `/demo/:tenant` pages. A branded share card massively lifts CTR when the founder (or a customer) shares a demo link — the primary low-touch distribution path. Add static OG meta + a per-demo card. | S | Code-only |
| **Referral / "powered by Sona" link** | A subtle, optional "powered by Sona" in the widget on trial/free tenants is free distribution into the exact ICP (other SMB sites). Add a tenant flag + a discount-code referral. | M | Code-only + founder (Stripe coupons) |
| **More booking backends** | `booking_backend` supports `calcom`/`google` in schema but the widget only renders a generic cal link. Native Calendly/Google Calendar slot display deepens the "books appointments" promise that justifies the price vs. commodity chatbots. | L | Code-only + founder (API apps) |
| **White-label / agency tier** | The GTM research names agency/web-designer white-label as the scale channel. Defer until post-launch, but it's the highest-ceiling addition: one agency reseller = dozens of tenants with zero founder touch. | L | Code-only + founder (pricing) |

> **Top 5 high-ROI additions:** (1) Annual plans, (2) Weekly digest email, (3) Multi-page crawl UX, (4) OG/social share image, (5) Exit-intent demo. The first four are largely code-only and reuse helpers that already exist.

---

## 5. COMPETITIVE CONTEXT

The category is **AI website chat / lead-capture for SMBs**, sitting between two adjacent markets. (This is consistent with the prior GTM research in `docs/superpowers/specs/2026-06-24-sona-gtm-marketing-research.md`.)

| Segment | Examples | Typical price | What they offer | Where Sona stands |
|---|---|---|---|---|
| "Chat trained on your site" | Chatbase, SiteGPT, Chatling, Tidio | $29–$150/mo | RAG Q&A on your site, embed widget, basic lead form | **Commoditized.** Sona matches table stakes and adds speed-to-lead SMS + scoring + gap reports — but Q&A alone is a race to zero. |
| AI receptionist / answering | Smith.ai, Goodcall | $79–$300+/mo | Books, routes, notifies, often voice + human fallback | The price tier Sona aspires to. Sona does book/notify/capture in chat, but not voice — a gap for phone-first verticals. |

**Where Sona's angle wins:**
- **"Trained on your site in 30s, no calls, honest pricing"** is a genuinely sharp self-serve wedge. The auto-demo (paste URL → live bot) is a better *first impression* than most competitors' signup-walled demos.
- **Multi-channel speed-to-lead** (instant email **and** SMS **and** webhook on capture) is closer to the receptionist tier than to the cheap-chatbot tier — and is the feature that justifies pricing above commodity Q&A.
- **Honest grounding** (`[UNSURE]` + "answers only from your pages") is a trust differentiator buyers increasingly screen for.

**Where the gaps are:**
- **No voice.** Competitors at the $79–$300 tier often answer the phone. Sona is web-only; fine for the stated ICP but caps positioning against "AI receptionist."
- **Pricing-vs-value proof.** The landing leans on outcome language; competitors show ROI calculators. The `lead_value`/`estimatedPipeline` data already exists — surface it as social proof.
- **Distribution.** The GTM research is explicit that self-serve + paid ads fail at this ACV (CAC ~$1,200). Sona's *product* is self-serve (good) but its *acquisition* still needs the build-the-demo-first outreach motion or agency channel — the code can't fully substitute for that.

---

## 6. RISKS & UNKNOWNS

| Risk | Detail | Mitigation |
|---|---|---|
| **LLM cost vs. plan margin** | Gemini 2.5 Flash + free embeddings keep marginal cost low today, but every `answer()` call does: embed query + embed lead-scoring + a generate, and lead scoring fires a **second** LLM call on every contact match. At Business-tier 20k conversations, per-conversation cost compounds. No per-tenant cost ceiling exists. | Add the per-tenant token/cost cap (Section 3). Model unit economics per plan before promoting Business heavily. |
| **Gemini free-tier data-training** | Google's free Gemini tier may train on submitted data and offers no BAA. `resolveProvider` correctly routes `pro`/`business`/`regulated` tenants to Anthropic — **but only if `ANTHROPIC_API_KEY` is set.** If it's blank in prod, paid tenants silently fall back to the training-eligible free tier. | Make `ANTHROPIC_API_KEY` a launch requirement; fail loudly (or block paid signup) if a paid tenant would route to free Gemini. Document the data-handling split in the Privacy Policy (B2). |
| **GDPR data residency** | Supabase region and Gemini/Anthropic processing location are unstated. EU SMB visitors' PII may transit/store outside the EU. | Pick an EU Supabase region (or state residency clearly), list sub-processors, and offer SCCs in the DPA. |
| **Support load under zero-touch** | "No calls ever" means **every** confusing moment must be self-served or it becomes silent churn. Failed embeddings, spam-foldered alerts, and webhook errors are all invisible to the user today. | Error monitoring (B8), failed-embedding status (Section 3), deliverability (B7), and a self-serve help/FAQ surface are the substitutes for a support team. |
| **In-memory state across replicas** | `rateLimit()` and any abuse counters live in a per-process `Map`. Scaling to >1 instance (or any restart) silently weakens rate-limiting and demo caps. | Move durable counters to the DB or edge (Section 3). Run single-instance at launch if simpler. |
| **Demo namespace pollution** | Unbounded `demo-*` tenants accumulate chunks forever (B4), bloating the DB and ivfflat index, degrading retrieval for everyone. | TTL cleanup cron for demo tenants (part of B4). |

---

## 7. Recommended Sequence

1. **Today (founder, ~1 hr):** B1 rotate all secrets · B6 create Stripe products + activate account · B7 verify Resend domain (SPF/DKIM).
2. **This week (code, ~1–2 days):** B4 demo cost caps + TTL cleanup · B2/B3 Privacy + ToS + cookie stance pages · B8 Sentry · ensure `ANTHROPIC_API_KEY` gating for paid tenants.
3. **Deploy (founder + code):** B5 deploy + domain + Stripe webhook + Supabase redirect allow-list · uptime + analytics.
4. **Week 2 (code):** Onboarding email sequence · weekly digest · annual plans · multi-page crawl + OG image.

Everything in steps 2 and 4 reuses helpers already in the codebase (`tenantStats`, `ingestSite`, `notifyLead`, Resend client, `PLAN_LIMITS`) — the lift is wiring, not new architecture.
