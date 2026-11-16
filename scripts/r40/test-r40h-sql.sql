-- R40-H: isolated session status checks. Previous script seeds synthetic R40-G rows only.
\set ON_ERROR_STOP on
\i scripts/r40/test-r40g-sql.sql
create table nongkum_sports.editor_sessions(
 token_hash text primary key,
 issued_at timestamptz default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 role_name text
);
alter table nongkum_sports.activity_photo_submissions
  add column uploader_session_hash text,
  add column reject_reason text;
update nongkum_sports.activity_photo_submissions
 set uploader_session_hash=encode(extensions.digest(repeat('a',64),'sha256'),'hex');
insert into nongkum_sports.editor_sessions(token_hash,expires_at,role_name)
 values (encode(extensions.digest(repeat('a',64),'sha256'),'hex'),now()+interval '2 hours','editor'),
 (encode(extensions.digest(repeat('b',64),'sha256'),'hex'),now()+interval '2 hours','editor');
insert into nongkum_sports.activity_photo_submissions
(id,event_id,source_key,sport_id,division,storage_path,byte_size,mime_type,
 caption,uploaded_by,status,uploader_session_hash,publication_status)
values ('33333333-4444-4555-8666-777777777777','test-match','test-source','petanque',
'12 ปี ชาย','uploads/33333333-4444-4555-8666-777777777777.webp',2048,
'image/webp','ภาพจำลองของบัญชีอื่น','ผู้ส่ง B','review',
 encode(extensions.digest(repeat('b',64),'sha256'),'hex'),'private');
\i supabase/migrations/20261116210000_r40h_my_photo_submissions.sql
do $r40h_test$
declare
 a jsonb;b jsonb;r jsonb;
begin
 if has_function_privilege('anon','public.nongkum_activity_photo_my_uploads_gateway(jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.nongkum_activity_photo_my_uploads_gateway(jsonb)','EXECUTE') then
   raise exception 'R40H leak: public roles may execute status function';end if;
 r:=public.nongkum_activity_photo_my_uploads_gateway(jsonb_build_object('token',repeat('c',64)));
 if r->>'error'<>'expired' then raise exception 'Unknown token returns data';end if;
 a:=public.nongkum_activity_photo_my_uploads_gateway(jsonb_build_object('token',repeat('a',64)));
 b:=public.nongkum_activity_photo_my_uploads_gateway(jsonb_build_object('token',repeat('b',64)));
 if a->>'ok'<>'true' or jsonb_array_length(a->'items')<>2 then
    raise exception 'A sees wrong items: %',a;end if;
 if b->>'ok'<>'true' or jsonb_array_length(b->'items')<>1 then
    raise exception 'B sees wrong items: %',b;end if;
 if (a::text like '%ภาพจำลองของบัญชีอื่น%') or (b::text like '%ภาพทดสอบสิทธิ์%') then
    raise exception 'CROSS-SESSION DATA LEAK'; end if;
 if a::text like '%uploads/%' or a::text like '%ผู้ส่ง%' or
    a::text like '%public_consent_note%' or a::text like '%uploader_session_hash%'
    then raise exception 'private info leaked in session receipt';end if;
 update nongkum_sports.editor_sessions set revoked_at=now()
  where token_hash=encode(extensions.digest(repeat('b',64),'sha256'),'hex');
 r:=public.nongkum_activity_photo_my_uploads_gateway(jsonb_build_object('token',repeat('b',64)));
 if r->>'error'<>'expired' then raise exception 'revoked token still has access';end if;
end
$r40h_test$;
select 'R40-H SQL PASS: session-isolated receipts, no private paths, expired/revoked denied' as result;
