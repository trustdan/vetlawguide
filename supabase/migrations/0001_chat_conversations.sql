-- VetLawGuide Grounded Chat Analytics Schema (ADR-0003 / E8-S4)
-- Modeled on WK-private-demo/supabase/schema.sql with strict Row Level Security (RLS)
-- and VetLawGuide dual-persona / point-in-time metadata columns.
-- Note: Zero vector extension needed ($0.00 local build-time hybrid retriever in lib/chat/retrieve.ts).

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  -- One UUID per browser tab/page-load of <ChatWidget />; upsert conflict target
  -- so growing multi-turn conversations update in place without clobbering prior chats.
  conversation_id uuid not null unique default gen_random_uuid(),
  -- Ephemeral conversationId by default, or consent-gated 1-year `vlg_chat_session` cookie
  -- when `hasPerformanceConsent` (`vlg_consent`) is true.
  session_id text not null,
  audience_mode text not null default 'veteran' check (audience_mode in ('veteran', 'practitioner')),
  active_decision_date date null,
  -- PII-scrubbed [{ role, content }] transcript (redactPii() applied server-side before upsert).
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_conversations_session_id_idx
  on public.chat_conversations (session_id);

create index if not exists chat_conversations_updated_at_idx
  on public.chat_conversations (updated_at desc);

-- Lock down public/anon PostgREST access completely: only server-side `service_role`
-- inside `app/api/chat/route.ts` (`after()`) can insert, update, or select rows.
alter table public.chat_conversations enable row level security;

revoke all on table public.chat_conversations from anon, authenticated;
