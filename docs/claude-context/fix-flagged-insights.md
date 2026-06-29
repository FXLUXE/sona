---
name: fix-flagged-insights
description: "User wants flagged issues (security hook warnings, insight callouts) fixed immediately, not just noted"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c6331d5e-3e12-4762-a7e9-7b925cf204fa
---

When a security-guidance hook warning fires or an `★ Insight` surfaces a real problem, FIX it in the same turn — don't just describe it and move on.

**Why:** User said "anything you can see in the insights you should fix going forward." They treat a flagged problem as an action item, not an FYI.

**How to apply:** On the Sona/venture build this meant: XSS hook on `innerHTML` → added server-side `brand_color`/`logo_url` validation + `safeHref` scheme guard for `javascript:`/`data:` URLs; SRI hook → pinned supabase-js to exact version + computed real sha384 integrity hash. Pattern: escape/validate untrusted DB-sourced data before it hits innerHTML, pin+SRI external scripts. See [[sona-build-state]].
