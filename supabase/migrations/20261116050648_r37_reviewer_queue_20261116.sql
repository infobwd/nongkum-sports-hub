-- R37 reviewer confirmation queue. PRIVATE. No credentials or real sports result rows in this migration.
-- Existing R32 approval publication and audit remain the canonical path.
create table if not exists nongkum_sports.reviewer_access_config (
  id smallint primary key check (id = 1),
  pin_hash text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists nongkum_sports.reviewer_sessions (
  token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
  reviewer_name text not null check(length(btrim(reviewer_name)) between 2 and 120),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists reviewer_sessions_expiry_r37
  on nongkum_sports.reviewer_sessions(expires_at);
create table if not exists nongkum_sports.reviewer_login_attempts (
  id bigint generated always as identity primary key,
  client_key text not null check(client_key ~ '^[0-9a-f]{64}$'),
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists reviewer_login_attempts_lookup_r37
  on nongkum_sports.reviewer_login_attempts(client_key,attempted_at desc);
create table if not exists nongkum_sports.result_reviewer_actions (
  id bigint generated always as identity primary key,
  submission_id uuid not null references nongkum_sports.result_submissions(id),
  result_id text not null,
  action text not null check(action in ('returned')),
  reviewer_name text not null,
  reason text not null check(length(btrim(reason)) between 8 and 500),
  recorded_at timestamptz not null default now()
);
create index if not exists reviewer_actions_submission_r37
  on nongkum_sports.result_reviewer_actions(submission_id,recorded_at desc);
alter table nongkum_sports.reviewer_access_config enable row level security;
alter table nongkum_sports.reviewer_sessions enable row level security;
alter table nongkum_sports.reviewer_login_attempts enable row level security;
alter table nongkum_sports.result_reviewer_actions enable row level security;
revoke all on nongkum_sports.reviewer_access_config,
  nongkum_sports.reviewer_sessions,
  nongkum_sports.reviewer_login_attempts,
  nongkum_sports.result_reviewer_actions from public, anon, authenticated;
grant select on nongkum_sports.reviewer_access_config to service_role;
grant select,insert,update on nongkum_sports.reviewer_sessions to service_role;
grant select,insert on nongkum_sports.reviewer_login_attempts to service_role;
grant select,insert on nongkum_sports.result_reviewer_actions to service_role;
grant usage,select on sequence nongkum_sports.reviewer_login_attempts_id_seq,
  nongkum_sports.result_reviewer_actions_id_seq to service_role;

create or replace function public.nongkum_reviewer_gateway(p_action text,p_data jsonb)
returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog','public','nongkum_sports','extensions'
as $function$
declare
 v_hash text; v_pin text; v_client text; v_token text; v_token_hash text;
 v_name text; v_session nongkum_sports.reviewer_sessions%rowtype;
 v_sub nongkum_sports.result_submissions%rowtype;
 v_fixture public.nongkum_schedule_fixtures%rowtype;
 v_id uuid; v_expected integer; v_reason text; v_note text;
 v_items jsonb; v_schools jsonb; v_sports jsonb; v_counts jsonb;
 v_result_id text;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>12000 then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 if p_action='unlock' then
   v_pin:=coalesce(p_data->>'pin',''); v_name:=btrim(coalesce(p_data->>'reviewer_name',''));
   v_client:=coalesce(p_data->>'client_key',''); v_token:=coalesce(p_data->>'token','');
   if v_pin !~ '^[0-9]{8,30}$' or length(v_name) not between 2 and 120
     or v_name ~ '[[:cntrl:]]' or v_client !~ '^[0-9a-f]{64}$'
     or v_token !~ '^[0-9a-f]{64}$' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   perform pg_advisory_xact_lock(703452);
   if (select count(*) from nongkum_sports.reviewer_login_attempts
       where client_key=v_client and attempted_at>now()-interval '15 minutes' and not succeeded)>=5
     or (select count(*) from nongkum_sports.reviewer_login_attempts
       where attempted_at>now()-interval '15 minutes' and not succeeded)>=50 then
     return jsonb_build_object('ok',false,'error','limited');
   end if;
   select pin_hash into v_hash from nongkum_sports.reviewer_access_config
     where id=1 and enabled=true;
   if v_hash is null then return jsonb_build_object('ok',false,'error','setup_required'); end if;
   if extensions.crypt(v_pin,v_hash) is distinct from v_hash then
     insert into nongkum_sports.reviewer_login_attempts(client_key,succeeded)
       values(v_client,false);
     return jsonb_build_object('ok',false,'error','wrong_pin');
   end if;
   insert into nongkum_sports.reviewer_login_attempts(client_key,succeeded)
     values(v_client,true);
   v_token_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
   insert into nongkum_sports.reviewer_sessions(token_hash,reviewer_name,expires_at)
     values(v_token_hash,v_name,now()+interval '6 hours');
   return jsonb_build_object('ok',true,'token',v_token,'reviewer_name',v_name,
       'expires_at',(select expires_at from nongkum_sports.reviewer_sessions
                     where token_hash=v_token_hash));
 end if;
 v_token:=coalesce(p_data->>'token','');
 if v_token !~ '^[0-9a-f]{64}$' then
   return jsonb_build_object('ok',false,'error','expired');
 end if;
 v_token_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
 select * into v_session from nongkum_sports.reviewer_sessions
   where token_hash=v_token_hash and revoked_at is null and expires_at>now();
 if not found then return jsonb_build_object('ok',false,'error','expired'); end if;
 if p_action='status' then
   return jsonb_build_object('ok',true,'reviewer_name',v_session.reviewer_name,
      'expires_at',v_session.expires_at);
 elsif p_action='logout' then
   update nongkum_sports.reviewer_sessions set revoked_at=now()
     where token_hash=v_token_hash and revoked_at is null;
   return jsonb_build_object('ok',true);
 elsif p_action='queue' then
   select coalesce(jsonb_object_agg(s.school_id,s.short_name),'{}'::jsonb)
     into v_schools from public.nongkum_schedule_schools s;
   select coalesce(jsonb_object_agg(s.sport_id,s.name),'{}'::jsonb)
     into v_sports from public.nongkum_schedule_sports s;
   select jsonb_build_object(
      'review',count(*) filter(where status='review'),
      'approved',count(*) filter(where status='approved'),
      'rejected',count(*) filter(where status='rejected'))
     into v_counts from nongkum_sports.result_submissions;
   select coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id, 'result_id',s.result_id,
      'fixture_id',s.fixture_id,'event_id',s.event_id,
      'sport_id',s.sport_id,'division',f.division,
      'kind',f.kind,'source_match_no',f.source_match_no,
      'team_a_id',f.team_a_id,'team_b_id',f.team_b_id,
      'source_current',(a.source_key is not null and f.sport_id=s.sport_id
         and s.source_ref=('R33:'||f.source_key||'/'||f.fixture_id)),
      'revision',s.revision,'published_revision',coalesce(p.revision,0),
      'result_type',s.result_type,
      'proposed',s.proposed_result,'correction_note',s.correction_note,
      'submitted_by',s.submitted_by,'submitted_at',s.submitted_at)
     order by s.submitted_at desc),'[]'::jsonb) into v_items
     from (select * from nongkum_sports.result_submissions
           where status='review' order by submitted_at desc limit 250) s
     left join public.nongkum_schedule_fixtures f
       on f.fixture_id=coalesce(s.fixture_id,s.event_id)
     left join public.nongkum_schedule_active a on a.source_key=f.source_key
     left join public.nongkum_published_results p on p.result_id=s.result_id;
   return jsonb_build_object('ok',true,'counts',v_counts,'items',v_items,
      'schools',v_schools,'sports',v_sports);
 elsif p_action not in ('approve','reject') then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 if coalesce(p_data->>'submission_id','') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(p_data->>'expected_revision','') !~ '^[1-9][0-9]{0,7}$' then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_id:=(p_data->>'submission_id')::uuid;
 v_expected:=(p_data->>'expected_revision')::integer;
 select * into v_sub from nongkum_sports.result_submissions
   where id=v_id for update;
 if not found then return jsonb_build_object('ok',false,'error','missing'); end if;
 if v_sub.status<>'review' or v_sub.revision<>v_expected then
   return jsonb_build_object('ok',false,'error','stale');
 end if;
 select f.* into v_fixture
   from public.nongkum_schedule_fixtures f
   join public.nongkum_schedule_active a on a.source_key=f.source_key
   where f.fixture_id=coalesce(v_sub.fixture_id,v_sub.event_id)
   limit 1;
 if not found or v_sub.sport_id is distinct from v_fixture.sport_id
   or v_sub.source_ref is distinct from
     ('R33:'||v_fixture.source_key||'/'||v_fixture.fixture_id) then
   return jsonb_build_object('ok',false,'error','source_changed');
 end if;
 if p_action='reject' then
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   if length(v_reason) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','reason_required');
   end if;
   update nongkum_sports.result_submissions set status='rejected' where id=v_id;
   insert into nongkum_sports.result_reviewer_actions
      (submission_id,result_id,action,reviewer_name,reason)
     values(v_id,v_sub.result_id,'returned',v_session.reviewer_name,v_reason);
   return jsonb_build_object('ok',true,'status','rejected','revision',v_sub.revision);
 end if;
 v_note:=nullif(btrim(coalesce(p_data->>'correction_note','')),'');
 if v_sub.revision>1 and length(coalesce(v_note,''))<8 then
   return jsonb_build_object('ok',false,'error','reason_required');
 end if;
 begin
   v_result_id:=nongkum_sports.approve_and_publish(
     v_id,v_expected,v_session.reviewer_name,'R37-web:'||v_id::text,v_note);
 exception when others then
   return jsonb_build_object('ok',false,'error','cannot_approve');
 end;
 return jsonb_build_object('ok',true,'status','approved',
    'result_id',v_result_id,'revision',v_sub.revision);
end
$function$;
revoke all on function public.nongkum_reviewer_gateway(text,jsonb)
  from public,anon,authenticated;
grant execute on function public.nongkum_reviewer_gateway(text,jsonb) to service_role;
