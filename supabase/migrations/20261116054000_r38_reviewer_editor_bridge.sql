-- R38: reviewer may use the existing submit-only workflow without a second PIN.
-- Reviewer bearer tokens remain independent from editor tokens; the latter exist only
-- inside this database transaction and are revoked before the function returns.
-- This function MUST NOT be executable by anon/authenticated/PUBLIC.
create or replace function public.nongkum_reviewer_edit_gateway(p_action text, p_data jsonb)
returns jsonb
language plpgsql
set search_path to 'pg_catalog','public','nongkum_sports','extensions'
as $r38$
declare
  v_reviewer_token text;
  v_reviewer_hash text;
  v_editor_token text;
  v_editor_hash text;
  v_session nongkum_sports.reviewer_sessions%rowtype;
  v_answer jsonb;
  v_payload jsonb;
  v_fixture_id text;
begin
  if p_action not in ('edit_fixture','edit_submit')
    or p_data is null or jsonb_typeof(p_data)<>'object'
    or length(p_data::text)>12000 then
    return jsonb_build_object('ok',false,'error','invalid');
  end if;
  v_reviewer_token:=coalesce(p_data->>'token','');
  if v_reviewer_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  v_reviewer_hash:=encode(extensions.digest(v_reviewer_token,'sha256'),'hex');
  select * into v_session
    from nongkum_sports.reviewer_sessions
    where token_hash=v_reviewer_hash and revoked_at is null and expires_at>now();
  if not found then
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  v_fixture_id:=coalesce(p_data->>'fixture_id','');
  if length(v_fixture_id) not between 3 and 140 then
    return jsonb_build_object('ok',false,'error','invalid');
  end if;
  -- Generate the editor session on the server; never pass it to the browser.
  v_editor_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_editor_hash:=encode(extensions.digest(v_editor_token,'sha256'),'hex');
  insert into nongkum_sports.editor_sessions(token_hash,expires_at)
    values (v_editor_hash,least(v_session.expires_at,now()+interval '1 minute'));
  v_payload:=(p_data-'token')||jsonb_build_object('token',v_editor_token);
  v_answer:=public.nongkum_editor_gateway(
     case when p_action='edit_fixture' then 'fixture' else 'submit' end,
     v_payload);
  -- Short-lived session is revoked even when editor rejects the proposed result.
  update nongkum_sports.editor_sessions set revoked_at=now()
    where token_hash=v_editor_hash and revoked_at is null;
  if p_action='edit_submit' and v_answer->>'ok'='true'
      and coalesce(v_answer->>'revision','') ~ '^[1-9][0-9]{0,7}$' then
    -- Label only the newly submitted revision; no published results are modified.
    update nongkum_sports.result_submissions
       set submitted_by='ผู้ใช้รหัสผู้ตรวจ: '||v_session.reviewer_name
     where result_id='result-'||v_fixture_id
       and revision=(v_answer->>'revision')::integer
       and status='review' and received_via='web'
       and submitted_by='บันทึกผ่านหน้าเว็บ (รหัสร่วม; รอผู้รับรองระบุตัวบุคคล)';
  end if;
  return v_answer;
end
$r38$;
revoke all on function public.nongkum_reviewer_edit_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_reviewer_edit_gateway(text,jsonb) to service_role;
