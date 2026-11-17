-- R43-F · READ-ONLY production preflight, 17 Nov 2026.
-- Execute as SELECT only on Supabase Meeting; no credentials, names, or private rows returned.
-- This is NOT a migration, backup, authorization, or a request to activate the system.
-- Re-run immediately before any separately approved production change.
with r43_counts as (
  select
    (select count(*) from nongkum_sports.r43_roles) +
    (select count(*) from nongkum_sports.r43_people) +
    (select count(*) from nongkum_sports.r43_people_audit) +
    (select count(*) from nongkum_sports.r43_requests) +
    (select count(*) from nongkum_sports.r43_audit) +
    (select count(*) from nongkum_sports.r43_new_fixture_requests) +
    (select count(*) from nongkum_sports.r43_new_fixture_audit) as legacy_row_count
), checks as (
  select
    (select count(*) from pg_constraint p
      join pg_class t on t.oid=p.conrelid
      join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='nongkum_sports'
        and t.relname in ('r43_roles','r43_people','r43_people_audit',
          'r43_requests','r43_audit','r43_new_fixture_requests',
          'r43_new_fixture_audit')
        and p.contype='f' and p.confrelid='auth.users'::regclass) as old_actor_fk_count,
    (select count(*) from information_schema.tables
      where table_schema='nongkum_sports'
        and table_name in ('r43_staff_identities','r43_staff_pin_keys',
          'r43_staff_sessions','r43_staff_login_limits')) as new_pin_table_count,
    to_regprocedure('public.nongkum_r43_personal_pin_auth(text,text,text,text,text)')
      is not null as new_pin_rpc_exists,
    (select count(*) from public.nongkum_schedule_active) as active_source_rows,
    (select source_key from public.nongkum_schedule_active where singleton=1) as active_source_key,
    (select count(*) from public.nongkum_schedule_sources) as schedule_source_rows,
    (select count(*) from public.nongkum_schedule_fixtures) as r33_fixture_rows,
    (select count(*) from public.nongkum_published_results) as r32_published_rows
)
select
  statement_timestamp() at time zone 'Asia/Bangkok' as checked_at_bangkok,
  current_database() as db_name,
  c.active_source_key, c.active_source_rows, c.schedule_source_rows,
  c.r33_fixture_rows, c.r32_published_rows,
  r.legacy_row_count as r43_existing_rows,
  c.old_actor_fk_count, c.new_pin_table_count, c.new_pin_rpc_exists,
  case
    when r.legacy_row_count=0 and c.old_actor_fk_count=10
      and c.new_pin_table_count=0 and not c.new_pin_rpc_exists
      and c.active_source_rows=1
      then 'PREFLIGHT_BASELINE_ONLY__BACKUP_REVIEW_APPROVAL_STILL_REQUIRED'
    else 'STOP__SCHEMA_OR_HISTORY_CHANGED'
  end as technical_preflight
from r43_counts r cross join checks c;
