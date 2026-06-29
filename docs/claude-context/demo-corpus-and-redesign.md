---
name: demo-corpus-and-redesign
description: "Why demos gave \"I'm not sure\" to every question (stripHtml JS leak) + the demo backdrop redesign (industry motif + workflow)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6583c466-e770-437d-a015-3d43fdd6fae1
---

**Root cause of "every preset question escalates":** `stripHtml` in src/lib.ts used `/<[^>]+>/` to strip tags, which stops at the first `>` — but inline JS in HTML attributes (Alpine `x-data`, arrow fns `()=>`, comparisons) contains `>`, so attribute JS leaked into chunk "content". JS-heavy sites (FTMO) ended up with a corpus of code junk → `retrieve()` 0 real hits → grounded-or-escalate fires on every question.

**Fixes shipped:**
- Quote-aware tag strip + `looksLikeCode()` chunk filter in lib.ts (drops residual JS chunks at ingest).
- `/api/suggest` now over-generates 8 candidates, validates each with `retrieve()`>0, prefers grounded, pads with other tailored candidates before generic defaults — so preset chips never all escalate.

**Smarter reader (added later):** lib.ts now (1) prioritises Contact/Services/Prices/Book pages over blog posts (`linkPriority` in `ingestSite`), (2) extracts schema.org JSON-LD structured data (`extractFacts`) → address/phone/opening_hours/price_range merged into `tenant.facts` (answers where/when/how-much even on JS-rendered sites), and (3) retrieve threshold loosened 0.6→0.55. This is the lightweight no-headless-browser version Daniel approved ("make the reader smarter"). It does NOT render JavaScript — sites that hide ALL text behind JS still come up thin; full headless rendering is the remaining heavier step if needed. Working real salon-type demo: **demo-laserclub-co-uk** (The Laser Club, Dublin) — answers location/hours/treatments from JSON-LD; booking/exact-price still escalate (behind an external booking widget). Most Wix/Squarespace salon sites returned 0 readable chunks.

**PAGE-BUILDER RECALL FIX (2026-06-26, instrumented, verified):** Biggest RAG recall bug found+fixed. `stripHtml` step 2 did `if (main && main[1].length>200) h = main[1]` — blindly kept only `<main>`/`<article>`. WordPress/Wix page-builder themes wrap just the HERO in `<main>` and lay real content in sibling `<section>`s → we threw away ~99% of text. Real salon (laserclub.co.uk WP): 515KB HTML → only **126 chars / 1 chunk** → bot said "I'm not sure" to EVERYTHING. Fix: factored tag-strip into `toText()`, compute `fullText` vs `mainText`, only trust `<main>` when `mainText.length >= fullText.length*0.5` (ratio guard, not length guard); else keep full post-boilerplate page. Also added step 0: strip `<!--...-->` comments (were leaking `-->` + commented markup). RESULT: same salon → **17KB / 42 chunks**, bot now answers services/hours/location/booking/laser-hair-removal correctly (pricing honestly escalates — not on site); Wikipedia control unchanged (no regression). This is THE fix for "demos give weak answers" since the SMB niche (salons/clinics) is overwhelmingly WP/Wix. typecheck rc=0. Diagnosed via throwaway instrumented harness (fetch→strip→chunk lengths + live retrieve sims), since deleted — lesson reaffirmed: instrument + observe, don't guess.

**IMPORTANT:** the stripHtml fix only helps NEW ingests. Demos/tenants ingested before it still have polluted corpora — they must be **re-ingested** (purge chunks+documents, call `ingestSite`). FTMO (`demo-ftmo-com`) was re-ingested + verified (returns real answers: $200k account, MT4/MT5/cTrader).

**Demo backdrop redesign (replaced the rejected og:image/grey/navy versions):** dropped blurred og:image hero entirely. Now: deep brand-shade gradient base + drifting brand-colour wash + animated CSS grid + a large **industry-specific animated SVG motif** (`detectIndustry()` → `motifFor()` in index.ts: finance=market chart, beauty=shears+sparkle, health=ECG, fitness=equalizer, food/trades/legal/auto/property/ai). Plus a continuously-animated "HOW I WORK FOR {name}" 4-step workflow in the welcome card (sequential node pulse + travelling connector dots). Verified via screenshot on FTMO. Industry detection only runs in embed mode (not on paying tenants' live widget). See [[sona-build-state]].
