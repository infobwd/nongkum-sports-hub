-- R43-B: NEW FIXTURE proposals only. Never creates official fixture IDs or R33 brackets.
-- Apply only in isolated/reviewed migration stage; not on Meeting production yet.
create table if not exists nongkum_sports.r43_new_fixture_requests(
 id uuid primary key default gen_random_uuid(),
 source_key text not null references public.nongkum_schedule_sources(source_key),
 kind text not null check(kind in ('match','track_event')),
 sport_id text not null references public.nongkum_schedule_sports(sport_id),
 division text not null check(length(btrim(division)) between 2 and 160),
 team_a_id text references public.nongkum_schedule_schools(school_id),
 team_b_id text references public.nongkum_schedule_schools(school_id),
 scheduled_date date, scheduled_time time without time zone,
 venue text, field_name text, round_name text,
 reason text not null check(length(btrim(reason)) between 8 and 500),
 evidence_ref text not null check(length(btrim(evidence_ref)) between 8 and 300),
 status text not null default 'submitted'
    check(status in ('submitted','ready_for_bracket_check','returned')),
 proposed_by uuid not null references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz, review_note text,
 revision integer not null default 1 check(revision>=1),
 created_at timestamptz not null default now(),
 constraint r43_new_match_teams check(
   (kind='match' and team_a_id is not null and team_b_id is not null and team_a_id<>team_b_id)
   or (kind='track_event' and team_a_id is null and team_b_id is null)),
 constraint r43_new_reviewer_separation check(reviewed_by is null or reviewed_by<>proposed_by)
);
create table if not exists nongkum_sports.r43_new_fixture_audit(
 id bigint generated always as identity primary key,
 candidate_id uuid not null references nongkum_sports.r43_new_fixture_requests(id),
 actor uuid not null references auth.users(id),
 action text not null check(action in ('submitted','ready_for_bracket_check','returned')),
 note text not null, at timestamptz not null default now()
);
create index if not exists r43_new_queue on nongkum_sports.r43_new_fixture_requests(status,created_at desc);
alter table nongkum_sports.r43_new_fixture_requests enable row level security;
alter table nongkum_sports.r43_new_fixture_audit enable row level security;
revoke all on nongkum_sports.r43_new_fixture_requests,nongkum_sports.r43_new_fixture_audit
 from public,anon,authenticated;
grant select,insert,update on nongkum_sports.r43_new_fixture_requests to service_role;
grant select,insert on nongkum_sports.r43_new_fixture_audit to service_role;
grant usage,select on sequence nongkum_sports.r43_new_fixture_audit_id_seq to service_role;

create or replace function public.nongkum_r43_new_fixture_gateway(
  p_uid uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker
set search_path to 'pg_catalog','public','nongkum_sports'
as $r43new$
declare
 r nongkum_sports.r43_roles%rowtype;
 req nongkum_sports.r43_new_fixture_requests%rowtype;
 active_key text;
 sport text;kind text;division text;team_a text;team_b text;
 d text;t text; v_reason text;evidence text;v_id uuid;rev integer;
begin
 if p_uid is null or p_data is null or jsonb_typeof(p_data)<>'object'
    or length(p_data::text)>9000 then
   return jsonb_build_object('ok',false,'error','invalid');end if;
 select * into r from nongkum_sports.r43_roles where user_id=p_uid and active=true;
 if not found then return jsonb_build_object('ok',false,'error','forbidden');end if;
 select source_key into active_key from public.nongkum_schedule_active where singleton=1;
 if p_action='new_queue' then
   if not r.can_review then return jsonb_build_object('ok',false,'error','forbidden');end if;
   return jsonb_build_object('ok',true,'candidates',(
     select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'sport_id',sport_id,
      'division',division,'team_a_id',team_a_id,'team_b_id',team_b_id,
      'scheduled_date',scheduled_date,'scheduled_time',scheduled_time,
      'venue',venue,'field_name',field_name,'round_name',round_name,
      'reason',reason,'evidence_ref',evidence_ref,'revision',revision,
      'proposed_by',proposed_by) order by created_at desc),'[]'::jsonb)
       from (select * from nongkum_sports.r43_new_fixture_requests
          where status='submitted' order by created_at desc limit 50) q));
 elsif p_action='new_submit' then
   if not r.can_propose then return jsonb_build_object('ok',false,'error','forbidden');end if;
   if coalesce(p_data->>'source_key','')<>active_key then
     return jsonb_build_object('ok',false,'error','source_changed');end if;
   kind:=coalesce(p_data->>'kind','');
   sport:=btrim(coalesce(p_data->>'sport_id',''));
   division:=btrim(coalesce(p_data->>'division',''));
   team_a:=nullif(coalesce(p_data->>'team_a_id',''),'');
   team_b:=nullif(coalesce(p_data->>'team_b_id',''),'');
   d:=coalesce(p_data->>'date','');
   t:=coalesce(p_data->>'time','');
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   evidence:=btrim(coalesce(p_data->>'evidence_ref',''));
   if kind not in ('match','track_event') or
      not exists(select 1 from public.nongkum_schedule_sports where sport_id=sport)
      or length(division) not between 2 and 160
      or length(v_reason) not between 8 and 500
      or length(evidence) not between 8 and 300
      or length(coalesce(p_data->>'venue',''))>200
      or length(coalesce(p_data->>'field',''))>160
      or length(coalesce(p_data->>'round',''))>160
      or (kind='match' and (team_a is null or team_b is null or team_a=team_b))
      or (kind='track_event' and (team_a is not null or team_b is not null)) then
     return jsonb_build_object('ok',false,'error','invalid');end if;
   if kind='match' and (not exists(select 1 from public.nongkum_schedule_schools
         where school_id=team_a) or not exists(select 1 from public.nongkum_schedule_schools
         where school_id=team_b)) then
     return jsonb_build_object('ok',false,'error','invalid_schools');end if;
   if d<>'' then
     if d !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return jsonb_build_object('ok',false,'error','invalid_date');end if;
     begin if to_char(d::date,'YYYY-MM-DD')<>d then return jsonb_build_object('ok',false,'error','invalid_date');end if;
     exception when others then return jsonb_build_object('ok',false,'error','invalid_date');end;
   end if;
   if t<>'' and t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
     return jsonb_build_object('ok',false,'error','invalid_time');end if;
   insert into nongkum_sports.r43_new_fixture_requests
    (source_key,kind,sport_id,division,team_a_id,team_b_id,scheduled_date,scheduled_time,
     venue,field_name,round_name,reason,evidence_ref,proposed_by)
    values(active_key,kind,sport,division,team_a,team_b,nullif(d,'')::date,nullif(t,'')::time,
     nullif(btrim(coalesce(p_data->>'venue','')),''),nullif(btrim(coalesce(p_data->>'field','')),''),
     nullif(btrim(coalesce(p_data->>'round','')),''),v_reason,evidence,p_uid)
    returning id into v_id;
   insert into nongkum_sports.r43_new_fixture_audit(candidate_id,actor,action,note)
     values(v_id,p_uid,'submitted',v_reason);
   return jsonb_build_object('ok',true,'id',v_id,'status','submitted',
    'notice','temporary_candidate_id_not_official_fixture');
 elsif p_action='new_review' then
   if not r.can_review or coalesce(p_data->>'id','') !~*
      '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
     or coalesce(p_data->>'revision','') !~ '^[1-9][0-9]{0,7}$'
     or coalesce(p_data->>'decision','') not in ('ready_for_bracket_check','returned') then
      return jsonb_build_object('ok',false,'error','invalid_or_forbidden');end if;
   v_reason:=btrim(coalesce(p_data->>'review_note',''));
   if length(v_reason) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','reason_required');end if;
   rev:=(p_data->>'revision')::integer;
   select * into req from nongkum_sports.r43_new_fixture_requests
     where id=(p_data->>'id')::uuid for update;
   if not found then return jsonb_build_object('ok',false,'error','missing');end if;
   if req.proposed_by=p_uid then return jsonb_build_object('ok',false,'error','self_review');end if;
   if req.status<>'submitted' or req.revision<>rev then
     return jsonb_build_object('ok',false,'error','stale');end if;
   if req.source_key<>active_key then return jsonb_build_object('ok',false,'error','source_changed');end if;
   update nongkum_sports.r43_new_fixture_requests set status=p_data->>'decision',
     reviewed_by=p_uid,reviewed_at=now(),review_note=v_reason,revision=revision+1
     where id=req.id;
   insert into nongkum_sports.r43_new_fixture_audit(candidate_id,actor,action,note)
     values(req.id,p_uid,p_data->>'decision',v_reason);
   return jsonb_build_object('ok',true,'status',p_data->>'decision',
      'notice','not_added_to_R33_and_not_published');
 end if;
 return jsonb_build_object('ok',false,'error','invalid_action');
end;
$r43new$;
revoke all on function public.nongkum_r43_new_fixture_gateway(uuid,text,jsonb)
 from public,anon,authenticated;
grant execute on function public.nongkum_r43_new_fixture_gateway(uuid,text,jsonb) to service_role;
