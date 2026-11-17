-- R40-H: run against disposable PostgreSQL only; synthetic editor sessions.
\set ON_ERROR_STOP on
\i scripts/r40/test-r40g-sql.sql
create table nongkum_sports.editor_sessions (
 token_hash text primary key,issued_at timestamptz default now(),
 expires_at timestamptz not null,revoked_at timestamptz,
 role_name text
);
alter table nongkum_sports.activity_photo_submissions
 add column uploader_session_hash text;
alter table nongkum_sports.editor_sessions enable row level security;
revoke all on nongkum_sports.editor_sessions from public,anon,authenticated;
insert into nongkum_sports.editor_sessions(token_hash,expires_at,role_name)
values
(encode(extensions.digest(repeat('e',64),'sha256'),'hex'),now()+interval '1 hour','editor'),
(encode(extensions.digest(repeat('f',64),'sha256'),'hex'),now()+interval '1 hour','editor'),
(encode(extensions.digest(repeat('c',64),'sha256'),'hex'),now()-interval '1 hour','editor');
update nongkum_sports.activity_photo_submissions
 set uploader_session_hash=encode(extensions.digest(repeat('e',64),'sha256'),'hex')
 where id='11111111-2222-4333-8444-555555555555';
update nongkum_sports.activity_photo_submissions
 set uploader_session_hash=encode(extensions.digest(repeat('f',64),'sha256'),'hex')
 where id='66666666-7777-4888-9999-aaaaaaaaaaaa';
\i supabase/migrations/20261117063000_r40h_my_photo_status.sql

do $r40h_test$
declare
  a jsonb; b jsonb; expired jsonb; invalid jsonb;
  first_id uuid:='11111111-2222-4333-8444-555555555555';
  second_id uuid:='66666666-7777-4888-9999-aaaaaaaaaaaa';
begin
 if has_function_privilege('anon','public.nongkum_activity_photo_my_submissions(text)','EXECUTE')
   or has_function_privilege('authenticated','public.nongkum_activity_photo_my_submissions(text)','EXECUTE')
   then raise exception 'anonymous/photo uploader can directly query private status function'; end if;
 invalid:=public.nongkum_activity_photo_my_submissions('wrong');
 if invalid->>'error'<>'expired' then raise exception 'invalid token allowed'; end if;
 expired:=public.nongkum_activity_photo_my_submissions(repeat('c',64));
 if expired->>'error'<>'expired' then raise exception 'expired session allowed'; end if;
 a:=public.nongkum_activity_photo_my_submissions(repeat('e',64));
 b:=public.nongkum_activity_photo_my_submissions(repeat('f',64));
 if a->>'ok'<>'true' or b->>'ok'<>'true' then raise exception 'valid editor denied'; end if;
 if jsonb_array_length(a->'items')<>1 or (a->'items'->0->>'id')<>first_id::text
    or jsonb_array_length(b->'items')<>1 or (b->'items'->0->>'id')<>second_id::text
    then raise exception 'cross-session privacy leak'; end if;
 if a::text ~ '(storage_path|uploaded_by|uploader_session_hash|consent_note|image_b64|reviewed_by)'
   then raise exception 'private image fields leaked'; end if;
 update nongkum_sports.editor_sessions set revoked_at=now()
  where token_hash=encode(extensions.digest(repeat('e',64),'sha256'),'hex');
 a:=public.nongkum_activity_photo_my_submissions(repeat('e',64));
 if a->>'error'<>'expired' then raise exception 'revoked session allowed'; end if;
end $r40h_test$;
select 'R40-H SQL PASS: session isolation / no private paths / expired/revoked denied' as result;
