---
name: venture-ai-website-assistant
description: What the venture/ project is and how to run the product locally
metadata: 
  node_type: memory
  type: project
  originSessionId: a8f5d3ae-90ea-4582-bcc1-17d0353d38a7
---

`C:\Users\Daniel\Desktop\venture` = a go-to-market venture for an **AI Website Assistant**: a multi-tenant RAG support/lead-capture chatbot sold to small businesses (see `GO-PACK.md` for offer/pricing/outreach). The actual product is in `product/`: Bun + Hono + Supabase (pgvector) + Gemini/Anthropic. `digital/` and `sales/` are empty placeholders.

Run (per `product/RUN.md`): `bun install`, fill `product/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY` — all free tiers; run `schema.sql` in Supabase first), then `bun dev`.

**Gotchas:**
- Port 3000 is already taken locally by an unrelated Next.js dev server — run the product on another port, e.g. `PORT=3457 bun dev`.
- Blank `.env` makes ingest/chat crash with `supabaseUrl is required` (Supabase client built lazily, so the server still boots and `GET /` works).
- Project is Bun-native; type-checking needs `tsconfig.json` + `@types/bun` + `typescript` (added 2026-06-24). Verify with `bun run typecheck`.
