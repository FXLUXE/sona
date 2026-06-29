# Product MVP — AI Website Assistant (RAG chatbot)

Goal: ingest a client's content → answer visitor questions ONLY from that content (no hallucination) → capture leads → embed on any site with one script tag. Multi-tenant from day 1 so the same build becomes the SaaS.

## Stack (best-for-job, all free tiers)
- **Next.js + TypeScript** (App Router) — API routes + widget + future dashboard. One language front-to-back.
- **Supabase** — Postgres + `pgvector` (RAG store) + Auth + Row-Level Security (multi-tenant).
- **Claude API** (`claude-haiku-4-5` for cheap answers, `claude-opus-4-8` for hard ones) — generation. Embeddings via a cheap embedding model.
- **Vercel** — host the app + widget (hobby tier).
- **Stripe** — billing (one-off + subscription) when productizing.
- Runtime: **Bun** (just installed).

## Cost: ~£0 to start. Pay-per-token LLM only. Scales with usage.

## Data model (Supabase)
- `tenants` (id, name, owner_user_id, plan, created_at)
- `documents` (id, tenant_id, source_url, title, created_at)
- `chunks` (id, tenant_id, document_id, content text, embedding vector(N))
- `leads` (id, tenant_id, name, email, question, captured_at)  ← date: ISO 8601 UTC
- `conversations` (id, tenant_id, messages jsonb, created_at)
All tenant-scoped via RLS on `tenant_id`.

## File tree (target)
```
product/
  app/
    api/chat/route.ts        # retrieve + generate + capture lead
    api/ingest/route.ts      # crawl/parse -> chunk -> embed -> store
    widget/route.ts          # serves embeddable widget.js
    dashboard/               # tenant login, sources, leads, embed snippet (SaaS phase)
  lib/
    embed.ts                 # embedding calls
    retrieve.ts              # pgvector similarity search (tenant-scoped)
    crawl.ts                 # fetch site/sitemap, strip to text
    claude.ts                # Claude API wrapper, grounded prompt
  public/widget.js           # the one-line embed (chat bubble UI)
  scripts/demo.ts            # CLI: build a demo bot for any URL (zero-proof outreach)
```

## Build order (MVP in ~1-2 focused sessions)
1. `bun create next-app product` (TS, App Router). Add Supabase + Anthropic SDKs.
2. Supabase project -> enable `pgvector` -> create tables above + RLS.
3. `crawl.ts`: given a URL, fetch page(s)/sitemap, extract clean text, chunk ~800 tokens.
4. `embed.ts` + ingest route: embed chunks, store in `chunks`.
5. `retrieve.ts`: top-k similarity search scoped to tenant.
6. `claude.ts` + chat route: grounded prompt - "Answer ONLY from CONTEXT; if not present, say you'll connect them to a human and ask for email." Capture email -> `leads`.
7. `widget.js`: floating chat bubble, posts to `/api/chat?tenant=...`. One `<script>` tag to install.
8. `scripts/demo.ts`: `bun scripts/demo.ts https://target.com` -> ingests + spins a shareable demo link for outreach Looms.

## Grounding prompt (anti-hallucination core)
System: "You are [Business]'s website assistant. Answer ONLY using the provided CONTEXT. If the answer isn't in CONTEXT, say: 'I'm not sure - leave your email and the team will reply.' Never invent facts, prices, or policies. Capture the visitor's email when they show buying intent."

## Plugin/skill assist per step
- Scaffold/UI: `nextjs-best-practices`, `frontend-design`, `shadcn`, `ui-ux-pro-max`
- DB/RAG: `supabase-automation`, `vector-database-engineer`, `embedding-strategies`, `rag-implementation`
- LLM impl/cost: `claude-api`, `llm-structured-output`
- Crawl/demo: `agent-browser`, `playwright-skill`, `web-scraper`
- Billing (SaaS phase): `stripe-integration`
- Deploy: `vercel-deployment`
- Recurring jobs (content re-sync): `schedule`, `loop`

## Productize -> SaaS (Stage C)
Add tenant signup + dashboard (paste URL -> auto-ingest -> copy embed snippet) + Stripe subscription. The DFY clients become your first paying SaaS logos.
