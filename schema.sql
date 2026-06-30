-- Sona schema v2 — run in Supabase SQL editor. Idempotent (safe to re-run).
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ── Tenants (one per client site) ──────────────────────────────────────────
-- `slug` is the public identifier embedded in the widget (?tenant=slug).
create table if not exists tenants (
  slug         text primary key,
  name         text,
  owner_id     uuid,                       -- supabase auth.users id of creator
  api_key      text unique default encode(gen_random_bytes(24), 'hex'),
  plan         text not null default 'trial',   -- trial | starter | pro | business
  trial_ends_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id     text,
  stripe_subscription_id text,
  -- limits (null = use plan default, resolved in app)
  monthly_conversation_limit int,
  source_limit               int,
  -- bot settings (per-tenant config, edited in dashboard)
  persona      text default 'friendly',
  system_extra text,                        -- extra grounding instructions
  brand_color  text default '#111111',
  logo_url     text,
  provider     text default 'gemini',       -- gemini | anthropic (paid)
  booking_enabled boolean default false,
  booking_backend text,                     -- calcom | google | null
  booking_config  jsonb default '{}'::jsonb,
  lead_notify_email text,                    -- where instant lead emails go
  lead_webhook_url  text,
  retention_days int default 365,            -- GDPR retention for convos/leads
  created_at   timestamptz default now()
);

-- Multiple users can manage one tenant later; keeps auth join clean.
create table if not exists tenant_members (
  tenant   text references tenants(slug) on delete cascade,
  user_id  uuid not null,
  role     text default 'owner',
  primary key (tenant, user_id)
);

-- ── Content (RAG) ───────────────────────────────────────────────────────────
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  source_url text,
  title text,
  content_hash text,                         -- dedup re-ingest of same URL
  created_at timestamptz default now()
);
create unique index if not exists documents_tenant_url_idx on documents(tenant, source_url);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(768)                      -- gemini text-embedding-004
);
create index if not exists chunks_tenant_idx on chunks(tenant);
create index if not exists chunks_embedding_idx
  on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── Conversations + messages (session memory) ─────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  session_id text,                           -- visitor browser session
  page_url text,
  visitor_lang text,
  created_at timestamptz default now()
);
create index if not exists conversations_tenant_idx on conversations(tenant, created_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  tenant text not null,
  role text not null,                        -- user | assistant
  content text not null,
  created_at timestamptz default now()
);
create index if not exists messages_conv_idx on messages(conversation_id, created_at);

-- ── Leads ─────────────────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  conversation_id uuid references conversations(id) on delete set null,
  name text,
  email text,
  phone text,
  question text,
  page_url text,
  score int,                                 -- AI hot/warm/cold (0-100)
  consent boolean default false,             -- GDPR capture consent
  notified boolean default false,
  captured_at timestamptz default now()
);
create index if not exists leads_tenant_idx on leads(tenant, captured_at desc);

-- ── Smart features ───────────────────────────────────────────────────────────
create table if not exists unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  question text not null,
  conversation_id uuid references conversations(id) on delete set null,
  resolved boolean default false,
  created_at timestamptz default now()
);
create index if not exists unanswered_tenant_idx on unanswered_questions(tenant, created_at desc);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  message_id uuid references messages(id) on delete cascade,
  rating int not null,                       -- 1 = up, -1 = down
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  conversation_id uuid references conversations(id) on delete set null,
  backend text,                              -- calcom | google
  external_id text,
  name text, email text,
  start_at timestamptz,
  status text default 'booked',              -- booked | cancelled
  created_at timestamptz default now()
);

-- Usage metering for billing + quota enforcement.
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant text not null,
  kind text not null,                        -- conversation | message | ingest
  created_at timestamptz default now()
);
create index if not exists usage_tenant_idx on usage_events(tenant, created_at);

-- ── Retrieval RPC ────────────────────────────────────────────────────────────
create or replace function match_chunks(
  query_embedding vector(768), match_tenant text, match_count int
) returns table (content text, similarity float)
language sql stable as $$
  select content, 1 - (embedding <=> query_embedding) as similarity
  from chunks
  where tenant = match_tenant
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────
-- App server uses the service key (bypasses RLS). These policies protect
-- direct client access: a user only sees tenants they belong to.
alter table tenants        enable row level security;
alter table tenant_members enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table leads          enable row level security;
alter table unanswered_questions enable row level security;
alter table bookings       enable row level security;
alter table documents      enable row level security;
alter table chunks         enable row level security;
alter table feedback       enable row level security;
alter table usage_events   enable row level security;

create or replace function is_member(t text) returns boolean
language sql stable security definer as $$
  select exists(select 1 from tenant_members m where m.tenant = t and m.user_id = auth.uid());
$$;

do $$ begin
  create policy tenant_owner on tenants for all using (is_member(slug));
  create policy member_self on tenant_members for select using (user_id = auth.uid());
  create policy conv_member  on conversations for select using (is_member(tenant));
  create policy msg_member   on messages for select using (is_member(tenant));
  create policy lead_member  on leads for select using (is_member(tenant));
  create policy unans_member on unanswered_questions for select using (is_member(tenant));
  create policy book_member  on bookings for select using (is_member(tenant));
  create policy doc_member   on documents for select using (is_member(tenant));
  create policy chunk_member on chunks for select using (is_member(tenant));
  create policy usage_events_member on usage_events for all using (is_member(tenant)) with check (is_member(tenant));
  create policy feedback_member on feedback for all using (is_member(tenant)) with check (is_member(tenant));
exception when duplicate_object then null; end $$;
