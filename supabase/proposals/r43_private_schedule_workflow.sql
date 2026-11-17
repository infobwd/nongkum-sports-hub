-- R43-B/C PROPOSAL ONLY. NOT APPLIED. Generate the official migration via Supabase CLI
-- and test in an isolated database before enabling this code on Meeting production.
-- No alteration to R32/R33 tables; all personnel and audit data are private.
create table if not exists nongkum_sports.r43_roles(
 user_id uuid primary key references auth.users(id), can_propose boolean not null default false,
 can_assign boolean not null default false, can_review boolean not null default false,
 active boolean not null default false, granted_at timestamptz not null default now(),
 check (can_propose or can_assign or can_review));
create table if not exists nongkum_sports.r43_people(
 id uuid primary key default gen_random_uuid(),
 school_id text not null references public.nongkum_schedule_schools(school_id),
 full_name text not null check(length(btrim(full_name)) between 3 and 120),
 evidence_ref text not null check(length(btrim(evidence_ref)) between 8 and 300),
 status text not null default 'pending' check(status in ('pending','verified','rejected')),
 proposed_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz, created_at timestamptz not null default now(),
 check (reviewed_by is distinct from proposed_by));
create table if not exists nongkum_sports.r43_requests(
 id uuid primary key default gen_random_uuid(),
 source_key text not null references public.nongkum_schedule_sources(source_key),
 fixture_id text not null, sport_id text not null, division text not null,
 changes jsonb not null default '{}'::jsonb check(jsonb_typeof(changes)='object'),
 assignments jsonb not null default '[]'::jsonb check(jsonb_typeof(assignments)='array'),
 evidence_ref text not null check(length(btrim(evidence_ref)) between 8 and 300),
 reason text not null check(length(btrim(reason)) between 8 and 500),
 status text not null default 'submitted' check(status in ('submitted','approved','returned','cancelled')),
 submitted_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz, review_note text,
 revision integer not null default 1 check(revision>=1), submitted_at timestamptz not null default now(),
 check(changes<>'{}'::jsonb or jsonb_array_length(assignments)>0),
 check(reviewed_by is null or reviewed_by<>submitted_by));
create index if not exists r43_requests_queue on nongkum_sports.r43_requests(status,submitted_at desc);
create index if not exists r43_requests_fixture on nongkum_sports.r43_requests(source_key,fixture_id);
create table if not exists nongkum_sports.r43_audit(
 id bigint generated always as identity primary key, request_id uuid not null references nongkum_sports.r43_requests(id),
 actor uuid not null references auth.users(id), action text not null check(action in ('submitted','approved','returned')),
 from_status text, to_status text not null, note text not null, created_at timestamptz not null default now());
create table if not exists nongkum_sports.r43_people_audit(
 id bigint generated always as identity primary key, person_id uuid not null references nongkum_sports.r43_people(id),
 actor uuid not null references auth.users(id), action text not null check(action in ('proposed','verified','rejected')),
 created_at timestamptz not null default now());
alter table nongkum_sports.r43_roles enable row level security;
alter table nongkum_sports.r43_people enable row level security;
alter table nongkum_sports.r43_requests enable row level security;
alter table nongkum_sports.r43_audit enable row level security;
alter table nongkum_sports.r43_people_audit enable row level security;
revoke all on nongkum_sports.r43_roles,nongkum_sports.r43_people,
 nongkum_sports.r43_requests,nongkum_sports.r43_audit,
 nongkum_sports.r43_people_audit from public,anon,authenticated;
grant select,insert,update on nongkum_sports.r43_roles,nongkum_sports.r43_people,
 nongkum_sports.r43_requests to service_role;
grant select,insert on nongkum_sports.r43_audit,nongkum_sports.r43_people_audit to service_role;
grant usage,select on sequence nongkum_sports.r43_audit_id_seq,
 nongkum_sports.r43_people_audit_id_seq to service_role;

-- SECURITY INVOKER: callable only by service_role in the Edge Function,
-- after the Edge Function independently verifies p_uid via /auth/v1/user.
create or replace function public.nongkum_r43_gateway(p_uid uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker
set search_path to 'pg_catalog','public','nongkum_sports'
as $r43$
declare
 v_role nongkum_sports.r43_roles%rowtype;
 v_person nongkum_sports.r43_people%rowtype;
 v_req nongkum_sports.r43_requests%rowtype;
 v_fixture public.nongkum_schedule_fixtures%rowtype;
 v_source text;v_changes jsonb;v_assign jsonb;v_item jsonb;
 v_key text;v_value text;v_reason text;v_evidence text;v_id uuid;v_rev integer;v_overlap boolean;
begin
 if p_uid is null or p_action is null or p_data is null or jsonb_typeof(p_data)<>'object'
   or length(p_data::text)>15000 then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 select * into v_role from nongkum_sports.r43_roles where user_id=p_uid and active=true;
 if not found then return jsonb_build_object('ok',false,'error','forbidden'); end if;
 if p_action='status' then
   return jsonb_build_object('ok',true,'can_propose',v_role.can_propose,
     'can_assign',v_role.can_assign,'can_review',v_role.can_review,
     'publication','not_enabled');
 elsif p_action='people' then
   if not (v_role.can_assign or v_role.can_review) then
     return jsonb_build_object('ok',false,'error','forbidden');end if;
   return jsonb_build_object('ok',true,'people',
     (select coalesce(jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,
       'school_id',school_id) order by full_name),'[]'::jsonb)
      from nongkum_sports.r43_people where status='verified'));
 elsif p_action='people_pending' then
   if not v_role.can_review then return jsonb_build_object('ok',false,'error','forbidden');end if;
   return jsonb_build_object('ok',true,'people',
     (select coalesce(jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,
       'school_id',school_id,'evidence_ref',evidence_ref,'proposed_by',proposed_by)
       order by created_at),'[]'::jsonb)
      from nongkum_sports.r43_people where status='pending'));
 elsif p_action='person_propose' then
   if not v_role.can_assign then return jsonb_build_object('ok',false,'error','forbidden');end if;
   v_reason:=btrim(coalesce(p_data->>'full_name',''));
   v_evidence:=btrim(coalesce(p_data->>'evidence_ref',''));
   v_key:=coalesce(p_data->>'school_id','');
   if length(v_reason) not between 3 and 120 or v_reason~'[[:cntrl:]]'
    or length(v_evidence) not between 8 and 300
    or not exists(select 1 from public.nongkum_schedule_schools where school_id=v_key) then
     return jsonb_build_object('ok',false,'error','invalid');end if;
   insert into nongkum_sports.r43_people(full_name,school_id,evidence_ref,proposed_by)
     values(v_reason,v_key,v_evidence,p_uid) returning * into v_person;
   insert into nongkum_sports.r43_people_audit(person_id,actor,action)
     values(v_person.id,p_uid,'proposed');
   return jsonb_build_object('ok',true,'id',v_person.id,'status','pending');
 elsif p_action='person_review' then
   if not v_role.can_review or coalesce(p_data->>'id','') !~*
       '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
     or coalesce(p_data->>'decision','') not in ('verified','rejected') then
     return jsonb_build_object('ok',false,'error','invalid_or_forbidden');end if;
   select * into v_person from nongkum_sports.r43_people
      where id=(p_data->>'id')::uuid for update;
   if not found then return jsonb_build_object('ok',false,'error','missing');end if;
   if v_person.status<>'pending' or v_person.proposed_by=p_uid then
     return jsonb_build_object('ok',false,'error','self_review_or_stale');end if;
   update nongkum_sports.r43_people set status=p_data->>'decision',
     reviewed_by=p_uid,reviewed_at=now() where id=v_person.id;
   insert into nongkum_sports.r43_people_audit(person_id,actor,action)
     values(v_person.id,p_uid,p_data->>'decision');
   return jsonb_build_object('ok',true,'status',p_data->>'decision');
 elsif p_action='queue' then
   if not v_role.can_review then return jsonb_build_object('ok',false,'error','forbidden');end if;
   return jsonb_build_object('ok',true,'requests',
     (select coalesce(jsonb_agg(jsonb_build_object('id',id,
       'fixture_id',fixture_id,'source_key',source_key,'sport_id',sport_id,'division',division,
       'changes',changes,'assignments',assignments,'reason',reason,
       'evidence_ref',evidence_ref,'revision',revision,'submitted_by',submitted_by,
       'submitted_at',submitted_at) order by submitted_at desc),'[]'::jsonb)
       from (select * from nongkum_sports.r43_requests where status='submitted'
         order by submitted_at desc limit 100) r));
 elsif p_action='submit' then
   if not v_role.can_propose then return jsonb_build_object('ok',false,'error','forbidden');end if;
   v_source:=coalesce(p_data->>'source_key','');
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   v_evidence:=btrim(coalesce(p_data->>'evidence_ref',''));
   v_changes:=coalesce(p_data->'changes','{}'::jsonb);
   v_assign:=coalesce(p_data->'assignments','[]'::jsonb);
   if jsonb_typeof(v_changes)<>'object' or jsonb_typeof(v_assign)<>'array'
      or jsonb_array_length(v_assign)>15
      or (v_changes='{}'::jsonb and v_assign='[]'::jsonb)
      or length(v_reason) not between 8 and 500 or length(v_evidence) not between 8 and 300 then
     return jsonb_build_object('ok',false,'error','invalid');end if;
   if v_source is distinct from (select source_key from public.nongkum_schedule_active where singleton=1) then
     return jsonb_build_object('ok',false,'error','source_changed');end if;
   select * into v_fixture from public.nongkum_schedule_fixtures
     where source_key=v_source and fixture_id=coalesce(p_data->>'fixture_id','');
   if not found then return jsonb_build_object('ok',false,'error','missing_fixture');end if;
   for v_key in select jsonb_object_keys(v_changes) loop
     v_value:=v_changes->>v_key;
     if v_key not in ('date','time','field','venue')
       or jsonb_typeof(v_changes->v_key)<>'string'
       or length(v_value)>200 or v_value~'[[:cntrl:]]' then
       return jsonb_build_object('ok',false,'error','invalid_field');end if;
     if v_key='date' and v_value<>'' then
       if v_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
         return jsonb_build_object('ok',false,'error','invalid_date');end if;
       begin
         if to_char(v_value::date,'YYYY-MM-DD')<>v_value then
           return jsonb_build_object('ok',false,'error','invalid_date');end if;
       exception when others then return jsonb_build_object('ok',false,'error','invalid_date');end;
     elsif v_key='time' and v_value<>''
       and v_value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
       return jsonb_build_object('ok',false,'error','invalid_time');
     end if;
   end loop;
   if v_assign<>'[]'::jsonb and not v_role.can_assign then
     return jsonb_build_object('ok',false,'error','forbidden_assignment');end if;
   for v_item in select jsonb_array_elements(v_assign) loop
     if jsonb_typeof(v_item)<>'object'
       or coalesce(v_item->>'person_id','') !~*
           '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
       or v_item ? 'person_name' or v_item ? 'full_name'
       or coalesce(v_item->>'scope','') not in ('sport','division','fixture')
       or coalesce(v_item->>'role','') not in
           ('ผู้ตัดสิน','ผู้ช่วยผู้ตัดสิน','ผู้บันทึกผล','ผู้จับเวลา','กรรมการสนาม','หัวหน้ากรรมการ','อื่น ๆ')
       or coalesce(v_item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or coalesce(v_item->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_item->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_item->>'start','') >= coalesce(v_item->>'end','')
       or (v_item->>'scope'='sport' and coalesce(v_item->>'scope_key','')<>v_fixture.sport_id)
       or (v_item->>'scope'='division' and coalesce(v_item->>'scope_key','')<>(v_fixture.sport_id||'/'||v_fixture.division))
       or (v_item->>'scope'='fixture' and coalesce(v_item->>'scope_key','')<>v_fixture.fixture_id) then
       return jsonb_build_object('ok',false,'error','invalid_assignment');end if;
     begin
       if to_char((v_item->>'date')::date,'YYYY-MM-DD')<>(v_item->>'date')
         then return jsonb_build_object('ok',false,'error','invalid_assignment_date');end if;
     exception when others then return jsonb_build_object('ok',false,'error','invalid_assignment_date');end;
     if not exists(select 1 from nongkum_sports.r43_people
       where id=(v_item->>'person_id')::uuid and status='verified') then
       return jsonb_build_object('ok',false,'error','unverified_person');end if;
   end loop;
   -- Reject conflicts WITHIN the submitted bundle as well as against
   -- previously approved bundles; do not infer identities from display names.
   select exists(
     select 1 from jsonb_array_elements(v_assign) with ordinality as a(item,idx)
     join jsonb_array_elements(v_assign) with ordinality as b(item,idx)
        on a.idx<b.idx
     where a.item->>'person_id'=b.item->>'person_id'
       and a.item->>'date'=b.item->>'date'
       and (a.item->>'start')<(b.item->>'end')
       and (b.item->>'start')<(a.item->>'end')
   ) into v_overlap;
   if v_overlap then return jsonb_build_object('ok',false,'error','duty_overlap_within_request');end if;
   insert into nongkum_sports.r43_requests
      (source_key,fixture_id,sport_id,division,changes,assignments,reason,evidence_ref,submitted_by)
     values(v_source,v_fixture.fixture_id,v_fixture.sport_id,v_fixture.division,
       v_changes,v_assign,v_reason,v_evidence,p_uid)
      returning id into v_id;
   insert into nongkum_sports.r43_audit(request_id,actor,action,to_status,note)
     values(v_id,p_uid,'submitted','submitted',v_reason);
   return jsonb_build_object('ok',true,'id',v_id,'status','submitted');
 elsif p_action='review' then
   if not v_role.can_review or coalesce(p_data->>'id','') !~*
        '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
      or coalesce(p_data->>'revision','') !~ '^[1-9][0-9]{0,7}$'
      or coalesce(p_data->>'decision','') not in ('approved','returned') then
      return jsonb_build_object('ok',false,'error','invalid_or_forbidden');end if;
   v_reason:=btrim(coalesce(p_data->>'review_note',''));
   if length(v_reason) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','reason_required');end if;
   v_rev:=(p_data->>'revision')::integer;
   -- Serialize approvals across DIFFERENT fixture requests so cross-request
   -- person-time conflict checks cannot race past each other.
   perform pg_advisory_xact_lock(704343);
   select * into v_req from nongkum_sports.r43_requests where id=(p_data->>'id')::uuid for update;
   if not found then return jsonb_build_object('ok',false,'error','missing');end if;
   if v_req.submitted_by=p_uid then return jsonb_build_object('ok',false,'error','self_review');end if;
   if v_req.status<>'submitted' or v_req.revision<>v_rev then
     return jsonb_build_object('ok',false,'error','stale');end if;
   if v_req.source_key is distinct from
      (select source_key from public.nongkum_schedule_active where singleton=1) then
     return jsonb_build_object('ok',false,'error','source_changed');end if;
   if p_data->>'decision'='approved' then
     -- Approved results lock schedule changes until manually reconciled.
     if v_req.changes<>'{}'::jsonb and exists(
       select 1 from public.nongkum_published_results p
        where p.result_id='result-'||v_req.fixture_id
          or p.result->>'fixture_id'=v_req.fixture_id
          or p.result->>'event_id'=v_req.fixture_id) then
       return jsonb_build_object('ok',false,'error','approved_result_lock');end if;
     -- Avoid multiple approved replacements for one fixture/source.
     if exists(select 1 from nongkum_sports.r43_requests x
       where x.source_key=v_req.source_key and x.fixture_id=v_req.fixture_id
         and x.id<>v_req.id and x.status='approved') then
       return jsonb_build_object('ok',false,'error','already_approved');end if;
     -- Match verified person UUID + calendar date + intersecting duty intervals.
     if exists(select 1 from jsonb_array_elements(v_req.assignments) a
       join nongkum_sports.r43_requests x on x.status='approved'
          and x.source_key=v_req.source_key and x.id<>v_req.id
       cross join lateral jsonb_array_elements(x.assignments) b
       where a->>'person_id'=b->>'person_id' and a->>'date'=b->>'date'
         and a->>'start'<b->>'end' and b->>'start'<a->>'end') then
       return jsonb_build_object('ok',false,'error','duty_overlap');end if;
     if exists(select 1 from jsonb_array_elements(v_req.assignments) a
       where not exists(select 1 from nongkum_sports.r43_people p
         where p.id=(a->>'person_id')::uuid and p.status='verified')) then
       return jsonb_build_object('ok',false,'error','unverified_person');end if;
   end if;
   update nongkum_sports.r43_requests set status=p_data->>'decision',
      reviewed_by=p_uid,reviewed_at=now(),review_note=v_reason,revision=revision+1
    where id=v_req.id;
   insert into nongkum_sports.r43_audit(request_id,actor,action,from_status,to_status,note)
     values(v_req.id,p_uid,p_data->>'decision','submitted',p_data->>'decision',v_reason);
   return jsonb_build_object('ok',true,'status',p_data->>'decision','revision',v_rev+1);
 elsif p_action='approved_preview' then
   if not v_role.can_review then return jsonb_build_object('ok',false,'error','forbidden');end if;
   -- This payload contains NO personnel names, and is NEVER an activation command.
   return jsonb_build_object('ok',true,'status','approved_not_published',
      'source_key',(select source_key from public.nongkum_schedule_active where singleton=1),
      'new_fixture_review_pending',(select count(*) from nongkum_sports.r43_new_fixture_requests
          where status in ('submitted','ready_for_bracket_check')
            and source_key=(select source_key from public.nongkum_schedule_active where singleton=1)),
      'schedule_changes',(select coalesce(jsonb_agg(jsonb_build_object(
         'fixture_id',fixture_id,'changes',changes,'request_id',id)
         order by submitted_at),'[]'::jsonb) from nongkum_sports.r43_requests
         where status='approved' and changes<>'{}'::jsonb
           and source_key=(select source_key from public.nongkum_schedule_active where singleton=1)));
 end if;
 return jsonb_build_object('ok',false,'error','invalid_action');
end;
$r43$;
revoke all on function public.nongkum_r43_gateway(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_r43_gateway(uuid,text,jsonb) to service_role;
