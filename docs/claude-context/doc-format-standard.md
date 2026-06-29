---
name: doc-format-standard
description: How the user wants specs/design docs formatted — clean, PDF-ready markdown, not cramped bullet walls
metadata:
  node_type: memory
  type: feedback
  originSessionId: c6331d5e-3e12-4762-a7e9-7b925cf204fa
---

When writing specs/design docs, format them as **clean, PDF-ready markdown**: a title metadata block (table), a Table of Contents with anchor links, `---` section dividers, real tables for structured data (pricing, endpoints, error cases), blockquotes for key callouts, and breathing room. NOT dense paragraph-and-bullet walls.

**Why:** User said "create specs and documents for me to review in better PDF format as markdown and next files are not very readable." They review specs as rendered PDF/markdown, so visual structure matters as much as content.

**How to apply:** Template = `product/docs/superpowers/specs/2026-06-24-sona-v1-monetization-design.md` (rewritten this session). Reuse its shape: header table → TOC → numbered `##` sections → tables/blockquotes → divider rules. To produce an actual PDF, render with pandoc or a markdown-to-PDF tool (offer it; don't assume it's installed). See [[sona-build-state]].
