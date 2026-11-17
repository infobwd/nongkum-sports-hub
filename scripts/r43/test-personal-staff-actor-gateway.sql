-- R43-F: end-to-end synthetic staff UUID proposal/review gateway QA.
-- Runs only AFTER the guarded staff actor migration in disposable PostgreSQL.
begin;
do $staffqa$
declare
  editor uuid; reviewer uuid; unknown_actor uuid := '00000000-0000-4000-8000-000000000099';
  person_id uuid; v_request_id uuid; candidate_id uuid; got jsonb;
  n integer;
begin
  select count(*) into n from pg_constraint p
    where p.connamespace='nongkum_sports'::regnamespace
      and p.contype='f' and p.confrelid='nongkum_sports.r43_staff_identities'::regclass
      and p.conname in (
        'r43_roles_user_id_fkey','r43_people_proposed_by_fkey',
        'r43_people_reviewed_by_fkey','r43_people_audit_actor_fkey',
        'r43_requests_submitted_by_fkey','r43_requests_reviewed_by_fkey',
        'r43_audit_actor_fkey','r43_new_fixture_requests_proposed_by_fkey',
        'r43_new_fixture_requests_reviewed_by_fkey','r43_new_fixture_audit_actor_fkey'
      );
  if n<>10 then raise exception 'Expected 10 staff UUID FKs; found %',n; end if;
  if has_function_privilege('anon','public.nongkum_r43_gateway(uuid,text,jsonb)','EXECUTE')
     or has_function_privilege('authenticated','public.nongkum_r43_gateway(uuid,text,jsonb)','EXECUTE')
  then raise exception 'Public gateway privileges unsafe';end if;
  insert into nongkum_sports.r43_staff_identities(full_name,school_id,authority_ref,active)
  values('ทดสอบ ผู้จัดตาราง','wangdong','SYNTHETIC-STAFF-EDITOR-001',true)
  returning id into editor;
  insert into nongkum_sports.r43_staff_identities(full_name,school_id,authority_ref,active)
  values('ทดสอบ ผู้ตรวจตาราง','nongkrathum','SYNTHETIC-STAFF-REVIEWER-002',true)
  returning id into reviewer;
  insert into nongkum_sports.r43_roles(user_id,can_propose,can_assign,can_review,active)
  values(editor,true,true,true,true);
  insert into nongkum_sports.r43_roles(user_id,can_review,active)
  values(reviewer,true,true);

  got:=public.nongkum_r43_gateway(unknown_actor,'status','{}'::jsonb);
  if got->>'error'<>'forbidden' then raise exception 'Unknown actor accepted';end if;
  got:=public.nongkum_r43_gateway(editor,'person_propose',
    '{"full_name":"ครูทดสอบประจำสนาม","school_id":"wangdong","evidence_ref":"SYNTHETIC-PERSON-001"}'::jsonb);
  if (got->>'ok')::boolean is distinct from true then
    raise exception 'Staff person propose failed: %',got;end if;
  person_id:=(got->>'id')::uuid;
  got:=public.nongkum_r43_gateway(editor,'person_review',
    jsonb_build_object('id',person_id,'decision','verified'));
  if got->>'error'<>'self_review_or_stale' then
    raise exception 'Staff self person review not blocked: %',got;end if;
  got:=public.nongkum_r43_gateway(reviewer,'person_review',
    jsonb_build_object('id',person_id,'decision','verified'));
  if got->>'status'<>'verified' then raise exception 'Reviewer person verification failed: %',got;end if;

  got:=public.nongkum_r43_gateway(editor,'submit',jsonb_build_object(
    'source_key','r33-test','fixture_id','fixture-one',
    'changes',jsonb_build_object('time','10:00'),
    'assignments','[]'::jsonb,
    'reason','SYNTHETIC propose change only',
    'evidence_ref','SYNTHETIC-REQUEST-001'));
  if (got->>'ok')::boolean is distinct from true then
    raise exception 'Schedule change submission failed: %',got;end if;
  v_request_id:=(got->>'id')::uuid;
  got:=public.nongkum_r43_gateway(editor,'review',jsonb_build_object(
    'id',v_request_id,'revision',1,'decision','approved',
    'review_note','SYNTHETIC same-person rejection'));
  if got->>'error'<>'self_review' then raise exception 'Staff self approval accepted: %',got;end if;
  got:=public.nongkum_r43_gateway(reviewer,'review',jsonb_build_object(
    'id',v_request_id,'revision',1,'decision','approved',
    'review_note','SYNTHETIC independent review'));
  if got->>'status'<>'approved' then raise exception 'Staff independent review failed: %',got;end if;
  if not exists(select 1 from nongkum_sports.r43_requests q
        where q.id=v_request_id and q.submitted_by=editor and q.reviewed_by=reviewer)
     or not exists(select 1 from nongkum_sports.r43_audit a
        where a.request_id=v_request_id and a.actor=editor and action='submitted')
  then raise exception 'Missing staff audit or actor provenance';end if;

  got:=public.nongkum_r43_new_fixture_gateway(editor,'new_submit',jsonb_build_object(
    'source_key','r33-test','kind','match','sport_id','volleyball',
    'division','12 ปี หญิง','team_a_id','wangdong','team_b_id','nongkrathum',
    'reason','SYNTHETIC new fixture candidate',
    'evidence_ref','SYNTHETIC-CANDIDATE-001'));
  if (got->>'ok')::boolean is distinct from true then raise exception 'Candidate submit failed: %',got;end if;
  candidate_id:=(got->>'id')::uuid;
  got:=public.nongkum_r43_new_fixture_gateway(editor,'new_review',jsonb_build_object(
    'id',candidate_id,'revision',1,'decision','ready_for_bracket_check',
    'review_note','SYNTHETIC self approval blocked'));
  if got->>'error'<>'self_review' then raise exception 'Candidate self-review not blocked: %',got;end if;
  got:=public.nongkum_r43_new_fixture_gateway(reviewer,'new_review',jsonb_build_object(
    'id',candidate_id,'revision',1,'decision','ready_for_bracket_check',
    'review_note','SYNTHETIC independent candidate check'));
  if got->>'status'<>'ready_for_bracket_check' then
    raise exception 'Independent candidate check failed: %',got;end if;
  if exists(select 1 from public.nongkum_published_results)
     or (select count(*) from public.nongkum_schedule_fixtures)<>3 then
    raise exception 'Private gateway mutated R32/R33 synthetic source';end if;
end;
$staffqa$;
rollback;
select 'R43_PERSONAL_STAFF_ACTOR_GATEWAY_PASS' as status;
