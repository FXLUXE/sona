# Sona V1 — Design & Monetization Spec

| | |
|---|---|
| **Project** | Sona — multi-tenant RAG chat widget for SMB websites |
| **Document** | V1 Design & Monetization Specification |
| **Date** | 2026-06-24 |
| **Status** | 🔒 Locked — ready for implementation plan |
| **Author** | Sona build session |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Locked Go-To-Market Decisions](#2-locked-go-to-market-decisions)
3. [Pricing Tiers](#3-pricing-tiers)
4. [Current Product State](#4-current-product-state)
5. [Sub-Project: Stripe Billing & Plan Enforcement](#5-sub-project-stripe-billing--plan-enforcement)
6. [Data Flow](#6-data-flow)
7. [Error Handling](#7-error-handling)
8. [Security](#8-security)
9. [Testing](#9-testing)
10. [Backlog](#10-backlog-future-specs)
11. [Out of Scope](#11-out-of-scope-yagni-for-v1)

---

## 1. Executive Summary

Sona is a **feature-complete** multi-tenant RAG chat widget: it answers visitor
questions from a business's own content, captures and scores leads, remembers
sessions, reports content gaps, and ships with a self-serve admin dashboard.

> **The one thing blocking revenue is billing.** Everything else is polish.

This spec locks the go-to-market decisions and defines a single, well-bounded
sub-project — **Stripe billing + plan enforcement** — that converts the finished
product into a paying SaaS.

---

## 2. Locked Go-To-Market Decisions

The user delegated these strategy calls ("you decide best"). They are locked.

### 2.1 V1 Niche — Local-service SMBs

Clinics, law and trades, salons, agency clients.

**Why:** simplest websites, sharpest lead-capture pain, low competition versus
ecommerce/SaaS, and the fastest willingness to pay.

> The product stays multi-tenant and generic. The niche is a **marketing focus**,
> not a code fork.

### 2.2 Value Proposition — Lead Capture

> **"Turn website visitors into leads — 24/7."**

Revenue framing outsells cost-saving for SMBs. Support-deflection and booking are
secondary bullets.

### 2.3 Onboarding — Full Self-Serve

Sign up → paste URL → copy embed snippet. Already built.

---

## 3. Pricing Tiers

Flat monthly tiers, matching `PLAN_LIMITS` already defined in `lib.ts`.

| Plan | Price | Conversations | Sources | Notable |
|------|-------|--------------:|--------:|---------|
| **Trial** | Free (14 days) | 100 | 5 | No card required |
| **Starter** | $29 / mo | 500 | 10 | — |
| **Pro** | $79 / mo | 3,000 | 50 | Anthropic model option · "Powered by Sona" removable |
| **Business** | $199 / mo | 20,000 | 500 | Multi-seat |

---

## 4. Current Product State

Built this session and verified (typecheck green, boot OK):

- Multi-tenant chat answering — `answer()`
- Lead capture, scoring, and email notification
- Session memory (persistent per-tenant session IDs)
- Content-gap report (unanswered questions)
- Booking backend — `recordBooking()`
- Per-tenant widget theming (server-validated against self-XSS)
- Self-serve `/dashboard` with Supabase magic-link auth
  (JWT verified server-side, membership re-checked per read)
- Guarded per-tenant API

---

## 5. Sub-Project: Stripe Billing & Plan Enforcement

A single, well-bounded unit that turns the finished product into a paying SaaS.

### 5.1 Components

#### `src/billing.ts` — new, framework-agnostic (like `lib.ts`)

| Function | Responsibility |
|----------|----------------|
| `createCheckout(tenant, plan)` | Build a Stripe Checkout Session (hosted, PCI-free). Returns redirect URL. Maps `plan` → Stripe price ID from env. |
| `createPortal(tenant)` | Build a Stripe Billing Portal URL (manage / cancel). |
| `handleWebhook(rawBody, sig)` | Verify signature, then on `checkout.session.completed` / `customer.subscription.updated\|deleted` set `tenants.plan`, `stripe_customer_id`, `stripe_subscription_id`. |
| `planLimits(tenant)` | Resolve the effective limits for a tenant's current plan. |

> Stripe price IDs come from env: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`,
> `STRIPE_PRICE_BUSINESS`. Webhook secret: `STRIPE_WEBHOOK_SECRET`.

#### Endpoints in `index.ts`

All guarded by `requireMember`, **except** the webhook, which is
signature-verified instead.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/t/:tenant/billing/checkout` | `{ plan }` | `{ url }` |
| `POST` | `/api/t/:tenant/billing/portal` | — | `{ url }` |
| `POST` | `/api/billing/webhook` | raw body + Stripe sig | `200` |

#### Enforcement — wired into existing paths

| Limit | Where enforced | Behaviour at cap |
|-------|----------------|------------------|
| Conversations | `overQuota()` (already exists) | Keep current behaviour |
| Sources | `ingestUrl()` / dashboard ingest | Block with **402** |
| Provider | Model selection | `anthropic` allowed only if plan ≥ Pro |
| Branding | Widget render | "Powered by Sona" shown unless plan ≥ Pro |

#### Dashboard billing tab

Current plan, usage vs. limits, **Upgrade** buttons → checkout, **Manage** → portal.

---

## 6. Data Flow

```
Dashboard "Upgrade"
        │
        ▼
checkout endpoint ──► Stripe hosted page ──► user pays
        │                                         │
        │                                         ▼
        │                                  Stripe webhook
        │                                         │
        ▼                                         ▼
limits resolve from new plan  ◄──  server flips tenants.plan
   on next request
```

> The webhook is the **single source of truth** — no polling.

---

## 7. Error Handling

| Condition | Response |
|-----------|----------|
| Missing Stripe env | `configWarnings()` adds a warning; billing endpoints return **503**. Boot never crashes. |
| Webhook signature fails | **400**, no DB write. |
| Checkout for unknown plan | **400** |
| Over source / conversation cap | **402** with an upgrade CTA in the body |

---

## 8. Security

- Webhook verified with `STRIPE_WEBHOOK_SECRET` against the **raw body**, never
  parsed JSON.
- The service key bypasses RLS, so billing endpoints are still gated by
  `requireMember`.
- The secret Stripe key is **never** exposed to the browser — only hosted
  checkout/portal URLs cross the wire.

---

## 9. Testing

- **Setup:** Stripe test-mode keys; trigger webhooks via the Stripe CLI or test
  events.
- **Unit:** `planLimits` resolution · webhook plan mapping · cap enforcement
  returns 402.
- **Manual:** full upgrade flow Trial → Starter; downgrade / cancel via portal
  reflects in the dashboard.

---

## 10. Backlog (Future Specs)

Each is a separate spec, **not** part of this one:

- Booking dashboard tab + widget CTA
- Feedback thumbs wiring
- Scheduled `resync` cron
- Agency white-label / reseller
- Analytics charts
- GDPR data-export / delete endpoints

---

## 11. Out of Scope (YAGNI for V1)

- Usage-based metering billing
- Per-lead bounty pricing
- Multi-currency
- Annual plans
- Stripe Tax
