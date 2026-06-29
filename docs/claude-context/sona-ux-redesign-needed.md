---
name: sona-ux-redesign-needed
description: User found the Sona dashboard/onboarding confusing + ugly — needs a guided, non-technical redesign before it's sellable
metadata:
  node_type: memory
  type: feedback
  originSessionId: c6331d5e-3e12-4762-a7e9-7b925cf204fa
---

The current Sona dashboard (`src/dashboard.ts`) is a functional MVP but the UX is developer-centric and the user (the buyer-proxy) called it "absolutely horrendous, makes no sense to set up or use."

**Why:** Product targets non-technical local-service SMBs. If onboarding confuses the founder, it loses every customer. UX = the product here.

**Concrete problems:** (1) users must type slugs into URLs and see raw "invalid tenant"/404 errors; (2) no guided onboarding — dumps into tabs; (3) testing the bot requires finding `/demo/<slug>`; (4) bare visual styling.

**How to apply / target redesign:** guided first-run (paste website → auto-ingest + auto-brand → live preview of the working bot, no slugs/URLs ever); embed the widget preview INSIDE the dashboard (kill the separate /demo page as the test path); polished styling; plain-English errors + empty states. This is the next priority AHEAD of Stripe billing — a beautiful onboarding is also the demo-led sales weapon. See [[sona-build-state]] and the deep-research compendium's UX section. Likely use superpowers:frontend-design / brainstorming for the redesign.
