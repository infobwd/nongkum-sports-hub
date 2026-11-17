-- R43-F: REVIEW CANDIDATE ONLY. NOT APPLIED TO SUPABASE MEETING.
-- Production installation requires reviewed backup, approved staff authorization,
-- confirmed PR merge and verified latest R32/R33 source.
-- Entire schema migration is atomic: a failed guard rolls back every DDL change.
-- CI explicitly accepts r43_staff_test, production accepts only the existing
-- project database name 'postgres' and the expected active R33 version.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';
do $db_guard$
begin
 if current_database() not in ('postgres','r43_staff_test') then
   raise exception 'R43-F rejected database name: %', current_database();
 end if;
end
$db_guard$;
-- Lock all legacy actor tables BEFORE checking emptiness to eliminate race.
lock table nongkum_sports.r43_roles,
 nongkum_sports.r43_people, nongkum_sports.r43_people_audit,
 nongkum_sports.r43_requests, nongkum_sports.r43_audit,
 nongkum_sports.r43_new_fixture_requests, nongkum_sports.r43_new_fixture_audit
 in access exclusive mode;
do $r43_preflight$
declare
 t text; n bigint; fk_count integer;
 v_active text; v_fixtures bigint;
begin
 if to_regclass('nongkum_sports.r43_staff_identities') is not null or
    to_regprocedure('public.nongkum_r43_personal_pin_auth(text,text,text,text,text)') is not null then
   raise exception 'R43-F blocked: personal PIN schema already exists';
 end if;
 foreach t in array array[
  'r43_roles','r43_people','r43_people_audit','r43_requests','r43_audit',
  'r43_new_fixture_requests','r43_new_fixture_audit'
 ] loop
   execute format('select count(*) from nongkum_sports.%I',t) into n;
   if n<>0 then raise exception 'R43-F blocked: old R43 rows in %',t; end if;
 end loop;
 select count(*) into fk_count from pg_constraint p
   join pg_class t on t.oid=p.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where n.nspname='nongkum_sports'
     and t.relname like 'r43_%'
     and p.contype='f' and p.confrelid='auth.users'::regclass;
 if fk_count<>10 then
   raise exception 'R43-F blocked: expected 10 actor FKs; found %',fk_count;
 end if;
 if (select count(*) from public.nongkum_schedule_active)<>1 then
   raise exception 'R43-F blocked: active schedule source not singleton';
 end if;
 select source_key into v_active from public.nongkum_schedule_active
  where singleton=1;
 select count(*) into v_fixtures from public.nongkum_schedule_fixtures;
 if current_database()='postgres'
    and (v_active is distinct from 'r33-20261116-7ba60be1-fa3269b5'
         or v_fixtures<>236) then
   raise exception 'R43-F blocked: official R33 revision/count changed';
 end if;
end
$r43_preflight$;
create temporary table r43f_presnapshot on commit drop as
 select (select source_key from public.nongkum_schedule_active where singleton=1) source_key,
        (select count(*) from public.nongkum_schedule_fixtures) r33_count,
        (select count(*) from public.nongkum_published_results) r32_count;

-- BEGIN REVIEWED SOURCE: supabase/proposals/r43_personal_pin_private_identity.sql
-- R43-F individual-PIN identity storage. Proposal only: NOT applied to Supabase Meeting.
-- This additive first stage deliberately does not touch R32/R33, Auth, R34/R37,
-- or the legacy R43 gateway/FKs. No operator, PIN, or permission is provisioned.
-- PINs must be random, unique, >=10 decimal digits and issued privately by an
-- authorized administrator. Edge computes HMAC-SHA256(PIN, server-only pepper);
-- database stores only its 64-character hex MAC (never PIN or pepper).
-- Do not enable login until an atomic server-side rate limiter + actor-FK
-- migration and new gateway are implemented and tested.
create table if not exists nongkum_sports.r43_staff_identities(
  id uuid primary key default gen_random_uuid(),
  full_name text not null check(length(btrim(full_name)) between 3 and 120),
  school_id text not null references public.nongkum_schedule_schools(school_id),
  authority_ref text not null check(length(btrim(authority_ref)) between 8 and 300),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check(not active or revoked_at is null)
);
create table if not exists nongkum_sports.r43_staff_pin_keys(
  staff_id uuid primary key references nongkum_sports.r43_staff_identities(id),
  pin_lookup_mac text not null unique check(pin_lookup_mac ~ '^[0-9a-f]{64}$'),
  pin_version integer not null default 1 check(pin_version>=1),
  updated_at timestamptz not null default now()
);
create table if not exists nongkum_sports.r43_staff_sessions(
  token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
  staff_id uuid not null references nongkum_sports.r43_staff_identities(id),
  pin_version integer not null check(pin_version>=1),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check(expires_at>issued_at and expires_at<=issued_at+interval '6 hours')
);
create index if not exists r43_staff_sessions_active
  on nongkum_sports.r43_staff_sessions(staff_id,expires_at)
  where revoked_at is null;
-- A server-only limiter will atomically check and update this counter on
-- every attempt (including unknown PINs). The browser must never set its key.
create table if not exists nongkum_sports.r43_staff_login_limits(
  client_key text primary key check(client_key ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null default 0 check(attempts>=0),
  locked_until timestamptz
);
alter table nongkum_sports.r43_staff_identities enable row level security;
alter table nongkum_sports.r43_staff_pin_keys enable row level security;
alter table nongkum_sports.r43_staff_sessions enable row level security;
alter table nongkum_sports.r43_staff_login_limits enable row level security;
revoke all on nongkum_sports.r43_staff_identities,
  nongkum_sports.r43_staff_pin_keys,nongkum_sports.r43_staff_sessions,
  nongkum_sports.r43_staff_login_limits from PUBLIC,anon,authenticated;
grant select,insert,update on nongkum_sports.r43_staff_identities,
  nongkum_sports.r43_staff_pin_keys,nongkum_sports.r43_staff_sessions,
  nongkum_sports.r43_staff_login_limits to service_role;
-- Intentionally no public RPC, no END USER grants, and no real identities seeded.

-- END SOURCE: supabase/proposals/r43_personal_pin_private_identity.sql


-- BEGIN REVIEWED SOURCE: supabase/proposals/r43_staff_actor_bridge.sql
-- R43-F staff actor migration proposal. NOT applied to Supabase Meeting.
-- Preconditions: apply r43_personal_pin_private_identity.sql first.
-- This migration is intentionally FAIL CLOSED if any legacy R43 data exists.
-- It does NOT update the live R32/R33 results or fixtures, or auth.users.
do $r43_staff_actor_bridge$
declare
  t text;
  c text;
  f text;
  k text;
  n integer;
begin
  foreach t in array array[
    'r43_roles','r43_people','r43_people_audit','r43_requests',
    'r43_audit','r43_new_fixture_requests','r43_new_fixture_audit'
  ] loop
    execute format('select count(*) from nongkum_sports.%I',t) into n;
    if n<>0 then
      raise exception 'R43 staff actor migration blocked: %.% rows already exist; manual history-safe plan required',t,n;
    end if;
  end loop;
  if (select count(*) from nongkum_sports.r43_staff_identities)<>0 then
    raise exception 'R43 staff actor migration blocked: staff already provisioned';
  end if;

  -- The existing ten foreign keys reference auth.users. Repoint each to the
  -- private immutable actor identity, retaining UUID columns and audit history.
  for t,c in
    select x.table_name,x.column_name from (values
      ('r43_roles','user_id'),
      ('r43_people','proposed_by'),('r43_people','reviewed_by'),
      ('r43_people_audit','actor'),
      ('r43_requests','submitted_by'),('r43_requests','reviewed_by'),
      ('r43_audit','actor'),
      ('r43_new_fixture_requests','proposed_by'),
      ('r43_new_fixture_requests','reviewed_by'),
      ('r43_new_fixture_audit','actor')
    ) x(table_name,column_name)
  loop
    k:=t||'_'||c||'_fkey';
    if not exists(
      select 1 from pg_constraint p
      where p.conrelid=format('nongkum_sports.%I',t)::regclass
        and p.conname=k and p.contype='f'
        and p.confrelid='auth.users'::regclass
    ) then
      raise exception 'R43 actor FK drift: expected auth.users reference on %.%',t,c;
    end if;
    execute format('alter table nongkum_sports.%I drop constraint %I',t,k);
    execute format(
      'alter table nongkum_sports.%I add constraint %I foreign key (%I) references nongkum_sports.r43_staff_identities(id)',
      t,k,c
    );
  end loop;
end;
$r43_staff_actor_bridge$;

comment on column nongkum_sports.r43_roles.user_id is
  'R43-F staff actor UUID from nongkum_sports.r43_staff_identities; name preserved for original gateway compatibility';

-- END SOURCE: supabase/proposals/r43_staff_actor_bridge.sql


-- BEGIN REVIEWED SOURCE: supabase/proposals/r43_personal_pin_auth_rpc.sql
-- R43-F: personal PIN authentication RPC (proposal ONLY; NOT deployed).
-- Requires r43_personal_pin_private_identity.sql. Does not grant public API access.
-- Each PIN is random, >=10 decimal digits, HMAC-SHA256 with an Edge-only pepper.
-- Only service_role may call this atomic login/session RPC; never expose service key.
grant delete on nongkum_sports.r43_staff_login_limits to service_role;

-- Authority comes only from r43_roles after the guarded actor-FK migration.
-- Do not duplicate permissions in r43_staff_identities.

create or replace function public.nongkum_r43_personal_pin_auth(
  p_action text, p_pin_mac text, p_session_hash text,
  p_client_key text, p_global_key text
) returns jsonb
language plpgsql security invoker
set search_path to 'pg_catalog','public','nongkum_sports'
as $auth$
declare
  v_now timestamptz := clock_timestamp();
  v_actor record;
  v_limited timestamptz;
  v_attempts integer;
  v_key text;
  v_limit integer;
  v_period interval;
  v_lock interval;
  v_idx integer;
begin
  if p_action not in ('login','status','logout')
     or coalesce(p_session_hash,'') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error','invalid');
  end if;

  if p_action='login' then
    if coalesce(p_pin_mac,'') !~ '^[0-9a-f]{64}$'
      or coalesce(p_client_key,'') !~ '^[0-9a-f]{64}$'
      or coalesce(p_global_key,'') !~ '^[0-9a-f]{64}$'
      or p_client_key=p_global_key then
      return jsonb_build_object('ok',false,'error','invalid');
    end if;

    -- Atomic, persisted limiter. BOTH per-client and global counters are
    -- checked on EVERY attempt, including unknown or disabled PINs.
    for v_idx in 1..2 loop
      v_key:=case when v_idx=1 then p_client_key else p_global_key end;
      v_limit:=case when v_idx=1 then 6 else 90 end;
      v_period:=case when v_idx=1 then interval '10 minutes' else interval '1 minute' end;
      v_lock:=case when v_idx=1 then interval '10 minutes' else interval '1 minute' end;
      insert into nongkum_sports.r43_staff_login_limits as l
        (client_key,window_start,attempts,locked_until)
      values (v_key,v_now,1,null)
      on conflict(client_key) do update set
        attempts=case when l.window_start < v_now-v_period then 1
                      else l.attempts+1 end,
        window_start=case when l.window_start < v_now-v_period then v_now
                          else l.window_start end,
        locked_until=case
          when l.locked_until>v_now then l.locked_until
          when l.window_start < v_now-v_period then null
          when l.attempts+1>=v_limit then v_now+v_lock
          else null end
      returning attempts,locked_until into v_attempts,v_limited;
      if v_limited>v_now then
        return jsonb_build_object('ok',false,'error','limited');
      end if;
    end loop;

    select s.id,s.full_name,s.school_id,r.can_propose,r.can_assign,r.can_review,
           k.pin_version
      into v_actor
      from nongkum_sports.r43_staff_pin_keys k
      join nongkum_sports.r43_staff_identities s on s.id=k.staff_id
      join nongkum_sports.r43_roles r on r.user_id=s.id and r.active=true
     where k.pin_lookup_mac=p_pin_mac
       and s.active=true and s.revoked_at is null
       and (r.can_propose or r.can_assign or r.can_review);
    if not found then
      return jsonb_build_object('ok',false,'error','unauthenticated');
    end if;
    insert into nongkum_sports.r43_staff_sessions
      (token_hash,staff_id,pin_version,issued_at,expires_at)
    values(p_session_hash,v_actor.id,v_actor.pin_version,v_now,v_now+interval '6 hours');
    -- Successful login clears the per-client counter, NOT global throttling.
    delete from nongkum_sports.r43_staff_login_limits where client_key=p_client_key;
    return jsonb_build_object('ok',true,'staff_id',v_actor.id,
      'full_name',v_actor.full_name,'school_id',v_actor.school_id,'can_propose',v_actor.can_propose,
      'can_assign',v_actor.can_assign,'can_review',v_actor.can_review,
      'expires_at',v_now+interval '6 hours');
  end if;

  if p_action='logout' then
    update nongkum_sports.r43_staff_sessions set revoked_at=v_now
     where token_hash=p_session_hash and revoked_at is null;
    return jsonb_build_object('ok',true);
  end if;

  -- A disabled identity, rotated PIN, expired or revoked session is rejected.
  select s.id,s.full_name,s.school_id,r.can_propose,r.can_assign,r.can_review,
         t.expires_at into v_actor
    from nongkum_sports.r43_staff_sessions t
    join nongkum_sports.r43_staff_identities s on s.id=t.staff_id
    join nongkum_sports.r43_staff_pin_keys k on k.staff_id=s.id
    join nongkum_sports.r43_roles r on r.user_id=s.id and r.active=true
   where t.token_hash=p_session_hash and t.revoked_at is null
     and t.expires_at>v_now and s.active=true and s.revoked_at is null
     and t.pin_version=k.pin_version
     and (r.can_propose or r.can_assign or r.can_review);
  if not found then
    return jsonb_build_object('ok',false,'error','unauthenticated');
  end if;
  return jsonb_build_object('ok',true,'staff_id',v_actor.id,
    'full_name',v_actor.full_name,'school_id',v_actor.school_id,'can_propose',v_actor.can_propose,
    'can_assign',v_actor.can_assign,'can_review',v_actor.can_review,
    'expires_at',v_actor.expires_at);
end
$auth$;
revoke all on function public.nongkum_r43_personal_pin_auth(
  text,text,text,text,text) from PUBLIC,anon,authenticated;
grant execute on function public.nongkum_r43_personal_pin_auth(
  text,text,text,text,text) to service_role;

-- END SOURCE: supabase/proposals/r43_personal_pin_auth_rpc.sql
do $r43_postflight$
declare
 staff_fk_count integer; old_fk_count integer;
begin
 select count(*) into staff_fk_count from pg_constraint p
  join pg_class t on t.oid=p.conrelid
  join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='nongkum_sports' and t.relname like 'r43_%'
    and p.contype='f' and p.confrelid='nongkum_sports.r43_staff_identities'::regclass;
 select count(*) into old_fk_count from pg_constraint p
  join pg_class t on t.oid=p.conrelid
  join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='nongkum_sports' and t.relname like 'r43_%'
    and p.contype='f' and p.confrelid='auth.users'::regclass;
 if staff_fk_count<>10 or old_fk_count<>0 then
   raise exception 'R43-F blocked: actor FK postflight mismatch';
 end if;
 if exists (
  select 1 from r43f_presnapshot x where
    x.source_key is distinct from (select source_key from public.nongkum_schedule_active where singleton=1)
    or x.r33_count<>(select count(*) from public.nongkum_schedule_fixtures)
    or x.r32_count<>(select count(*) from public.nongkum_published_results)
 ) then raise exception 'R43-F blocked: R32/R33 baseline changed during migration'; end if;
 if has_function_privilege('anon','public.nongkum_r43_personal_pin_auth(text,text,text,text,text)','EXECUTE')
    or has_function_privilege('authenticated','public.nongkum_r43_personal_pin_auth(text,text,text,text,text)','EXECUTE')
 then raise exception 'R43-F blocked: public PIN auth execute'; end if;
 if (select count(*) from nongkum_sports.r43_staff_identities)<>0
    or (select count(*) from nongkum_sports.r43_staff_pin_keys)<>0
    or (select count(*) from nongkum_sports.r43_staff_sessions)<>0
 then raise exception 'R43-F blocked: unexpected staff/PIN provisioning'; end if;
end
$r43_postflight$;
commit;
-- Presence of these objects is not authorization to open the Edge endpoints.
