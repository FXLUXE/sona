# Sona — Security & Bug-Fix Remediation Log

| | |
|---|---|
| **Project** | Sona — multi-tenant RAG chat widget |
| **Document** | Security + correctness remediation (audit wave 1) |
| **Date** | 2026-06-24 |
| **Status** | ✅ Fixed & verified (typecheck green, boot probed) — deferred items listed |
| **Author** | Sona build session (two audit subagents + fixes) |

---

## Table of Contents

1. [Summary](#1-summary)
2. [Fixed This Wave](#2-fixed-this-wave)
3. [Verification](#3-verification)
4. [Deferred — Needs a Migration or Design Call](#4-deferred--needs-a-migration-or-design-call)

---

## 1. Summary

Two audit agents (security + correctness) reviewed `lib.ts`, `index.ts`, `dashboard.ts`,
`schema.sql`, and `scripts/`. They surfaced 5 critical security holes and several real
correctness bugs. The verified, low-risk fixes are now applied. Items requiring a
database migration or a product-design decision are deferred and listed in §4 —
**no schema changes were made without sign-off.**

> Before these fixes, three public endpoints were exploitable with a single `curl`,
> and `ingestUrl` was a working SSRF/open-proxy. Those are closed.

---

## 2. Fixed This Wave

### Security

| ID | Issue | Fix |
|----|-------|-----|
| P0-1 | `/api/ingest` unauthenticated — anyone could poison any tenant's RAG corpus | Now gated by `requireMember` (401/403) |
| P0-2 | SSRF — `ingestUrl`/`ingestSite`/`fetchText` fetched any URL (cloud metadata, localhost, `file://`) | New `safeFetch`: https/http only, blocks private/loopback/link-local IPs **after DNS resolution**, re-validates every redirect hop, 10s timeout |
| P0-3 | `/api/stats` unauthenticated — leaked any tenant's analytics | Now gated by `requireMember` |
| P0-5 | Reflected XSS in `/demo/:tenant` (Hono `c.html` doesn't escape) | Slug constrained to `^[a-z0-9-]{2,40}$`; query param `encodeURIComponent`'d |
| P1-1 | `system_extra` (tenant JSONB) injected verbatim into the LLM system prompt | `sanitize()` + 2000-char cap |
| P0-3* | `calLink` (tenant JSONB) injected unsanitized into system prompt — prompt-injection vector | Validated against `^https://…` before use; non-strings dropped |
| P1-4 | `/api/book` unauthenticated → inbox spam + tenant enumeration | Per-IP rate-limit (5/min), email-format + tenant-existence checks |
| P1-7 | Lead data unescaped in notification email HTML | New `escHtml()` applied to every interpolated field |
| P0-4 | `claimTenant` ownership-takeover race | Atomic conditional update (`owner_id IS NULL`), re-check on lost race |
| P2-3 | No CSP on `/dashboard` | CSP + `X-Frame-Options` + `nosniff`; `connect-src` limited to self + Supabase (blocks token exfil) |

### Correctness

| ID | Issue | Fix |
|----|-------|-----|
| P0-1 | Non-null assertion on conversation insert silently corrupted rows on failure | Throws on `error`/null instead of `c!.id` |
| P0-2 | Quota-exceeded returned HTTP **200** | Now returns **429** |
| P1-6 | Duplicate lead row + notify email on every message containing the email | Dedup check per `(conversation_id, email/phone)` before insert |
| P1-7 | In-memory rate-limiter grew unbounded (slow leak) | Opportunistic eviction of stale entries above 5k keys |
| P1-4 | `ingestSite` fetched every page twice | Pre-fetched HTML threaded into `ingestUrl` |

---

## 3. Verification

- `bun run typecheck` → **rc=0** (clean).
- Boot probe on a clean port:

| Route | Expected | Result |
|-------|---------:|-------:|
| `/` | 200 | ✅ |
| `/demo/demo` | 200 | ✅ |
| `/demo/<script>` | 400 | ✅ |
| `/api/stats` (no auth) | 401 | ✅ |
| `/api/ingest` (no auth) | 401 | ✅ |
| `/dashboard` CSP header | present | ✅ |

---

## 4. Deferred — Needs a Migration or Design Call

> Not bugs left unfixed — each needs either a DB migration or a product decision,
> so they're queued rather than applied silently.

| ID | Issue | Why deferred | Proposed fix |
|----|-------|--------------|--------------|
| P1-1 (corr) | Race: two simultaneous first messages create two conversations | Needs a DB migration | Unique constraint on `conversations(tenant, session_id)` + upsert |
| P1-2 (corr) | Source attribution returns *all* tenant docs, not the matched ones | Needs RPC change | Return `document_id` from `match_chunks`, join back |
| P2-8 (sec) | `usage_events` + `feedback` have no RLS policies | Needs a migration | `enable row level security` + `is_member()` policies |
| P2-4 (sec) | Quota bypass — client-supplied `sessionId` trusted as proof of session | Design change | Server-issued signed (HMAC/JWT) session IDs |
| P1-2 (sec) | Prompt-injection: RAG content sits inside the system block | Behavior change, needs eval | Move retrieved context into the user turn / structured untrusted wrapper |
| P0-4 (sec) | A tenant that already has real visitor data is still claimable by the first registrant | Conflicts with demo-led GTM (we pre-build on prospect sites) | Claim-token bound to demo creation, or owner-verification step |
| P2-5 (sec) | `/api/config` serves the anon key to any origin | Low risk (key is public by design) | Restrict CORS to the dashboard origin |
| P2-1 (perf) | `sb()` creates a new Supabase client per call | Perf only | Shared singleton client |
