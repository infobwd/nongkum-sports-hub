-- Database-driven regression QA; all IDs and names are synthetic.
\set ON_ERROR_STOP on
do $test$
declare
 proposer uuid:='00000000-0000-4000-8000-000000000001';
 reviewer uuid:='00000000-0000-4000-8000-000000000002';
 other uuid:='00000000-0000-4000-8000-000000000003';
 result jsonb;
 id uuid;
 person_id uuid;
 first_id uuid;
begin
 if has_function_privilege('anon','public.nongkum_r43_gateway(uuid,text,jsonb)','EXECUTE') or
    has_function_privilege('authenticated','public.nongkum_r43_gateway(uuid,text,jsonb)','EXECUTE') or
    has_table_privilege('anon','nongkum_sports.r43_people','SELECT') or
    has_table_privilege('authenticated','nongkum_sports.r43_requests','INSERT')
   then raise exception 'R43 private role grants are too broad';end if;
 insert into nongkum_sports.r43_roles(user_id,can_propose,can_assign,active)
   values(proposer,true,true,true);
 insert into nongkum_sports.r43_roles(user_id,can_review,active)
   values(reviewer,true,true);
 result:=public.nongkum_r43_gateway(other,'status','{}'::jsonb);
 if result->>'error'<>'forbidden' then raise exception 'unprovisioned user accessed service';end if;
 result:=public.nongkum_r43_gateway(proposer,'status','{}'::jsonb);
 if result->>'can_propose'<>'true' or result->>'can_review'<>'false'
   then raise exception 'permissions wrong';end if;
 result:=public.nongkum_r43_gateway(proposer,'person_propose',
   '{"full_name":"ครูทดสอบจำลอง","school_id":"wangdong","evidence_ref":"TEST-EVIDENCE-0001"}'::jsonb);
 if result->>'status'<>'pending' then raise exception 'person pending failed %',result;end if;
 person_id:=(result->>'id')::uuid;
 result:=public.nongkum_r43_gateway(proposer,'person_review',
    jsonb_build_object('id',person_id,'decision','verified'));
 if result->>'error'<>'invalid_or_forbidden' then raise exception 'role rejection missing';end if;
 result:=public.nongkum_r43_gateway(reviewer,'person_review',
    jsonb_build_object('id',person_id,'decision','verified'));
 if result->>'status'<>'verified' then raise exception 'person verification failed %',result;end if;
 result:=public.nongkum_r43_gateway(proposer,'submit',jsonb_build_object(
   'source_key','r33-test','fixture_id','fixture-one','changes',jsonb_build_object('time','09:30'),
   'reason','ทดสอบรายการที่หนึ่ง','evidence_ref','TEST-EVIDENCE-0002',
   'assignments',jsonb_build_array(jsonb_build_object(
     'person_id',person_id,'scope','fixture','scope_key','fixture-one',
     'role','ผู้ตัดสิน','date','2026-11-17','start','09:00','end','10:00'))));
 if result->>'status'<>'submitted' then raise exception 'submission rejected %',result;end if;
 id:=(result->>'id')::uuid;
 result:=public.nongkum_r43_gateway(proposer,'review',jsonb_build_object(
   'id',id,'revision',1,'decision','approved','review_note','ตัวอย่างรับรองจำลอง'));
 if result->>'error'<>'invalid_or_forbidden' and result->>'error'<>'self_review'
  then raise exception 'self-review not rejected %',result;end if;
 result:=public.nongkum_r43_gateway(reviewer,'review',jsonb_build_object(
   'id',id,'revision',1,'decision','approved','review_note','ผู้ตรวจสมมติรับรองข้อมูลทดสอบ'));
 if result->>'status'<>'approved' then raise exception 'independent reviewer failed %',result;end if;
 result:=public.nongkum_r43_gateway(reviewer,'approved_preview','{}'::jsonb);
 if result->>'status'<>'approved_not_published' or jsonb_array_length(result->'schedule_changes')<>1
   or result::text like '%ครูทดสอบจำลอง%' then raise exception 'release preview leaked or changed %',result;end if;
 result:=public.nongkum_r43_gateway(proposer,'submit',jsonb_build_object(
   'source_key','r33-test','fixture_id','fixture-two','changes',jsonb_build_object('field','สนาม A'),
   'reason','รายการที่สองทดสอบซ้ำเวลา','evidence_ref','TEST-EVIDENCE-0003',
   'assignments',jsonb_build_array(jsonb_build_object(
     'person_id',person_id,'scope','fixture','scope_key','fixture-two',
     'role','ผู้ตัดสิน','date','2026-11-17','start','09:30','end','10:30'))));
 if result->>'status'<>'submitted' then raise exception 'second submit %',result;end if;
 first_id:=(result->>'id')::uuid;
 result:=public.nongkum_r43_gateway(reviewer,'review',jsonb_build_object(
   'id',first_id,'revision',1,'decision','approved','review_note','ตรวจเวลาทับซ้อนจำลอง'));
 if result->>'error'<>'duty_overlap' then raise exception 'overlap bypassed %',result;end if;
 result:=public.nongkum_r43_gateway(reviewer,'review',jsonb_build_object(
   'id',first_id,'revision',1,'decision','returned','review_note','มีเวรกรรมการทับซ้อนต้องแก้ไข'));
 if result->>'status'<>'returned' then raise exception 'review return failed %',result;end if;
 insert into public.nongkum_published_results values(
   'result-fixture-locked','{"fixture_id":"fixture-locked"}');
 result:=public.nongkum_r43_gateway(proposer,'submit',jsonb_build_object(
   'source_key','r33-test','fixture_id','fixture-locked',
   'changes',jsonb_build_object('time','10:15'),
   'reason','ทดสอบล็อกผลรับรอง','evidence_ref','TEST-EVIDENCE-0004'));
 id:=(result->>'id')::uuid;
 result:=public.nongkum_r43_gateway(reviewer,'review',jsonb_build_object(
   'id',id,'revision',1,'decision','approved','review_note','ทดสอบล็อกผลหลังแข่ง'));
 if result->>'error'<>'approved_result_lock' then raise exception 'approved result bypassed %',result;end if;
 result:=public.nongkum_r43_gateway(proposer,'submit',jsonb_build_object(
   'source_key','old','fixture_id','fixture-two','changes',jsonb_build_object('field','สนาม B'),
   'reason','ทดสอบผิดรุ่น','evidence_ref','TEST-EVIDENCE-0005'));
 if result->>'error'<>'source_changed' then raise exception 'stale source accepted %',result;end if;
 if (select count(*) from nongkum_sports.r43_audit)<4
   then raise exception 'audit chain missing';end if;
end
$test$;

-- New fixtures remain candidates and must NOT change the 3 sample R33 fixtures.
do $newfixture$
declare
 proposer uuid:='00000000-0000-4000-8000-000000000001';
 reviewer uuid:='00000000-0000-4000-8000-000000000002';
 r jsonb; candidate uuid;
begin
 r:=public.nongkum_r43_new_fixture_gateway(proposer,'new_submit',jsonb_build_object(
   'source_key','r33-test','kind','match','sport_id','volleyball',
   'division','12 ปี หญิง','team_a_id','wangdong','team_b_id','nongkrathum',
   'date','2026-11-18','time','10:30','field','สนาม 2',
   'reason','ขอเพิ่มการแข่งขันข้อมูลจำลอง','evidence_ref','SYNTHETIC-ORDER-001'));
 if r->>'status'<>'submitted' or r->>'notice'<>'temporary_candidate_id_not_official_fixture'
   then raise exception 'new fixture intake failed %',r;end if;
 candidate:=(r->>'id')::uuid;
 r:=public.nongkum_r43_new_fixture_gateway(proposer,'new_review',jsonb_build_object(
   'id',candidate,'revision',1,'decision','ready_for_bracket_check',
   'review_note','ห้ามรับรองคำขอของตัวเอง'));
 if r->>'error'<>'invalid_or_forbidden' and r->>'error'<>'self_review'
   then raise exception 'self review bypass %',r;end if;
 r:=public.nongkum_r43_new_fixture_gateway(reviewer,'new_review',jsonb_build_object(
   'id',candidate,'revision',1,'decision','ready_for_bracket_check',
   'review_note','ผ่านตรวจร่างเข้าสู่คิวผังแข่งขันเท่านั้น'));
 if r->>'status'<>'ready_for_bracket_check'
   then raise exception 'new fixture candidate review failed %',r;end if;
 if (select count(*) from public.nongkum_schedule_fixtures)<>3
   then raise exception 'R33 official fixtures modified by candidate';end if;
 if (select count(*) from nongkum_sports.r43_new_fixture_audit)<>2
   then raise exception 'missing new fixture audit';end if;
end;
$newfixture$;
select 'R43_BC_SQL_PASS' as status;
