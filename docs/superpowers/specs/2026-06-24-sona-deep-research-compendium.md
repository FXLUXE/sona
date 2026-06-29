# Sona — Deep Research Compendium

| | |
|---|---|
| **Project** | Sona — multi-tenant RAG chat widget for SMB websites |
| **Document** | Deep Research Compendium (synthesis of 19 research waves) |
| **Date** | 2026-06-24 |
| **Status** | 📋 Reference — strategy input for roadmap & specs |
| **Author** | Deep-research synthesis |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product & Features](#2-product--features)
3. [Look & Feel](#3-look--feel)
4. [Security & Trust](#4-security--trust)
5. [Verticals](#5-verticals)
6. [Consolidated Feature Backlog](#6-consolidated-feature-backlog)
7. [Security Hardening Checklist](#7-security-hardening-checklist)
8. [UX / Look Recommendations](#8-ux--look-recommendations)
9. [Per-Vertical Quick Reference](#9-per-vertical-quick-reference)
10. [Recommended Next 3 Builds](#10-recommended-next-3-builds)
11. [Sources](#11-sources)

---

## 1. Executive Summary

Sona's chatbot is a commodity; its moat is everything *around* the bot — the
conversion playbook, the speed-to-lead pipe, the trust/compliance posture, and
the vertical depth. Nineteen research waves converge on a consistent story: the
business an SMB owner is actually buying is **"a qualified, booked lead in the
system I already work out of, in under 60 seconds, 24/7"** — not "an AI chatbot."

> The defensible product is the **packaged conversion + revenue loop**, not the
> LLM. Anyone can wire OpenAI to a bubble; almost no one ships vertical-tuned
> conversion flows, compliant multichannel follow-up, denial-of-wallet
> protection, and a BAA-backed model path at a self-serve SMB price.

The 5–7 highest-leverage moves across all waves:

1. **Speed-to-lead instant routing.** The single strongest, cheapest ROI lever
   in every wave: a 5-minute response converts ~21–100x better. Fire SMS + email
   + webhook the instant a lead is captured.

2. **Fix the model-path landmine.** Free-tier Gemini trains on submitted data and
   is not BAA-eligible — any clinic/law-firm tenant on it is a live GDPR/HIPAA
   violation. This blocks the two highest-value verticals and must be fixed first.

3. **Denial-of-wallet / abuse controls.** The public widget calls paid tokens;
   token "freeloaders" and drain bots are an existential margin and uptime risk.
   Per-tenant USD budgets, hard output-token caps, and a kill-switch are
   prerequisites for safely running free-tier models at scale.

4. **Value-first, intent-triggered lead capture.** Answer first, ask for contact
   *after* delivering value, one field at a time. Conversational capture converts
   ~10–20% vs ~2–3% for static forms; gating chat behind a form destroys it.

5. **Native CRM/booking write-back + in-chat booking.** "Captured a lead" is weak;
   "booked an appointment into your Jobber/Clio/Calendar" is what SMBs pay for and
   what creates switching cost. Deposits/no-show fees cut no-shows 40–70%.

6. **Compliance as the moat, not a checkbox.** DPA + BAA + in-chat granular consent
   logging + embedding-aware deletion turns Sona's weakest dimension (thin moat)
   into its strongest sales narrative for regulated verticals.

7. **Vertical conversion templates.** Dental/medical, legal, trades, salon presets
   (starter chips → qualify → book → escalate) are exactly what a raw-OpenAI clone
   cannot reproduce quickly. Ship 4 verticals.

---

## 2. Product & Features

This group spans conversational UX, lead-capture mechanics, booking, RAG answer
quality, analytics/ROI, multichannel follow-up, CRM integration, and voice.

**Conversion is an interaction-design problem, not a model problem.** Proactive
(context-triggered, opt-in) chat roughly 7x's ROI versus reactive, but 55% of
users dismiss interrupting popups — so the winning default is *answer-first,
intent-triggered nudge, value-first capture*, never a timed auto-open. Tap-to-answer
starter chips routinely exceed 40% CTR and prevent dead-ends on mobile. A typing
indicator plus a short dynamic delay measurably raises perceived humanness. A
visible human-handoff escape hatch is table stakes (~80% will only trust a bot if
a human option exists).

**Lead capture must be value-first and progressive.** Never gate the chat; let the
bot answer, then request one field at a time, timed to a buy-signal keyword. Speed-
to-lead is the hard ROI multiplier — instant SMS + email routing is the cheapest
feature to build with the strongest cited payback.

**Booking is the conversion event SMBs actually pay for.** Native in-chat slot
selection (build on Cal.com Atoms/API; keep a Calendly-link fallback) plus
Stripe deposit/no-show-fee capture is the wedge and the ROI headline. Always
*reserve the slot before taking payment* to avoid double-booking a single
receptionist's calendar.

**RAG answer quality is where trust lives.** The buy-trigger for regulated SMBs is
"it will never invent a price/hour/policy." The proven stack: contextual chunk
prefixing + hybrid (pgvector + BM25) + a reranker (49–67% fewer retrieval
failures), a deterministic structured-facts layer for hours/prices/policies, a
**grounded-or-escalate** guarantee (a refused answer becomes a captured lead),
claim-to-evidence citation verification, and a freshness engine so stale
embeddings never silently serve last quarter's pricing.

**Analytics is the product's proof-of-value.** Reframe the dashboard around the
lead/revenue funnel, not support deflection. A single auto-calculated ROI headline
tile ("Sona generated ~$4,200 in pipeline this month for $49") plus a money-framed
weekly digest email are the strongest retention levers — users who can't articulate
ROI churn first.

**Multichannel follow-up converts Sona from a bubble into a revenue tool**, but
SMS is a compliance minefield (A2P 10DLC mandatory; TCPA $500–1,500/message).
Ship instant RAG-grounded *email* follow-up first (no registration), then gate
*done-for-you compliant SMS/WhatsApp* behind a paid tier — owning the
Twilio/Meta relationship and 10DLC registration is the real moat.

**CRM integration is the pipe that is the moat.** GoHighLevel/LeadConnector is the
center of gravity for the niche (and the agency reseller channel); HubSpot, Jobber,
ServiceTitan, Clio, and PMS systems follow. Native two-way push with a visible
**delivery log** ("lead never lost") beats the Zapier fragility SMBs distrust.

**Voice is the natural 3–5x ACV expansion** (missed-call-text-back → after-hours
voice answering → HIPAA/PMS depth), reusing Sona's existing RAG + booking. Don't
build STT/TTS in-house — wrap Vapi/Retell; the moat is the unified
chat+voice+SMS loop, one inbox, one calendar, one lead score.

---

## 3. Look & Feel

This group covers premium widget visual design/theming and mobile UX +
accessibility.

The widget **is** the product the owner judges in the first 30 seconds and the
only surface a visitor ever sees, so a credible premium look plus one-click
theming is a direct buy-trigger. The 2025–26 premium language has converged:
a value-stated launcher (not "Chat with us"), soft-rounded panels with light
shadows and generous spacing, brand-color theming with **auto-import from the
domain** (Sona already crawls the site — derive palette + logo for free),
optional dark mode, avatars, smooth open animation, and a typing indicator.
White-label ("remove Sona branding") is a proven paid upsell for professional
buyers. Proactive nudges must have frequency caps and "never re-prompt after
close" as hard invariants.

The most common, conversion-killing bugs are **mobile-specific**: the iOS keyboard
covering the input, auto-zoom on focus (any input < 16px), and a launcher fighting
sticky call/checkout buttons. On accessibility, WCAG 2.2 AA (the version
procurement and ADA litigation now reference) adds target-size 24px, focus-not-
obscured, and dragging-alternative criteria that most SMB-tier widgets do not
advertise. A mobile-bulletproof, WCAG-2.2-AA widget with a published VPAT is a
genuine, sellable wedge for the law-firm/medical/dental niche.

---

## 4. Security & Trust

This group spans web/widget security, prompt-injection & LLM abuse defense,
compliance (GDPR/CCPA/HIPAA), and anti-abuse / token-cost control.

Sona ships JavaScript into thousands of sites and handles visitor PII plus an LLM
that costs real money per call — a single bug becomes a multi-tenant incident.
Security is the product's liability surface **and** a concrete sales differentiator.

The competitor gold standard (Drift, Intercom) is a **cross-origin sandboxed
iframe** served from a Sona-owned domain, so third-party code can never touch the
host DOM/cookies — the foundation for nearly every other control. The newest,
most under-defended threats specific to AI widgets are **prompt-injection
exfiltration** (OWASP LLM01, in 73% of audited deployments — and Sona's RAG-over-
crawled-content design means the customer's own site is an untrusted input) and
**denial-of-wallet** token abuse (OWASP LLM10; real incidents of $46k/day,
$82k/48h). Public embed keys can't be secret, so bind each key to a verified
domain and exchange it server-side for a short-lived signed session token.

On compliance, the **free-Gemini training/no-BAA path is a self-inflicted landmine**
that must be fixed before selling to any clinic/law firm. The defensible posture is
"vertical-compliant lead capture": signed DPA + BAA-backed model path, in-chat
**granular consent with immutable verbatim logs** (the one feature even Intercom/Ada
do poorly), one-click **embedding-aware** data export/delete (embeddings are PII),
configurable retention, and AI-disclosure by default (EU AI Act Art. 50, Aug 2026).

On cost control, unit-economics IS part of the moat: it lets Sona run free-tier
models on flat, predictable pricing while competitors meter every message. The
survival kit is hard output/input token caps, per-tenant USD budgets + kill-switch,
token-aware rate limits, server-side key isolation, an invisible bot challenge
(Cloudflare Turnstile), provider-native + semantic caching (60–80% savings), and a
quality-aware cheap-vs-premium model router.

---

## 5. Verticals

Four research waves went deep on dental/medical, legal, trades/home-services, and
the cross-cutting niche framing.

**Dental/medical** is the best beachhead on raw ROI math (missed/after-hours
inquiries cost $100K–$140K/yr; new-patient LTV ~$6,700) — but HIPAA is a hard gate
Sona's current stack fails. Win on real-time bookable scheduling (only 26% of
practices offer it vs 77% patient demand), a credible BAA, and insurance/"do you
take my plan" FAQs.

**Legal** has the highest-value cases ($15K–$75K PI cases; $468/signed-case CAC)
but is the most rules-bound: ABA Rules 7.1/7.3/1.6/1.18/5.5 require disclaimers,
a no-legal-advice/UPL guardrail, conflict pre-screening before deep fact
collection, consent logging, and Clio/Lawmatics push. Position as "compliance-first
24/7 intake," not "a cheaper chatbot." Personal injury is the beachhead.

**Trades/home-services** has enormous ROI ($45K–$120K/yr lost to missed calls) but
is **not a website-chat-first market** — leads arrive by phone, LSA, and
aggregators. Sona must become a speed-to-lead + booking layer that texts the lead
back in seconds, writes the job into Jobber/Housecall Pro/ServiceTitan, does
done-for-you A2P 10DLC, and runs after-hours emergency triage.

Across all verticals: lead with the **per-job dollar math** ("one captured
after-hours lead pays for a year of Sona"), ship channel-aware capture (phone/SMS
for trades & salons; email-or-phone for clinics/law), and add Spanish bilingual
capture early — it's cheap with the existing LLM and an under-served differentiator.

---

## 6. Consolidated Feature Backlog

De-duplicated across all waves, sorted P0 first. Effort: S (days), M (1–2 weeks),
L (multi-week).

| Feature | Why (buy-trigger / gap) | Priority | Effort |
|---|---|:--:|:--:|
| Speed-to-lead instant routing (SMS + email + webhook on capture) | 5-min response = ~21–100x conversion; the headline ROI of the whole product | **P0** | S |
| Fix model path: route all PII/regulated traffic to non-training, BAA-eligible endpoints; block free-tier Gemini per regulated tenant | Free Gemini trains on data + no BAA = live GDPR/HIPAA violation; blocks top verticals | **P0** | S |
| Denial-of-wallet guards: hard output/input token caps, per-tenant USD budget + kill-switch, token-aware rate limits | OWASP LLM10; real $46k/day–$82k/48h incidents; protects margin + uptime | **P0** | S–M |
| Value-first, intent-triggered, one-field-at-a-time capture (never gate chat) | Conversational capture ~10–20% vs ~2–3% forms; timing is the #1 lever | **P0** | M |
| Cross-origin sandboxed-iframe widget architecture (Sona-owned domain) | Closes #1 XSS/data-theft vector; competitor gold standard; foundation control | **P0** | L |
| Output/input sanitization (render as text/DOMPurify; sanitize lead fields) | Stored XSS in chat widgets is an active 2025 finding; owner-inbox is 2nd-order XSS | **P0** | S |
| Per-domain embed-key binding + short-lived signed session tokens + strict CORS | Public keys can't be secret; stops stolen-snippet abuse | **P0** | M |
| Prompt-injection / RAG isolation: delimit system vs retrieved vs user; per-tenant retrieval; output leakage filter | OWASP LLM01 (#1 risk, 73% of deployments); RAG-over-crawled-content is exposed | **P0** | M |
| Grounded-or-escalate guarantee (low-confidence → refuse + capture lead) | "Never invents your prices/hours/policies"; turns RAG risk into lead capture | **P0** | M |
| Deterministic structured-facts layer (hours/prices/address/policy) | Most-asked, most-damaging questions; vector search is too fuzzy | **P0** | M |
| Native in-chat slot picker (Cal.com Atoms; Calendly fallback) | Link-based booking loses ~60% to friction; "booked" >> "captured" | **P0** | L |
| Stripe deposit / no-show-fee capture with slot-hold-before-payment | Deposits cut no-shows 40–70%; hard ROI line; prevents double-booking | **P0** | L |
| Native CRM write-back (GoHighLevel/HubSpot; Jobber/HCP for trades; Clio for legal) + visible delivery log | Leads must land where dispatch happens; Zapier fragility is a trust gap | **P0** | M–L |
| Instant post-chat email follow-up (RAG-grounded, with booking link) | Speed-to-lead with zero SMS compliance risk; ships first | **P0** | S |
| ROI headline tile + money-framed weekly digest email | Owners pay for dollars; strongest retention lever | **P0** | M |
| Vertical conversion templates (dental/legal/trades/salon): chips, qualifiers, channel-aware ask | What a raw-OpenAI clone can't reproduce; instant value, no setup | **P0** | M |
| HIPAA-ready tier: BAA-backed org, HIPAA-eligible features only, encryption, audit logs | Hard gate for dental/medical; clean wedge vs generic widgets | **P0** | L |
| Legal compliance pack: disclaimer + consent + state ad labels + UPL refusal guardrail + conflict pre-screen | ABA gate; unsellable + risky without it; defensibility moat | **P0** | M |
| Done-for-you A2P 10DLC + TCPA-compliant opt-in/STOP/quiet-hours | Carriers block unregistered SMS since Feb 2025; $500–1,500/msg exposure | **P0** | M |
| Mobile keyboard handling (visualViewport + 100dvh) + 16px input (no auto-zoom) | Fixes #1 mobile lead-loss bug; WCAG 2.4.11; demoable on iPhone | **P0** | S |
| In-chat granular consent + immutable verbatim consent log | GDPR Art. 7; competitor gap (only Fini does it); Sona captures leads mid-chat | **P0** | M |
| One-click embedding-aware DSAR (export + erase incl. pgvector) | GDPR/CCPA delete; embeddings are PII; most widgets ignore the vector store | **P0** | M |
| Per-tenant DPA + public subprocessor/trust page | Instant procurement disqualifier without it | **P0** | S |
| Auto-brand theming at onboarding (from existing crawl) | On-brand in 30s, zero design work; matches Intercom's domain import | **P0** | M |
| Theming control panel (color, dark mode, radius, launcher, position, avatar) | Competitor parity floor; absence reads as "cheap clone" | **P0** | M |
| Value-stated launcher + welcome bubble + availability dot | Value copy lifts reach (45% vs 5%); trust cue for lead capture | **P0** | S |
| Screen-reader live transcript (role=log, aria-live) + focus contract | WCAG 2.2 SC 4.1.3/focus mgmt; required for ADA-exposed niches | **P0** | M |
| Multi-source unified lead inbox (web + LSA + Angi/Thumbtack + voice + SMS) | Web chat is only ~20–30% of trades funnel; consistency across channels | **P0** | L |
| After-hours emergency triage flow (urgency detect → escalate, never diagnose) | High-emotion, high-value moment; missed emergency call $500–$1,200 | **P0** | M |
| Human-handoff / callback escape hatch with smart escalation triggers | ~80% trust a bot only with a human option; solo-operator callback fallback | **P1** | M |
| Hybrid retrieval (pgvector + BM25) + contextual prefixing + reranker | 49–67% fewer retrieval failures; biggest evidenced quality jump | **P1** | M |
| Inline citations with claim-to-evidence verification | Avoids "citation-shaped hallucinations" competitors merely append | **P1** | M |
| Freshness engine (hash-diff re-embed, sitemap/webhook triggers, "last synced") | Stale embeddings silently serve old pricing; under-served wedge | **P1** | M |
| Answer-quality observability + one-click "verify as FAQ/structured fact" | Makes RAG visible; compounds into a per-tenant data moat | **P1** | M |
| Lead funnel + source/page attribution + hot/warm/cold distribution | Rivals show volume, not a revenue funnel tied to pages/scores | **P1** | M |
| Qualify-then-book wired to lead scoring | Protects the owner's calendar; reuses existing scoring | **P1** | M |
| Booked-revenue attribution dashboard | Renewal-justifying ROI; raises switching cost | **P1** | M |
| Multi-touch nurture sequences with vertical templates (auto-stop on book/reply) | Multi-channel lifts response ~63%; deepens switching cost | **P1** | M |
| Booking reminder + no-show recovery loop (reminders + reschedule) | Reminders cut no-shows 20–40%; hard-dollar ROI felt in week one | **P1** | M |
| WhatsApp Business API channel (24h-window aware, template library) | Dominant in many markets/clinics; differentiates vs US-only SMS tools | **P1** | L |
| Abandoned-chat recovery (gave contact, didn't book → continue thread) | Mirrors incumbent missed-call-text-back; ties to unanswered-Q data | **P1** | S |
| Proactive nudge engine (URL/scroll/exit triggers, frequency caps, suppress-on-open) | Lifts conversion 15–50%; caps prevent bounce penalty | **P1** | M |
| White-label / remove-Sona-branding paid tier | Proven monetizer + trust for law/medical buyers | **P1** | S |
| Premium motion + glass polish + WCAG contrast-aware theming | 2026 premium cues; prevents inaccessible owner color choices | **P1** | M |
| 24px target sizes + tap alternative for swipe (WCAG 2.5.7/2.5.8) | New WCAG 2.2 AA criteria; easy design-system bake-in | **P1** | S |
| Magic-link hardening (hashed single-use short-TTL tokens, redirect allowlist, rate limits) | Open-redirect/replay = full account takeover of lead inbox | **P1** | S |
| Multi-tenant isolation defense-in-depth (tenant_id on every query incl. pgvector, DISCARD ALL, CI cross-tenant tests) | RLS-only is a documented gamble; data bleed = existential | **P1** | M |
| Invisible bot challenge (Cloudflare Turnstile) gating chat start | Blocks scripted drain bots with zero friction | **P1** | M |
| Quality-aware cheap-vs-premium model router (Gemini→Anthropic on low-confidence) | 40–85% cost cut; makes flat pricing profitable | **P1** | M |
| Provider-native + semantic caching | 60–80% savings + latency win on repetitive RAG traffic | **P1** | M |
| Configurable data retention + real-time PII/PHI redaction before logging | GDPR storage-limitation/minimization; reduces breach blast-radius | **P1** | M |
| CSP & SRI kit (exact snippets per host, integrity hashes, no unsafe-inline) | Widgets routinely break customer CSP; regulated buyers enforce it | **P1** | S |
| Missed-call text-back (provisioned number, SMS via RAG, book via backend) | Cheapest entry to the phone channel; 85% never call back, 83% text back | **P1** | S |
| Bilingual (English/Spanish) auto-detect chat + SMS | Large Spanish-speaking base in trades/PI; cheap with LLM | **P1** | S |
| After-hours AI voice answering (Vapi/Retell on existing RAG + booking) | 3–5x ACV unlock; same buyer; consistent cross-channel answers | **P2** | L |
| Industry theme presets + persona/avatar layer | "Built for clinics" moment; on-brand without design work | **P2** | S |
| Cohort benchmarks + goals (multi-tenant data) | Defensibility moat a single-tenant clone can't match | **P2** | L |
| PMS/EHR write-back (Open Dental/Dentrix via NexHealth-style middleware) | Stickiest integration; removes #1 clinic objection | **P2** | L |
| Per-tenant golden-question eval harness on every resync | Catches regressions pre-complaint; QA story for sales | **P2** | M |
| Compliance dashboard / "Trust pack" (consents, DSARs, ROPA/DPIA templates) | Turns Sona into the tenant's compliance system-of-record | **P2** | M |
| Cost & savings transparency panel for owners | Converts backend controls into a visible buy-trigger | **P2** | M |
| White-label / agency reseller tier (GHL marketplace, per-location) | The niche is sold via agencies; distribution moat | **P2** | M |

---

## 7. Security Hardening Checklist

Actionable items, grouped. Treat the P0 cluster as a prerequisite before scaling
to many paid tenants.

**Architecture & embed**
- [ ] Render the widget inside a cross-origin sandboxed iframe from a Sona-owned domain (loader script only on the host page).
- [ ] Guarantee LLM/API keys never reach the browser; all calls proxy through Sona's backend.
- [ ] Bind each embed key to verified tenant domain(s); exchange server-side for a short-TTL signed, origin-locked session token. Do not trust Origin/Referer alone.
- [ ] Enforce strict CORS and per-key rate limits.

**Input / output safety**
- [ ] Render AI output and visitor messages as text (or strict DOMPurify allowlist) — never raw innerHTML.
- [ ] Sanitize/escape visitor name/email in the owner's dashboard inbox (2nd-order XSS).
- [ ] Add an injection/jailbreak classifier in the request path (Llama Prompt Guard 2 self-host or Lakera-style API); log blocked attempts per tenant.
- [ ] Treat crawled site content + uploaded docs as untrusted: strip HTML/JS, normalize zero-width/homoglyphs, flag instruction-like text at ingestion.
- [ ] Delimit/structure system prompt vs retrieved content vs user input; add an output filter that refuses to emit the system prompt or another tenant's data.

**Denial-of-wallet / abuse**
- [ ] Hard per-message output and input token caps (output ~400–600).
- [ ] Per-tenant monthly USD budget with soft alert + hard kill-switch / auto-downgrade.
- [ ] Token-aware (not just request-count) per-session and per-tenant rate limits.
- [ ] Spend-velocity circuit breaker (>~3x trailing-7-day average in 15 min → throttle + alert).
- [ ] Invisible bot challenge (Cloudflare Turnstile) before chat start.

**Multi-tenant isolation**
- [ ] Enforce tenant_id filter in every query/RPC AND in every pgvector similarity search (in addition to RLS).
- [ ] Configure poolers for session pooling with mandatory DISCARD ALL reset; patch to RLS-CVE-fixed Postgres.
- [ ] Add CI tests asserting a tenant cannot read another tenant's leads/content/embeddings.

**Auth (magic link)**
- [ ] 256-bit random tokens stored as SHA-256 hashes; raw token only in email.
- [ ] 10–15 min expiry; atomic single-use enforcement.
- [ ] httpOnly + Secure + SameSite session cookies; per-IP/per-email rate limit with backoff.
- [ ] Server-side redirect-URL allowlist (no client-supplied redirects).

**Compliance**
- [ ] Route all PII/regulated traffic through non-training, BAA-eligible endpoints; hard-block free-tier Gemini for regulated tenants.
- [ ] Per-tenant DPA + public subprocessor/trust page.
- [ ] In-chat granular consent (unchecked opt-in) with immutable verbatim consent log (text, timestamp, session, lawful basis, withdrawal events).
- [ ] One-click embedding-aware DSAR (export + hard-delete lead, transcript, and derived embeddings/chunks).
- [ ] Configurable retention TTL + real-time PII/PHI redaction before logging and before the LLM call.
- [ ] AI-disclosure line by default (EU AI Act Art. 50); CCPA GPC honoring + visible opt-out confirmation.
- [ ] HIPAA tier: separate BAA-enabled org, HIPAA-eligible features only (block web_fetch/Files/code-exec), 6-year audit logs, no PHI in tool/schema definitions.

**Process**
- [ ] Stand up a red-team regression suite (injection/jailbreak/leakage/cross-tenant) run on every prompt/model change, especially Gemini↔Anthropic swaps.
- [ ] Publish CSP snippets per host + SRI hashes; ship an async/lazy loader that doesn't block host render.

---

## 8. UX / Look Recommendations

> Ship the P0 trio first — **auto-brand theming from the existing crawl, a real
> theming panel, and a value-stated launcher + welcome bubble + availability dot.**
> Together they make Sona look credibly premium in the 30-second demo that wins
> the sale, at low effort because the crawl already exists.

- **Default to answer-first, opt-in nudge, value-first capture.** Do not ship a
  timed auto-open. Make "never re-prompt after a visitor closes the widget" and
  per-visitor frequency caps hard product invariants.

- **Make "auto-on-brand from your website" the headline differentiator.** Reuse
  the RAG crawl to pre-fill primary color, logo, and avatar; one "Looks good?"
  confirm step.

- **Bake premium defaults into the out-of-box theme** (soft rounded corners, light
  shadow, generous spacing, smooth open animation, typing indicator, optional
  glass header) so even owners who never touch settings get a top-tier look.

- **Fix mobile first, demo on a real iPhone.** visualViewport + 100dvh so the
  input is never covered; input font-size ≥ 16px (never `user-scalable=no`);
  open as a dismissible near-full-height bottom sheet; collision-aware launcher
  offset to clear sticky call/checkout buttons; respect prefers-reduced-motion.

- **Treat WCAG 2.2 AA as a sellable wedge.** Tab-focusable launcher, focus moves
  to input on open, focus trap + Esc to close, focus returns to launcher;
  role=log live transcript; 24px targets; contrast-aware theming that prevents
  inaccessible owner color choices. Publish an accessibility statement + VPAT and
  add axe-core to CI so the claim doesn't rot.

- **Add human micro-timing and a persona/availability dot** early — low effort,
  high demo-time perceived quality, and the trust cue local-service visitors need
  before leaving name + email.

- **White-label is the primary paid upgrade lever** for law/medical — the cheapest
  defensible "why pay" for buyers who won't ship a startup logo on their site.

---

## 9. Per-Vertical Quick Reference

| Vertical | Top need | ROI hook | Where to find buyers |
|---|---|---|---|
| **Dental / medical** | HIPAA-ready tier (BAA) + real-time bookable scheduling + insurance FAQ + after-hours triage | Missed/after-hours calls cost $100K–$140K/yr; new-patient LTV ~$6,700 — one after-hours patient pays for a year | Dentaltown, Group Dentistry Now, DSO communities, dental FB/IG groups; DSOs buy centrally |
| **Legal (PI-first)** | Compliance pack (disclaimer + UPL guardrail + conflict pre-screen + consent log) + Clio/Lawmatics push + Spanish intake | PI cases worth $15K–$75K; $468/signed-case CAC; 5-min response = 21x; 100% of after-hours leads missed | State-bar/ABA channels, legal marketing communities; lead with ROI + "defensible by design" |
| **Trades / home services** | Speed-to-lead text-back + CRM write-back (Jobber/HCP/ServiceTitan) + done-for-you A2P 10DLC + emergency triage | $45K–$120K/yr lost to missed calls; jobs $1.8K–$9.2K; 78% hire the first responder | Local-SEO/LSA ecosystem, contractor FB groups; sold heavily via agencies/Vendasta-style resellers |
| **Salons / general SMB** | Phone/SMS-first capture + booking + reminders + reschedule loop | After-hours capture + no-show reduction (reminders cut 20–40%) | GoHighLevel agency channel; local business directories and social |

---

## 10. Recommended Next 3 Builds

In order, with rationale. Each is scoped to be a single, well-bounded unit.

### Build 1 — Speed-to-Lead Pipe + Instant Email Follow-up + Model-Path/Abuse Floor

Bundle the cheapest, highest-ROI features with the existential prerequisites.
Instant SMS/email/webhook routing on capture is the strongest, lowest-effort ROI
story in every wave and makes the core "leads, 24/7" promise *true*. Instant
RAG-grounded email follow-up rides on it with zero SMS compliance risk. Ship it
alongside the non-negotiable safety floor — **route regulated/PII traffic off
free-tier Gemini**, **hard token caps + per-tenant USD budget + kill-switch**, and
**server-side key isolation** — because the public widget cannot be safely scaled
without them.

> Rationale: maximum ROI and demo impact for minimum effort, while removing the
> two existential risks (legal landmine + denial-of-wallet) that block both
> regulated-vertical sales and safe scaling.

### Build 2 — Trust & Answer-Quality Core (grounded-or-escalate + structured facts + consent/DSAR + sandboxed iframe)

Make Sona genuinely *safe and sellable to regulated verticals*. The grounded-or-
escalate guarantee plus a deterministic structured-facts layer kills the "it
invented my price" liability and turns refusals into captured leads. Pair with the
compliance entry ticket — per-tenant DPA, in-chat granular consent with immutable
logs, and one-click embedding-aware DSAR — and the cross-origin sandboxed-iframe
architecture that underpins the whole security story.

> Rationale: converts the thin moat into the strongest sales narrative (trust +
> compliance) and unlocks dental/medical and legal, the two highest-value niches.

### Build 3 — Booking + CRM Write-Back + ROI Dashboard

Turn "captured a lead" into "booked, attributed revenue in the system you work out
of." Native in-chat slot picker (Cal.com), Stripe deposit/no-show-fee with
slot-hold-before-payment, native CRM write-back (GoHighLevel/HubSpot first, then
Jobber/Clio) with a visible delivery log, and the money-framed ROI headline tile +
weekly digest that justify renewal.

> Rationale: this is the revenue loop and the switching-cost layer — the booked-
> revenue story horizontal chat-plus-Calendly tools cannot tell, plus the
> retention mechanism that stops budget-driven churn.

---

## 11. Sources

Grouped by theme. URLs are de-duplicated across waves.

### Conversion UX, lead capture & analytics

- https://www.giosg.com/blog/how-to-use-proactive-chat-to-convert-visitors-into-customers
- https://www.freshworks.com/live-chat/proactive-chat/
- https://which-50.com/chat-to-conversion-rate-statistics-by-industry/
- https://clutch.co/resources/fix-your-chatbot-ux
- https://www.chatbot.com/help/bot-responses/how-to-use-quick-replies/
- https://customgpt.ai/best-way-capture-email-leads-ai-chat-conversation/
- https://www.conferbot.com/blog/chatbot-vs-forms
- https://www.ideta.io/blog-posts-english/conversational-form-beats-web-form
- https://www.spurnow.com/en/blogs/how-do-chatbots-qualify-leads
- https://www.lindy.ai/blog/how-do-chatbots-qualify-leads
- https://landbot.io/blog/lead-qualification-bot
- https://sitegpt.ai/docs/features/lead-collection
- https://www.amraandelma.com/ai-chatbot-conversion-rate-statistics/
- https://aisel.aisnet.org/cgi/viewcontent.cgi?article=1007&context=sighci2018
- https://dialzara.com/blog/how-to-measure-conversational-ai-roi
- https://www.socialintents.com/blog/how-to-calculate-chatbot-roi/
- https://agentiveaiq.com/blog/how-to-measure-chatbot-performance-that-drives-roi
- https://fin.ai/learn/roi-ai-customer-service-agents-benchmarks
- https://www.tidio.com/blog/chatbot-features/
- https://caseyresponse.com/blog/lead-response-time-statistics
- https://www.digitalapplied.com/blog/speed-to-lead-response-time-benchmarks-2026-data-playbook
- https://www.sequenzy.com/for/reduce-churn

### Booking, follow-up & CRM integration

- https://www.chatbase.co/blog/book-calls-with-ai
- https://cal.com/atoms
- https://cal.com/docs/platform/atoms/booker-embed
- https://cal.com/unified
- https://www.usecarly.com/blog/cal-com-vs-calendly/
- https://curogram.com/blog/average-patient-no-show-rate
- https://www.dialoghealth.com/post/patient-no-show-statistics
- https://www.mgma.com/mgma-stat/no-show-fees-in-medical-practices-on-the-rise-to-balance-bumpy-attendance-rates
- https://verse.ai/blog/speed-to-lead-statistics
- https://martal.ca/lead-nurturing-lb/
- https://www.infobip.com/blog/tcpa-compliance-sms
- https://activeprospect.com/blog/tcpa-text-messages/
- https://sakari.io/blog/meeting-10dlc-compliance-with-opt-ins
- https://www.smsmode.com/en/whatsapp-business-api-customer-care-window-ou-templates-comment-les-utiliser/
- https://birdeye.com/tools/podium-reviews/
- https://www.gohighlevel.com/
- https://marketplace.gohighlevel.com/docs/
- https://www.kixie.com/sales-blog/speed-to-lead-response-time-statistics-that-drive-conversions/
- https://www.supportbench.com/native-integration-vs-zapier-safer-scalable/
- https://www.servicetitan.com/comparison/servicetitan-vs-jobber
- https://www.nexhealth.com/
- https://calendly.com/
- https://cal.com/

### RAG answer quality

- https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide
- https://www.analyticsvidhya.com/blog/2024/12/contextual-rag-systems-with-hybrid-search-and-reranking/
- https://app.ailog.fr/en/blog/guides/reranking
- https://zeroentropy.dev/articles/ultimate-guide-to-choosing-the-best-reranking-model-in-2025/
- https://www.firecrawl.dev/blog/best-chunking-strategies-rag
- https://medium.com/@Nexumo_/rag-grounding-11-tests-that-expose-fake-citations-30d84140831a
- https://arxiv.org/pdf/2409.11242
- https://www.evidentlyai.com/llm-guide/rag-evaluation
- https://00f.net/2025/06/04/rag/
- https://labelstud.io/blog/seven-ways-your-rag-system-could-be-failing-and-how-to-fix-them/
- https://www.ai21.com/knowledge/rag-for-structured-data/
- https://tianpan.co/blog/2026-04-10-rag-freshness-problem-stale-embeddings-silent-failure
- https://customgpt.ai/rag-data-sync/
- https://aimultiple.com/embedding-models

### Look & feel, mobile UX & accessibility

- https://www.intercom.com/help/en/articles/178-customize-the-intercom-messenger
- https://developers.intercom.com/installing-intercom/web/customization
- https://help.tidio.com/hc/en-us/articles/5398825058588-Customize-your-chat-widget
- https://alhena.ai/blog/welcome-screen-launcher-nudge-configuration/
- https://www.eesel.ai/blog/ai-chat-bubble
- https://www.jotform.com/ai/agents/best-chatbot-ui/
- https://www.pixelmatters.com/insights/8-ui-design-trends-2025
- https://botpress.com/blog/white-label-chatbot-platform
- https://dev.to/franciscomoretti/fix-mobile-keyboard-overlap-with-visualviewport-3a4a
- https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
- https://defensivecss.dev/tip/input-zoom-safari/
- https://www.w3.org/TR/WCAG22/
- https://dequeuniversity.com/resources/wcag-2.2/
- https://testparty.ai/blog/wcag-target-size-guide
- https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA23
- https://www.intercom.com/blog/messenger-accessibility/
- https://www.cognigy.com/product-updates/webchat-accessibility-wcag-best-practices
- https://threada.ai/blog/wcag-22-chat-widget-accessibility-checklist/

### Onboarding & activation

- https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework
- https://www.shno.co/marketing-statistics/saas-onboarding-statistics
- https://www.agilegrowthlabs.com/blog/user-activation-rate-benchmarks-2025/
- https://www.flowjam.com/blog/saas-onboarding-best-practices-2025-guide-checklist
- https://www.chatbase.co/changelog/elegant-new-onboarding-flow
- https://sitegpt.ai/
- https://fetchrev.com/kb/install-website-plugin-wix-wordpress-godaddy/
- https://www.baytechconsulting.com/blog/magic-links-ux-security-and-growth-impacts-for-saas-platforms-2025
- https://supertokens.com/blog/magiclinks

### Security: web/widget, prompt injection, anti-abuse

- https://devdocs.drift.com/docs/securing-drift-on-your-site-with-an-iframe
- https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy
- https://web.dev/articles/strict-csp
- https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS
- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/
- https://thehackernews.com/2025/11/researchers-find-chatgpt.html
- https://www.cio.com/article/4155404/ai-token-freeloaders-are-coming-for-your-customer-support-chatbot.html
- https://www.toxsec.com/p/denial-of-wallet
- https://handsonarchitects.com/blog/2025/denial-of-wallet-cost-aware-rate-limiting-part-2/
- https://developers.klaviyo.com/en/docs/create_public_api_key_allow_list
- https://developers.google.com/maps/api-security-best-practices
- https://guptadeepak.com/mastering-magic-link-security-a-deep-dive-for-developers/
- https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c
- https://dev.to/issuecapture/row-level-security-in-supabase-multi-tenant-saas-from-day-one-4lon
- https://www.oligo.security/academy/owasp-top-10-llm-updated-2025-examples-and-mitigation-strategies
- https://www.datadoghq.com/blog/llm-guardrails-best-practices/
- https://www.lakera.ai/lakera-guard
- https://www.wiz.io/academy/ai-security/prompt-injection-attack
- https://www.csoonline.com/article/4163888/securing-rag-pipelines-in-enterprise-saas.html
- https://aisecuritygateway.ai/blog/llm-token-budget-strategies-for-agents
- https://www.truefoundry.com/blog/rate-limiting-in-llm-gateway
- https://blog.premai.io/semantic-caching-for-llms-how-to-cut-api-bills-by-60-without-hurting-quality/
- https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models
- https://www.lmsys.org/blog/2024-07-01-routellm/
- https://www.cloudflare.com/application-services/products/turnstile/
- https://www.vicarius.io/articles/8-000-chatgpt-api-keys-exposed-across-github-production-sites

### Compliance: GDPR / CCPA / HIPAA

- https://quickchat.ai/post/gdpr-compliant-chatbot-guide
- https://www.usefini.com/guides/ai-chatbots-granular-consent-gdpr-article-7
- https://www.cda.org/newsroom/endorsed-services/ai-in-dentistry-what-are-the-hipaa-violation-risks/
- https://sitegpt.ai/blog/hipaa-compliant-ai-chatbot
- https://sitegpt.ai/blog/gdpr-compliant-chatbot-platforms
- https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention
- https://www.paubox.com/blog/anthropic-brings-claude-ai-to-healthcare-with-hipaa-tools
- https://docs.bswen.com/blog/2026-03-23-gemini-free-tier-data-privacy/
- https://docs.cloud.google.com/gemini/docs/discover/data-governance
- https://www.jacksonlewis.com/insights/navigating-california-consumer-privacy-act-30-essential-faqs-covered-businesses-including-clarifying-regulations-effective-1126
- https://cppa.ca.gov/faq.html
- https://artificialintelligenceact.eu/article/50/
- https://secureprivacy.ai/blog/ai-chatbot-data-governance-rag
- https://www.tonic.ai/blog/ensuring-data-compliance-in-ai-chatbots-rag-systems
- https://www.intercom.com/legal/data-processing-agreement

### Voice / phone receptionist expansion

- https://www.getaira.io/blog/missed-business-calls-statistics
- https://www.anthrova.com/blog/true-cost-of-missed-calls
- https://www.cmswire.com/customer-experience/chatbase-launches-voice-ai-for-phone-support/
- https://www.retellai.com/pricing
- https://superdupr.com/blog/vapi-vs-bland-vs-retell
- https://www.arini.ai/blog/small-private-dental-practices
- https://www.getprosper.ai/blog/hipaa-compliant-voice-ai-providers-healthcare-guide
- https://livekit.com/blog/handoff-pattern-voice-agents
- https://upfirst.ai/solutions/missed-call-text-back

### Verticals: dental/medical, legal, trades

- https://www.resonateapp.com/resources/missed-calls-dental-practices-statistics
- https://controxai.com/blog/dental-clinic-missed-call-solution
- https://delmain.co/blog/average-lifetime-value-dental-patient/
- https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers
- https://learn.flex.dental/real-time-scheduling-vs.-request-an-appointment
- https://www.getweave.com/ai-dental-clinic/
- https://jadafs.ada.org/article/S2772-414X(25)00001-5/fulltext
- https://rankings.io/blog/chatbot-for-lawyers/
- https://caseclerk.ai/blog/are-ai-intake-chatbots-considered-solicitation-under-aba-rule-73-ethics-requirements-for-law-firm-websites-in-2025
- https://www.texasbarpractice.com/wp-content/uploads/2025/05/Sample-Chatbot-Disclaimer-for-Law-Firm-5.27.25.pdf
- https://smith.ai/chatbot-software-comparison/smith-ai-vs-intaker
- https://www.lawmatics.com/legal-crm/conflict-check-software
- https://www.clio.com/grow/
- https://rankings.io/blog/personal-injury-lead-costs/
- https://sempull.com/blog/bilingual-legal-intake-the-complete-guide
- https://pipelineon.com/blog/ai-chatbot-for-home-service-businesses/
- https://www.callbirdai.com/blog-contractors-lose-money-missed-calls
- https://www.leadtruffle.co/
- https://help.housecallpro.com/en/articles/6060766-add-a-chat-widget-to-your-website
- https://www.podium.com/product/webchat/home_services
- https://hyperleap.ai/hvac-agents
- https://textbolt.com/blog/10dlc-compliance/
- https://www.bgcollective.com/solutions-lab/google-local-services-ads-for-remodelers-builders-the-2025-mega-guide
