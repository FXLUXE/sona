---
name: cost-tiered-models
description: "Standing rule — always split work across model tiers to keep cost down (cheap models for mechanical parts, Opus only for hard reasoning)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 81b7e395-35ce-43ea-b456-707190402229
---

Daniel wants every session to **optimise cost by tiering models**: delegate well-scoped, mechanical
parts of the work to cheaper models (Sonnet for normal edits, Haiku for trivial mechanical), and
reserve Opus (the main thread) for orchestration + genuinely hard reasoning (RAG/chat logic,
architecture, security calls). "Always do this."

**Why:** Sona sessions have repeatedly run $350–$870 (subagent + screenshot heavy). Same model for
everything is wasteful — most edits are mechanical and don't need Opus.

**How to apply:** Use the `Agent` tool with `model: "sonnet"` (or `"haiku"`) for scoped edits,
file reads/summaries, and boilerplate. Keep the hard parts on the main thread. Batch independent
delegations in one message so they run in parallel. Don't delegate so finely that orchestration
overhead exceeds the saving. Relates to [[sona-build-state]] cost flags and [[daniel-low-touch-saas]].
