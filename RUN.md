# Run the AI Website Assistant (£0 setup)

## One-time setup
1. Install deps: `bun install`
2. **Supabase** (free, no card) — create a project at supabase.com → SQL Editor → paste `schema.sql` → Run.
3. **Google AI Studio** (free, no card) — get a key at https://aistudio.google.com/apikey
4. `cp .env.example .env` and fill:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (Supabase → Project Settings → API → service_role key)
   - `GEMINI_API_KEY`
   - leave `LLM_PROVIDER=gemini` for free; set it to `anthropic` + add `ANTHROPIC_API_KEY` for paid quality.

## Run
- Start server: `bun dev`  (http://localhost:3000)
- Build a demo bot for any site: `bun run scripts/demo.ts https://somebusiness.com`
- Open the demo: http://localhost:3000/demo/<tenant>  → chat bubble bottom-right.

## Embed on a client site (one line)
`<script src="https://YOUR_DEPLOY_URL/widget.js?tenant=CLIENT"></script>`

## Deploy later (free): Vercel / Fly / Railway. Set the same env vars + `PUBLIC_BASE_URL` to the live URL.

## Cost: Supabase free + Gemini free = £0. Swap to Claude per paying client (pennies, priced into the job).
