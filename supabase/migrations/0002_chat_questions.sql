-- VetLawGuide Flat User-Question Analytics Schema (ADR-0003 / E8-S4 Refinement)
-- Replaces conversation-level JSONB transcript upserts (`public.chat_conversations`)
-- with an append-only, 1-row-per-question table (`public.chat_questions`) storing ONLY
-- PII-scrubbed user questions (assistant responses are never persisted) plus deterministic
-- retrieval metadata for direct SQL/CSV analysis and corpus-gap prioritization.

drop table if exists public.chat_conversations;

create table if not exists public.chat_questions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  session_id text not null,
  turn_index smallint not null default 1 check (turn_index >= 1),
  audience_mode text not null default 'veteran'
    check (audience_mode in ('veteran', 'practitioner')),
  active_decision_date date null,
  question text not null,
  top_route text null,
  retrieved_count smallint not null default 0 check (retrieved_count >= 0),
  has_corpus_gap boolean not null default false,
  created_at timestamptz not null default now()
);

-- Safe idempotent upgrade if `public.chat_questions` was initially created with the 6-column core schema:
alter table public.chat_questions
  add column if not exists top_route text null,
  add column if not exists retrieved_count smallint not null default 0,
  add column if not exists has_corpus_gap boolean not null default false;

create index if not exists chat_questions_created_at_idx
  on public.chat_questions (created_at desc);

create index if not exists chat_questions_conversation_id_idx
  on public.chat_questions (conversation_id, turn_index);

create index if not exists chat_questions_corpus_gap_idx
  on public.chat_questions (has_corpus_gap, created_at desc);

-- Lock down public/anon PostgREST access while ensuring server-side `service_role` has full table privileges:
alter table public.chat_questions enable row level security;

revoke all on table public.chat_questions from anon, authenticated;
grant all on table public.chat_questions to service_role;

notify pgrst, 'reload schema';
