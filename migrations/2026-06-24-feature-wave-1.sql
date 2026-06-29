-- Sona — Feature Wave 1 migration (2026-06-24)
-- Review before running against Supabase. Safe to run once; uses IF NOT EXISTS guards.
-- Batches the new feature columns with the deferred security fixes from the audit.

-- 1. Speed-to-lead + model-safety columns on tenants -------------------------
alter table tenants add column if not exists lead_notify_sms     text;   -- E.164 phone for Twilio SMS alerts
alter table tenants add column if not exists lead_notify_webhook text;   -- https URL, POSTed on lead.captured
alter table tenants add column if not exists regulated           boolean not null default false; -- forces non-training model path
alter table tenants add column if not exists facts               jsonb;  -- curated key facts (hours/address/pricing) always injected as grounding
alter table tenants add column if not exists lead_value          numeric not null default 0; -- $ value per lead, drives ROI/Est. pipeline

-- 2. Conversation race fix (audit P1-1) -------------------------------------
-- NOTE: if duplicate (tenant, session_id) rows already exist this will fail —
-- dedupe first, then create. Safe on a clean DB.
create unique index if not exists conversations_tenant_session_uniq
  on conversations (tenant, session_id)
  where session_id is not null;

-- 3. RLS on previously-unprotected tables (audit P2-8) ----------------------
alter table usage_events enable row level security;
alter table feedback     enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'usage_events' and policyname = 'usage_events_member') then
    create policy usage_events_member on usage_events
      for all using (is_member(tenant)) with check (is_member(tenant));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'feedback' and policyname = 'feedback_member') then
    create policy feedback_member on feedback
      for all using (is_member(tenant)) with check (is_member(tenant));
  end if;
end $$;

-- 4. Helpful index for lead dedup lookups (per-conversation contact check) ---
create index if not exists leads_conversation_idx on leads (conversation_id);
