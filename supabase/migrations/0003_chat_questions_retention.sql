-- VetLawGuide Chat-Question Retention & Scheduled Purge (E14-S3)
-- Enforces the 180-day retention window (`CHAT_QUESTIONS_RETENTION_DAYS = 180`)
-- disclosed on `/privacy` for PII-scrubbed rows in `public.chat_questions`.

create or replace function public.purge_expired_chat_questions(
  retention_days integer default 180
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_rows bigint := 0;
begin
  if retention_days < 1 then
    raise exception 'retention_days must be >= 1 (received %)', retention_days;
  end if;

  with purged as (
    delete from public.chat_questions
    where created_at < (now() - make_interval(days => retention_days))
    returning 1
  )
  select count(*) into deleted_rows from purged;

  return deleted_rows;
end;
$$;

revoke all on function public.purge_expired_chat_questions(integer) from public, anon, authenticated;
grant execute on function public.purge_expired_chat_questions(integer) to service_role;

-- Schedule automatic daily purge at 03:17 UTC via Supabase `pg_cron` when available.
do $$
begin
  create extension if not exists pg_cron with schema extensions;

  if exists (
    select 1
    from cron.job
    where jobname = 'purge-expired-chat-questions-180d'
  ) then
    perform cron.unschedule('purge-expired-chat-questions-180d');
  end if;

  perform cron.schedule(
    'purge-expired-chat-questions-180d',
    '17 3 * * *',
    $job$select public.purge_expired_chat_questions(180);$job$
  );
exception
  when undefined_file or insufficient_privilege or invalid_schema_name or undefined_table then
    raise notice 'pg_cron extension unavailable in this environment; invoke public.purge_expired_chat_questions(180) via scheduled job.';
end;
$$;
