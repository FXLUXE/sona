---
name: eval-pipeline-state
description: "Sona chatbot eval pipeline state as of 2026-06-29 — 94% recall, GATE PASSED via embedding taskType"
metadata: 
  node_type: memory
  type: project
  originSessionId: 590a389a-b8f3-461e-8dd0-367f156028fa
---

Built a grounded eval harness for Sona's chatbot across **10 ICP demo verticals** (small independent local UK businesses — see [[demo-sites-must-be-icp]]): dental (Leeds City Dental), salons (Yazz Hair), vets (Yorkshire Vets), physio (Cambridge Physio), plumbers (John Cayley), estate-agents (Bests), accountants (Crundell & Co), electricians (Excel Electrical Norwich), gyms (Movements Mkt Harborough), garages (Adderley Green). 492 golden questions (395 answerable + 97 controls), all grounded; files in `product/scripts/golden/*.json`.

**Results (fair LLM-judge grader): recall 94% (370/395, `ttype-judged`) — GATE PASSED.** False-esc 3%, controls 90/97 (93%), halluc 7 (~1.8%). Baseline 59%; was stuck 86–89% until taskType. All verticals now in-gate: vets 95% (was 74–79%), dental 91% (was 80–84%), lowest electricians 88%.

**What moved recall (kept):** (1) hybrid keyword+vector retrieval with keyword RESCUE of sub-floor chunks — the big win; (2) wider context k=8 + "be specific" prompt; (3) populated structured facts (hours/phone/address) for 7 tenants that had only chunks. **Reverted (didn't help):** escalation softening (traded controls for ~0 recall, twice). **Also added:** JS-render crawler (Jina Reader) + SSRF fix + fact-extraction bug fix; 8x faster parallel eval; `--judge` LLM grader.

**THE 86→94% WIN — embedding taskType (DONE):** `embed()` wasn't setting Gemini `taskType`, so query & doc shared a generic space → scores bunched ~0.5–0.6. Fixed: `retrieveScored` passes `"RETRIEVAL_QUERY"`, `ingestUrl` chunk embed passes `"RETRIEVAL_DOCUMENT"`; `scripts/re-embed-chunks.ts` re-embedded all 941 stored chunks (NOT ~500 — bigger corpus) in place with RETRIEVAL_DOCUMENT, 0 failed, no re-chunk (grounding intact). Eval cost $0.37 / 142s. `RELEVANCE_FLOOR` LEFT at 0.55 (in-gate, raising risks recall) — optional future lever.

**2026-06-29 re-confirm:** after adding the contact-handoff (answer() appends contact line on `unsure`), re-ran `bun run eval handoff-judged --judge` = **still 94% (370/395)**, halluc even 7→4. Eval-neutral because escalation detection keys on the `unsure` flag (eval.ts:89 `escalated = unsure || EMAIL_ASK.test(reply) || ...`), and the handoff is gated on `unsure` + keeps the email ask. See [[demo-proves-site-knowledge]].

**Eval commands:** `bun run eval <label> [--judge]`, `bun run validate`, `bun run corpus`, `bun run reprime`. Scorecards in `product/scripts/eval-results/`. Full handoff: `product/scripts/eval-results/CHECKPOINT.md`. Pending product tasks: [[demo-proves-site-knowledge]] (demo shows live hours+facts) and wiring the ICP gate into prospect-finder/onboarding.
