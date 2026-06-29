# Sona eval pipeline — checkpoint (2026-06-29)

Safe to compact / restart. Build typechecks clean. No half-applied behaviour changes.

## Where we are
- 10 ICP demo verticals (small independent local UK businesses), 492 golden questions (395 answerable + 97 control), all grounded (`bun run validate` → 0 ungrounded).
- **Fair LLM-judge recall: 94%** (370/395, ttype-judged) — GATE PASSED. False-esc 3%, controls 90/97 (93%), halluc 7 (~1.8%). Baseline was 59%; was stuck 86–89% before taskType.
- Laggards now all in-gate: vets 95% (was 74–79%), dental 91% (was 80–84%). Lowest is electricians 88%.

## Scorecards (product/scripts/eval-results/)
baseline.json (59%) → fix2-hybrid (70) → fix3-context (75) → fix4-facts/fix4-judged (89 judged) → fix5 (reverted) → final-judged (86). Use `*-judged` (LLM grader) as the fair numbers.

## Live code state (product/src/lib.ts) — all KEPT & working
- Hybrid retrieval in `retrieveScored` (keyword rescue of sub-floor chunks + whole-corpus pool).
- `answer()`: retrieve k=8; "be specific" prompt line; STRICT [UNSURE] escalation (softening was tried twice and reverted).
- Crawler: JS-render fallback via Jina (`renderViaReader`/`renderedLinks`), SSRF guard, fact-extraction preserves original HTML.
- Facts populated for all 10 tenants (rows created via `scripts/prime-facts.ts`).
- `embed(text, taskType?)` — NEW optional param, currently INERT (no caller passes it yet).

## DONE — embedding taskType lever (the 86→94% jump)
All shipped & working in product/src/lib.ts:
1. `retrieveScored`: `embed(query, "RETRIEVAL_QUERY")`. DONE.
2. `ingestUrl`: chunk `embed(content, "RETRIEVAL_DOCUMENT")`. DONE.
3. `scripts/re-embed-chunks.ts` (paginated, EMBED_CONCURRENCY=8): re-embedded 941 chunks (NOT ~500 — corpus bigger), 0 failed, in place, no re-chunk. DONE.
4. `bun run scripts/eval.ts ttype-judged --judge` → 94%, $0.37, 142s. Result: scripts/eval-results/ttype-judged.json. DONE.
5. RELEVANCE_FLOOR LEFT at 0.55 — 94% is comfortably in gate; raising it risks recall for marginal halluc gain. Optional future lever, not pulled.

## NEXT (resume here) — back to product/demo work (was gated behind eval)
Eval gate is cleared. Move to tasks #10/#11 below.

## Other open work (tasks #10, #11)
- Demo/widget visibly proves site-knowledge (live hours badge + facts) — all 4 feature groups approved, build as ONE integrated design, AFTER eval. See memory demo-proves-site-knowledge.
- Wire ICP gate into prospect-finder + onboarding (front+back).

## New scripts added this session
validate-golden.ts, purge-junk.ts, delete-tenants.ts, prime-facts.ts, inspect-replies.ts (temp). package.json: eval/validate/reprime/corpus. eval.ts: parallel (EVAL_CONCURRENCY=8) + `--judge`.

Session cost reached ~$270.
