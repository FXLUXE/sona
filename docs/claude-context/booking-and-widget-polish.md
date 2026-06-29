---
name: booking-and-widget-polish
description: "In-widget booking calendar (tier-1) + widget UI/UX polish built 2026-06-29 — overlay flow, aurora backdrop, homepage fonts, fixes"
metadata: 
  node_type: memory
  type: project
  originSessionId: a0c34744-74fa-41da-a24c-63bc3ac5a29f
---

Built the **in-widget booking epic tier-1** ("request a time") + a big round of widget UI/UX polish in `product/src/index.ts` `widgetJs()`. All verified live in Chrome on the richardward floating widget. Backend (`/api/book` → `recordBooking` → notifies owner) already existed; this was the front-end + wiring. Ties to [[demo-proves-site-knowledge]] and [[sona-build-state]].

**Booking flow (DONE):** dedicated full-panel **overlay** (`.sona-bkview`, brand header + back arrow), NOT an inline chat bubble. **Stepped wizard** day → time → details so each screen fits with NO scroll: (1) horizontal day strip (next 14 days, closed days disabled via `slotsFor`/`parseHours`, past-today filtered); (2) time grid grouped into **Morning/Afternoon/Evening segmented tabs** (caps slot count so a 9–7 salon never overflows); (3) details step = summary card (Edit) + name + email + reassurance line, pinned footer "Request appointment". Success = brand-circle ✓ + serif "Request sent" + Done. Slots derived from real opening hours but framed as a **request** (no live availability → no double-booking). Tenants with a real `calLink` also get "Or book on our own page →". Triggers: header **Book** button, the "How do I book" chip, AND **auto-opens when the user asks to book in chat** (`/\b(book|booking|appointment|appt|reserve|reservation|schedule)\b/i` short-circuits BEFORE the LLM so it never replies "leave your contact info"). New widget flag `BOOKON` (`!!t.booking_enabled`) passed separately from `book` (calLink).

**Widget polish (DONE, same session):**
- **Fonts now match the homepage** ([[doc-format-standard]] aside): import **Fraunces (display) + Inter (body)** via Google Fonts `@import`; root + embed use Inter; headings/success use Fraunces; uppercase micro-labels (`.sona-kbcap`, `.sona-bksec`, `.sona-bklab`) use the homepage **mono** stack (`ui-monospace,"SF Mono",…`) with wide tracking. Daniel: "same font we have on our homepage everywhere."
- **Aurora backdrop** (Daniel picked "Aurora glow" over lines/functional): shared `.sona-aura` layer = 3 soft drifting brand/accent colour blooms (`SEC`/`ACC`) + bottom wash, RM-gated, subtle per [[demo-animation-subtle]]. Used in BOTH the booking overlay AND behind the **chat** messages (`.sona-aurachat`, floating only; embed keeps its richer backdrop). Industry/motif now derived cheaply for the FLOATING widget too (from name/slug/facts, no extra DB) — `detectIndustry` always runs, `MOTIF` always passed.
- **Greeting fix:** "Ask us anything" was a weird assistant bubble → now it's the **input placeholder** ("Ask us anything…"); the greeting bubble is a proper sentence ("Hi! I'm {name}'s assistant — I've just read the whole website, so ask me anything below.").
- **Book button redesigned:** was a weak ghost outline → now a white filled pill + calendar SVG icon on the brand header.
- **Logo blank-box bug FIXED:** the fallback bell rendered white-on-white (inherited header `ON`). Fix: `.sona-ava svg{color:C}` + `onerror`/blank-load → bell fallback (chat + booking headers). richardward demo has no usable logo so the brand bell shows (correct).
- **Spacing:** more room between the "HERE'S WHAT I ALREADY KNOW" pills and the suggestion chips.
- **Scrollbars hidden** in the booking steps (`.sona-bkvb`, `.sona-bkdays`) — a visible bar read as the "old scrolly" look.

**How to apply / enhancement:** booking + aurora are eval-neutral (UI only). Industry detection for floating is name/facts-based (defaults to elegant "ai" waves/blue aurora when unsure, e.g. richardward → ai not beauty). **Enhancement worth doing:** persist detected industry on the tenant at ingest (e.g. `facts.__industry`) so the floating widget themes the aurora accurately off real site content with zero per-load cost.

**STILL PENDING (Daniel's locked order):** (1) **#2 ICP gate** — filter national chains/franchises out of the prospect-finder (`src/prospects.ts findProspects`): strongest free signal = OSM `brand`/`brand:wikidata` tag (independents rarely set it) + a known-chain name regex; add `skippedChain` to FindResult + a front-end note in the dashboard finder UI. Onboarding-side gate strictness (hard-block vs soft-warn) is an OPEN MCQ for Daniel. (2) **250-point error sweep** across all 3 demo sites + widget + email + front/back end, as a marked-off task list.
