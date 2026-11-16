-- R40-G database contract on disposable PostgreSQL only. No production data.
\set ON_ERROR_STOP on
create schema extensions;
create extension pgcrypto with schema extensions;
create schema nongkum_sports;
create schema storage;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table storage.buckets (
 id text primary key,name text not null,public boolean not null,
 file_size_limit integer,allowed_mime_types text[]
);
create table storage.objects (
 bucket_id text not null,name text not null,metadata jsonb,
 primary key(bucket_id,name)
);
create table public.nongkum_schedule_active(singleton integer,source_key text);
create table public.nongkum_schedule_fixtures (
 source_key text,fixture_id text,sport_id text,division text,date_confirmed boolean,
 draft_date date
);
create table nongkum_sports.reviewer_sessions (
 token_hash text primary key,reviewer_name text,expires_at timestamptz,
 revoked_at timestamptz
);
create table nongkum_sports.activity_photo_submissions (
 id uuid primary key,
 event_id text not null,source_key text not null,sport_id text not null,
 division text not null,storage_path text not null,byte_size integer not null,
 mime_type text not null,caption text not null,uploaded_by text not null,
 status text not null,submitted_at timestamptz default now(),
 reviewed_by text,reviewed_at timestamptz,
 consent_checked boolean,consent_note text
);
alter table nongkum_sports.activity_photo_submissions enable row level security;
revoke all on nongkum_sports.activity_photo_submissions from public,anon,authenticated;
insert into public.nongkum_schedule_active values(1,'test-source');
insert into public.nongkum_schedule_fixtures values
 ('test-source','test-match','petanque','12 ปี ชาย',true,date '2026-11-16');
insert into nongkum_sports.reviewer_sessions(token_hash,reviewer_name,expires_at)
 values(encode(extensions.digest(repeat('a',64),'sha256'),'hex'),
        'ผู้ตรวจทดสอบ',now()+interval '1 hour');
insert into nongkum_sports.activity_photo_submissions
 (id,event_id,source_key,sport_id,division,storage_path,byte_size,mime_type,
 caption,uploaded_by,status,reviewed_at)
 values
 ('11111111-2222-4333-8444-555555555555','test-match','test-source',
  'petanque','12 ปี ชาย','uploads/11111111-2222-4333-8444-555555555555.webp',
  2048,'image/webp','ภาพทดสอบสิทธิ์','เจ้าหน้าที่ทดสอบ','review',now()),
 ('66666666-7777-4888-9999-aaaaaaaaaaaa','test-match','test-source',
  'petanque','12 ปี ชาย','uploads/66666666-7777-4888-9999-aaaaaaaaaaaa.webp',
  2048,'image/webp','ภาพอนุมัติภายในเดิม','เจ้าหน้าที่ทดสอบ','approved',now());
\i supabase/migrations/20261116180000_r40g_public_activity_gallery.sql

do $gate$
declare
 t text:=repeat('a',64);
 first_id uuid:='11111111-2222-4333-8444-555555555555';
 old_id uuid:='66666666-7777-4888-9999-aaaaaaaaaaaa';
 res jsonb;
 pubpath text;
begin
 if (select publication_status from nongkum_sports.activity_photo_submissions where id=old_id)<>'private'
   then raise exception 'old approved images must remain private'; end if;
 if (select count(*) from public.nongkum_public_activity_photos)<>0
   then raise exception 'never auto-publish old R40 approved images'; end if;
 if has_function_privilege('anon','public.nongkum_activity_photo_publication_gateway(text,jsonb)','execute')
   or has_function_privilege('authenticated','public.nongkum_activity_photo_publication_gateway(text,jsonb)','execute')
   then raise exception 'private reviewer RPC must be service-only'; end if;
 if has_table_privilege('anon','public.nongkum_public_activity_photos','insert')
   then raise exception 'anon cannot insert public media'; end if;
 res:=public.nongkum_activity_photo_publication_gateway('queue',jsonb_build_object('token',repeat('f',64)));
 if res->>'error'<>'expired' then raise exception 'bad token accepted'; end if;
 res:=public.nongkum_activity_photo_publication_gateway('prepare',jsonb_build_object('token',t,'id',first_id));
 if res->>'error'<>'consent_required' then raise exception 'missing consent accepted'; end if;
 res:=public.nongkum_activity_photo_publication_gateway('prepare',
   jsonb_build_object('token',t,'id',first_id,'public_consent_checked',true,
                      'public_consent_note','ผู้จัดยืนยันสิทธิ์เผยแพร่ภาพจำลอง'));
 if res->>'ok'<>'true' then raise exception 'valid prepare failed: %',res; end if;
 pubpath:=res->>'public_path';
 if pubpath !~ '^media/[0-9a-f-]{36}[.]webp$' then raise exception 'public path invalid'; end if;
 if (select status from nongkum_sports.activity_photo_submissions where id=first_id)<>'approved'
   then raise exception 'reviewer publish did not approve'; end if;
 res:=public.nongkum_activity_photo_publication_gateway('finish',jsonb_build_object('token',t,'id',first_id));
 if res->>'error'<>'invalid' then raise exception 'finish accepted missing Storage object'; end if;
 insert into storage.objects values('nongkum-activity-public',pubpath,
   jsonb_build_object('size',2048,'mimetype','image/webp'));
 res:=public.nongkum_activity_photo_publication_gateway('finish',jsonb_build_object('token',t,'id',first_id));
 if res->>'status'<>'published' then raise exception 'publish failed: %',res; end if;
 if (select count(*) from public.nongkum_public_activity_photos)<>1
   then raise exception 'public catalog lacks published photo'; end if;
 if (select event_date from public.nongkum_public_activity_photos where id=first_id)<>date '2026-11-16'
   then raise exception 'date not mapped to confirmed fixture'; end if;
 if (select publication_status from nongkum_sports.activity_photo_submissions where id=old_id)<>'private'
   then raise exception 'unrelated approved image exposed'; end if;
 res:=public.nongkum_activity_photo_publication_gateway('revoke',jsonb_build_object('token',t,'id',first_id));
 if res->>'error'<>'reason_required' then raise exception 'revoke without reason accepted'; end if;
 res:=public.nongkum_activity_photo_publication_gateway('revoke',
   jsonb_build_object('token',t,'id',first_id,'reason','ทดสอบการเพิกถอนภาพที่เผยแพร่'));
 if res->>'status'<>'revoked' then raise exception 'revoke failed: %',res; end if;
 if (select count(*) from public.nongkum_public_activity_photos)<>0
   then raise exception 'revoked public catalog still visible'; end if;
 if (select status from nongkum_sports.activity_photo_submissions where id=first_id)<>'approved'
   or (select publication_status from nongkum_sports.activity_photo_submissions where id=first_id)<>'revoked'
   or (select revoked_by from nongkum_sports.activity_photo_submissions where id=first_id) is null
   then raise exception 'private original/revocation audit not preserved'; end if;
end
$gate$;
select 'R40-G SQL PASS: separate consent, image published only after Storage verification, revoke and audit' as result;
