-- R40: private photo intake for the school sports competition.
-- Requires human approval; upload and approval NEVER publish to public sites or results.
-- service_role-only RPC; existing editor/reviewer 6-hour sessions stay independent.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('nongkum-activity-intake','nongkum-activity-intake',false,350000,array['image/webp']::text[])
on conflict (id) do update set public=false,file_size_limit=350000,allowed_mime_types=array['image/webp']::text[];

create table if not exists nongkum_sports.activity_photo_submissions (
 id uuid primary key default gen_random_uuid(),
 event_id text not null,
 source_key text not null,
 sport_id text not null,
 division text not null,
 storage_path text not null unique,
 byte_size integer not null check (byte_size between 1000 and 350000),
 caption text not null check (length(caption) between 3 and 120),
 uploaded_by text not null check (length(uploaded_by) between 2 and 100),
 uploader_session_hash text not null,
 status text not null default 'uploading'
   check (status in ('uploading','review','approved','rejected','cancelled')),
 submitted_at timestamptz not null default now(),
 completed_at timestamptz,
 reviewed_by text,
 reviewed_at timestamptz,
 consent_checked boolean not null default false,
 consent_note text,
 reject_reason text,
 constraint r40_media_path check (storage_path ~ '^uploads/[0-9a-f-]{36}[.]webp
);
create index if not exists r40_activity_photo_status_time_idx
 on nongkum_sports.activity_photo_submissions(status,submitted_at desc);
create index if not exists r40_activity_photo_rate_idx
 on nongkum_sports.activity_photo_submissions(uploader_session_hash,submitted_at desc);
alter table nongkum_sports.activity_photo_submissions enable row level security;
revoke all on nongkum_sports.activity_photo_submissions from public,anon,authenticated;
grant select,insert,update on nongkum_sports.activity_photo_submissions to service_role;

create or replace function public.nongkum_activity_photo_gateway(p_action text,p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','nongkum_sports','storage','extensions'
as $r40$
declare
 v_token text:=coalesce(p_data->>'token','');
 v_hash text;
 v_editor_found boolean:=false;
 v_reviewer_name text;
 v_event_id text;
 v_uploader text;
 v_caption text;
 v_source text;
 v_sport text;
 v_division text;
 v_size int;
 v_id uuid;
 v_item nongkum_sports.activity_photo_submissions%rowtype;
 v_storage_size int;
 v_storage_mime text;
 v_reason text;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object'
    or length(p_data::text)>2000
    or p_action not in ('prepare','finish','cancel','queue','preview','approve','reject')
    or v_token !~ '^[0-9a-f]{64}$' then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
 if p_action in ('prepare','finish','cancel') then
   select exists (
     select 1 from nongkum_sports.editor_sessions
     where token_hash=v_hash and revoked_at is null and expires_at>now()
   ) into v_editor_found;
   if not v_editor_found then
     return jsonb_build_object('ok',false,'error','expired');
   end if;
 else
   select reviewer_name into v_reviewer_name
     from nongkum_sports.reviewer_sessions
    where token_hash=v_hash and revoked_at is null and expires_at>now();
   if v_reviewer_name is null then
     return jsonb_build_object('ok',false,'error','expired');
   end if;
 end if;

 if p_action='prepare' then
   v_event_id:=coalesce(p_data->>'event_id','');
   v_uploader:=btrim(coalesce(p_data->>'uploaded_by',''));
   v_caption:=btrim(coalesce(p_data->>'caption',''));
   if length(v_event_id) not between 3 and 140 or
      length(v_uploader) not between 2 and 100 or
      length(v_caption) not between 3 and 120 or
      coalesce(p_data->>'mime_type','')<>'image/webp' or
      coalesce(p_data->>'byte_size','') !~ '^[0-9]{1,6}$' then
      return jsonb_build_object('ok',false,'error','invalid');
   end if;
   v_size:=(p_data->>'byte_size')::integer;
   if v_size not between 1000 and 350000 then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   if (select count(*) from nongkum_sports.activity_photo_submissions
         where uploader_session_hash=v_hash and submitted_at>now()-interval '1 hour')>=15 then
     return jsonb_build_object('ok',false,'error','limited');
   end if;
   select source_key into v_source from public.nongkum_schedule_active where singleton=1;
   if v_source is null then
      return jsonb_build_object('ok',false,'error','source_changed');
   end if;
   select sport_id,division into v_sport,v_division
     from public.nongkum_schedule_fixtures
    where source_key=v_source and fixture_id=v_event_id;
   if not found then
      return jsonb_build_object('ok',false,'error','source_changed');
   end if;
   v_id:=gen_random_uuid();
   insert into nongkum_sports.activity_photo_submissions
     (id,event_id,source_key,sport_id,division,storage_path,byte_size,caption,
      uploaded_by,uploader_session_hash,status)
   values (v_id,v_event_id,v_source,v_sport,v_division,
      'uploads/'||v_id::text||'.webp',v_size,v_caption,v_uploader,v_hash,'uploading');
   return jsonb_build_object('ok',true,'id',v_id,'storage_path','uploads/'||v_id::text||'.webp');
 end if;

 if p_action='queue' then
   return jsonb_build_object('ok',true,'items',coalesce((
     select jsonb_agg(jsonb_build_object('id',x.id,'event_id',x.event_id,
        'sport_id',x.sport_id,'division',x.division,'caption',x.caption,
        'uploaded_by',x.uploaded_by,'submitted_at',x.submitted_at))
     from (select id,event_id,sport_id,division,caption,uploaded_by,submitted_at
       from nongkum_sports.activity_photo_submissions where status='review'
       order by submitted_at asc limit 100) x
   ),'[]'::jsonb));
 end if;

 if coalesce(p_data->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_id:=(p_data->>'id')::uuid;
 if p_action in ('finish','cancel') then
   select * into v_item from nongkum_sports.activity_photo_submissions
     where id=v_id and uploader_session_hash=v_hash for update;
   if not found or v_item.status<>'uploading' then
     return jsonb_build_object('ok',false,'error','stale');
   end if;
   if p_action='cancel' then
     update nongkum_sports.activity_photo_submissions
       set status='cancelled',reject_reason='upload_failed' where id=v_id;
     return jsonb_build_object('ok',true);
   end if;
   select case when (metadata->>'size') ~ '^[0-9]{1,8}$'
            then (metadata->>'size')::integer end, metadata->>'mimetype'
     into v_storage_size,v_storage_mime
     from storage.objects where bucket_id='nongkum-activity-intake' and name=v_item.storage_path;
   if not found or v_storage_size is distinct from v_item.byte_size
      or v_storage_mime is distinct from 'image/webp' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   update nongkum_sports.activity_photo_submissions
     set status='review',completed_at=now() where id=v_id;
   return jsonb_build_object('ok',true,'status','review');
 end if;


 select * into v_item from nongkum_sports.activity_photo_submissions
   where id=v_id for update;
 if not found then return jsonb_build_object('ok',false,'error','missing'); end if;

 if p_action='preview' then
   if v_item.status not in ('review','approved','rejected') then
     return jsonb_build_object('ok',false,'error','missing');
   end if;
   return jsonb_build_object('ok',true,'storage_path',v_item.storage_path,'byte_size',v_item.byte_size);
 end if;
 if v_item.status<>'review' then
   return jsonb_build_object('ok',false,'error','stale');
 end if;
 if p_action='approve' then
   if not exists (
     select 1 from public.nongkum_schedule_fixtures f
     join public.nongkum_schedule_active a on a.source_key=f.source_key and a.singleton=1
     where f.fixture_id=v_item.event_id and f.sport_id=v_item.sport_id and f.division=v_item.division
   ) then return jsonb_build_object('ok',false,'error','source_changed'); end if;
   v_reason:=btrim(coalesce(p_data->>'consent_note',''));
   if p_data->>'consent_checked'<>'true' or length(v_reason) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','consent_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='approved',reviewed_by=v_reviewer_name,reviewed_at=now(),
          consent_checked=true,consent_note=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','approved',
       'publication_status','private_awaiting_publication');
 end if;
 if p_action='reject' then
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   if length(v_reason) not between 8 and 500 then
      return jsonb_build_object('ok',false,'error','reason_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='rejected',reviewed_by=v_reviewer_name,reviewed_at=now(),
          reject_reason=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','rejected');
 end if;
 return jsonb_build_object('ok',false,'error','invalid');
end
$r40$;
revoke all on function public.nongkum_activity_photo_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_activity_photo_gateway(text,jsonb) to service_role;
)
);
create index if not exists r40_activity_photo_status_time_idx
 on nongkum_sports.activity_photo_submissions(status,submitted_at desc);
create index if not exists r40_activity_photo_rate_idx
 on nongkum_sports.activity_photo_submissions(uploader_session_hash,submitted_at desc);
alter table nongkum_sports.activity_photo_submissions enable row level security;
revoke all on nongkum_sports.activity_photo_submissions from public,anon,authenticated;
grant select,insert,update on nongkum_sports.activity_photo_submissions to service_role;

create or replace function public.nongkum_activity_photo_gateway(p_action text,p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','nongkum_sports','storage','extensions'
as $r40$
declare
 v_token text:=coalesce(p_data->>'token','');
 v_hash text;
 v_editor_found boolean:=false;
 v_reviewer_name text;
 v_event_id text;
 v_uploader text;
 v_caption text;
 v_source text;
 v_sport text;
 v_division text;
 v_size int;
 v_id uuid;
 v_item nongkum_sports.activity_photo_submissions%rowtype;
 v_storage_size int;
 v_storage_mime text;
 v_reason text;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object'
    or length(p_data::text)>2000
    or p_action not in ('prepare','finish','cancel','queue','preview','approve','reject')
    or v_token !~ '^[0-9a-f]{64}$' then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
 if p_action in ('prepare','finish','cancel') then
   select exists (
     select 1 from nongkum_sports.editor_sessions
     where token_hash=v_hash and revoked_at is null and expires_at>now()
   ) into v_editor_found;
   if not v_editor_found then
     return jsonb_build_object('ok',false,'error','expired');
   end if;
 else
   select reviewer_name into v_reviewer_name
     from nongkum_sports.reviewer_sessions
    where token_hash=v_hash and revoked_at is null and expires_at>now();
   if v_reviewer_name is null then
     return jsonb_build_object('ok',false,'error','expired');
   end if;
 end if;

 if p_action='prepare' then
   v_event_id:=coalesce(p_data->>'event_id','');
   v_uploader:=btrim(coalesce(p_data->>'uploaded_by',''));
   v_caption:=btrim(coalesce(p_data->>'caption',''));
   if length(v_event_id) not between 3 and 140 or
      length(v_uploader) not between 2 and 100 or
      length(v_caption) not between 3 and 120 or
      coalesce(p_data->>'mime_type','')<>'image/webp' or
      coalesce(p_data->>'byte_size','') !~ '^[0-9]{1,6}$' then
      return jsonb_build_object('ok',false,'error','invalid');
   end if;
   v_size:=(p_data->>'byte_size')::integer;
   if v_size not between 1000 and 350000 then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   if (select count(*) from nongkum_sports.activity_photo_submissions
         where uploader_session_hash=v_hash and submitted_at>now()-interval '1 hour')>=15 then
     return jsonb_build_object('ok',false,'error','limited');
   end if;
   select source_key into v_source from public.nongkum_schedule_active where singleton=1;
   if v_source is null then
      return jsonb_build_object('ok',false,'error','source_changed');
   end if;
   select sport_id,division into v_sport,v_division
     from public.nongkum_schedule_fixtures
    where source_key=v_source and fixture_id=v_event_id;
   if not found then
      return jsonb_build_object('ok',false,'error','source_changed');
   end if;
   v_id:=gen_random_uuid();
   insert into nongkum_sports.activity_photo_submissions
     (id,event_id,source_key,sport_id,division,storage_path,byte_size,caption,
      uploaded_by,uploader_session_hash,status)
   values (v_id,v_event_id,v_source,v_sport,v_division,
      'uploads/'||v_id::text||'.webp',v_size,v_caption,v_uploader,v_hash,'uploading');
   return jsonb_build_object('ok',true,'id',v_id,'storage_path','uploads/'||v_id::text||'.webp');
 end if;

 if p_action='queue' then
   return jsonb_build_object('ok',true,'items',coalesce((
     select jsonb_agg(jsonb_build_object('id',x.id,'event_id',x.event_id,
        'sport_id',x.sport_id,'division',x.division,'caption',x.caption,
        'uploaded_by',x.uploaded_by,'submitted_at',x.submitted_at))
     from (select id,event_id,sport_id,division,caption,uploaded_by,submitted_at
       from nongkum_sports.activity_photo_submissions where status='review'
       order by submitted_at asc limit 100) x
   ),'[]'::jsonb));
 end if;

 if coalesce(p_data->>'id','') !~ '^[0-9a-f-]{36}$' then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_id:=(p_data->>'id')::uuid;
 if p_action in ('finish','cancel') then
   select * into v_item from nongkum_sports.activity_photo_submissions
     where id=v_id and uploader_session_hash=v_hash for update;
   if not found or v_item.status<>'uploading' then
     return jsonb_build_object('ok',false,'error','stale');
   end if;
   if p_action='cancel' then
     update nongkum_sports.activity_photo_submissions
       set status='cancelled',reject_reason='upload_failed' where id=v_id;
     return jsonb_build_object('ok',true);
   end if;
   select case when (metadata->>'size') ~ '^[0-9]{1,8}$'
            then (metadata->>'size')::integer end, metadata->>'mimetype'
     into v_storage_size,v_storage_mime
     from storage.objects where bucket_id='nongkum-activity-intake' and name=v_item.storage_path;
   if not found or v_storage_size is distinct from v_item.byte_size
      or v_storage_mime is distinct from 'image/webp' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   update nongkum_sports.activity_photo_submissions
     set status='review',completed_at=now() where id=v_id;
   return jsonb_build_object('ok',true,'status','review');
 end if;


 select * into v_item from nongkum_sports.activity_photo_submissions
   where id=v_id for update;
 if not found then return jsonb_build_object('ok',false,'error','missing'); end if;

 if p_action='preview' then
   if v_item.status not in ('review','approved','rejected') then
     return jsonb_build_object('ok',false,'error','missing');
   end if;
   return jsonb_build_object('ok',true,'storage_path',v_item.storage_path,'byte_size',v_item.byte_size);
 end if;
 if v_item.status<>'review' then
   return jsonb_build_object('ok',false,'error','stale');
 end if;
 if p_action='approve' then
   if not exists (
     select 1 from public.nongkum_schedule_fixtures f
     join public.nongkum_schedule_active a on a.source_key=f.source_key and a.singleton=1
     where f.fixture_id=v_item.event_id and f.sport_id=v_item.sport_id and f.division=v_item.division
   ) then return jsonb_build_object('ok',false,'error','source_changed'); end if;
   v_reason:=btrim(coalesce(p_data->>'consent_note',''));
   if p_data->>'consent_checked'<>'true' or length(v_reason) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','consent_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='approved',reviewed_by=v_reviewer_name,reviewed_at=now(),
          consent_checked=true,consent_note=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','approved',
       'publication_status','private_awaiting_publication');
 end if;
 if p_action='reject' then
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   if length(v_reason) not between 8 and 500 then
      return jsonb_build_object('ok',false,'error','reason_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='rejected',reviewed_by=v_reviewer_name,reviewed_at=now(),
          reject_reason=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','rejected');
 end if;
 return jsonb_build_object('ok',false,'error','invalid');
end
$r40$;
revoke all on function public.nongkum_activity_photo_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_activity_photo_gateway(text,jsonb) to service_role;
 then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_id:=(p_data->>'id')::uuid;
 if p_action in ('finish','cancel') then
   select * into v_item from nongkum_sports.activity_photo_submissions
     where id=v_id and uploader_session_hash=v_hash for update;
   if not found or v_item.status<>'uploading' then
     return jsonb_build_object('ok',false,'error','stale');
   end if;
   if p_action='cancel' then
     update nongkum_sports.activity_photo_submissions
       set status='cancelled',reject_reason='upload_failed' where id=v_id;
     return jsonb_build_object('ok',true);
   end if;
   select case when (metadata->>'size') ~ '^[0-9]{1,8}$'
            then (metadata->>'size')::integer end, metadata->>'mimetype'
     into v_storage_size,v_storage_mime
     from storage.objects where bucket_id='nongkum-activity-intake' and name=v_item.storage_path;
   if not found or v_storage_size is distinct from v_item.byte_size
      or v_storage_mime is distinct from 'image/webp' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   update nongkum_sports.activity_photo_submissions
     set status='review',completed_at=now() where id=v_id;
   return jsonb_build_object('ok',true,'status','review');
 end if;


 select * into v_item from nongkum_sports.activity_photo_submissions
   where id=v_id for update;
 if not found then return jsonb_build_object('ok',false,'error','missing'); end if;

 if p_action='preview' then
   if v_item.status not in ('review','approved','rejected') then
     return jsonb_build_object('ok',false,'error','missing');
   end if;
   return jsonb_build_object('ok',true,'storage_path',v_item.storage_path,'byte_size',v_item.byte_size);
 end if;
 if v_item.status<>'review' then
   return jsonb_build_object('ok',false,'error','stale');
 end if;
 if p_action='approve' then
   if not exists (
     select 1 from public.nongkum_schedule_fixtures f
     join public.nongkum_schedule_active a on a.source_key=f.source_key and a.singleton=1
     where f.fixture_id=v_item.event_id and f.sport_id=v_item.sport_id and f.division=v_item.division
   ) then return jsonb_build_object('ok',false,'error','source_changed'); end if;
   v_reason:=btrim(coalesce(p_data->>'consent_note',''));
   if p_data->>'consent_checked'<>'true' or length(v_reason) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','consent_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='approved',reviewed_by=v_reviewer_name,reviewed_at=now(),
          consent_checked=true,consent_note=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','approved',
       'publication_status','private_awaiting_publication');
 end if;
 if p_action='reject' then
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   if length(v_reason) not between 8 and 500 then
      return jsonb_build_object('ok',false,'error','reason_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='rejected',reviewed_by=v_reviewer_name,reviewed_at=now(),
          reject_reason=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','rejected');
 end if;
 return jsonb_build_object('ok',false,'error','invalid');
end
$r40$;
revoke all on function public.nongkum_activity_photo_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_activity_photo_gateway(text,jsonb) to service_role;
)
);
create index if not exists r40_activity_photo_status_time_idx
 on nongkum_sports.activity_photo_submissions(status,submitted_at desc);
create index if not exists r40_activity_photo_rate_idx
 on nongkum_sports.activity_photo_submissions(uploader_session_hash,submitted_at desc);
alter table nongkum_sports.activity_photo_submissions enable row level security;
revoke all on nongkum_sports.activity_photo_submissions from public,anon,authenticated;
grant select,insert,update on nongkum_sports.activity_photo_submissions to service_role;

create or replace function public.nongkum_activity_photo_gateway(p_action text,p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','nongkum_sports','storage','extensions'
as $r40$
declare
 v_token text:=coalesce(p_data->>'token','');
 v_hash text;
 v_editor_found boolean:=false;
 v_reviewer_name text;
 v_event_id text;
 v_uploader text;
 v_caption text;
 v_source text;
 v_sport text;
 v_division text;
 v_size int;
 v_id uuid;
 v_item nongkum_sports.activity_photo_submissions%rowtype;
 v_storage_size int;
 v_storage_mime text;
 v_reason text;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object'
    or length(p_data::text)>2000
    or p_action not in ('prepare','finish','cancel','queue','preview','approve','reject')
    or v_token !~ '^[0-9a-f]{64}$' then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
 if p_action in ('prepare','finish','cancel') then
   select exists (
     select 1 from nongkum_sports.editor_sessions
     where token_hash=v_hash and revoked_at is null and expires_at>now()
   ) into v_editor_found;
   if not v_editor_found then
     return jsonb_build_object('ok',false,'error','expired');
   end if;
 else
   select reviewer_name into v_reviewer_name
     from nongkum_sports.reviewer_sessions
    where token_hash=v_hash and revoked_at is null and expires_at>now();
   if v_reviewer_name is null then
     return jsonb_build_object('ok',false,'error','expired');
   end if;
 end if;

 if p_action='prepare' then
   v_event_id:=coalesce(p_data->>'event_id','');
   v_uploader:=btrim(coalesce(p_data->>'uploaded_by',''));
   v_caption:=btrim(coalesce(p_data->>'caption',''));
   if length(v_event_id) not between 3 and 140 or
      length(v_uploader) not between 2 and 100 or
      length(v_caption) not between 3 and 120 or
      coalesce(p_data->>'mime_type','')<>'image/webp' or
      coalesce(p_data->>'byte_size','') !~ '^[0-9]{1,6}$' then
      return jsonb_build_object('ok',false,'error','invalid');
   end if;
   v_size:=(p_data->>'byte_size')::integer;
   if v_size not between 1000 and 350000 then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   if (select count(*) from nongkum_sports.activity_photo_submissions
         where uploader_session_hash=v_hash and submitted_at>now()-interval '1 hour')>=15 then
     return jsonb_build_object('ok',false,'error','limited');
   end if;
   select source_key into v_source from public.nongkum_schedule_active where singleton=1;
   if v_source is null then
      return jsonb_build_object('ok',false,'error','source_changed');
   end if;
   select sport_id,division into v_sport,v_division
     from public.nongkum_schedule_fixtures
    where source_key=v_source and fixture_id=v_event_id;
   if not found then
      return jsonb_build_object('ok',false,'error','source_changed');
   end if;
   v_id:=gen_random_uuid();
   insert into nongkum_sports.activity_photo_submissions
     (id,event_id,source_key,sport_id,division,storage_path,byte_size,caption,
      uploaded_by,uploader_session_hash,status)
   values (v_id,v_event_id,v_source,v_sport,v_division,
      'uploads/'||v_id::text||'.webp',v_size,v_caption,v_uploader,v_hash,'uploading');
   return jsonb_build_object('ok',true,'id',v_id,'storage_path','uploads/'||v_id::text||'.webp');
 end if;

 if p_action='queue' then
   return jsonb_build_object('ok',true,'items',coalesce((
     select jsonb_agg(jsonb_build_object('id',x.id,'event_id',x.event_id,
        'sport_id',x.sport_id,'division',x.division,'caption',x.caption,
        'uploaded_by',x.uploaded_by,'submitted_at',x.submitted_at))
     from (select id,event_id,sport_id,division,caption,uploaded_by,submitted_at
       from nongkum_sports.activity_photo_submissions where status='review'
       order by submitted_at asc limit 100) x
   ),'[]'::jsonb));
 end if;

 if coalesce(p_data->>'id','') !~ '^[0-9a-f-]{36}$' then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_id:=(p_data->>'id')::uuid;
 if p_action in ('finish','cancel') then
   select * into v_item from nongkum_sports.activity_photo_submissions
     where id=v_id and uploader_session_hash=v_hash for update;
   if not found or v_item.status<>'uploading' then
     return jsonb_build_object('ok',false,'error','stale');
   end if;
   if p_action='cancel' then
     update nongkum_sports.activity_photo_submissions
       set status='cancelled',reject_reason='upload_failed' where id=v_id;
     return jsonb_build_object('ok',true);
   end if;
   select case when (metadata->>'size') ~ '^[0-9]{1,8}$'
            then (metadata->>'size')::integer end, metadata->>'mimetype'
     into v_storage_size,v_storage_mime
     from storage.objects where bucket_id='nongkum-activity-intake' and name=v_item.storage_path;
   if not found or v_storage_size is distinct from v_item.byte_size
      or v_storage_mime is distinct from 'image/webp' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   update nongkum_sports.activity_photo_submissions
     set status='review',completed_at=now() where id=v_id;
   return jsonb_build_object('ok',true,'status','review');
 end if;


 select * into v_item from nongkum_sports.activity_photo_submissions
   where id=v_id for update;
 if not found then return jsonb_build_object('ok',false,'error','missing'); end if;

 if p_action='preview' then
   if v_item.status not in ('review','approved','rejected') then
     return jsonb_build_object('ok',false,'error','missing');
   end if;
   return jsonb_build_object('ok',true,'storage_path',v_item.storage_path,'byte_size',v_item.byte_size);
 end if;
 if v_item.status<>'review' then
   return jsonb_build_object('ok',false,'error','stale');
 end if;
 if p_action='approve' then
   if not exists (
     select 1 from public.nongkum_schedule_fixtures f
     join public.nongkum_schedule_active a on a.source_key=f.source_key and a.singleton=1
     where f.fixture_id=v_item.event_id and f.sport_id=v_item.sport_id and f.division=v_item.division
   ) then return jsonb_build_object('ok',false,'error','source_changed'); end if;
   v_reason:=btrim(coalesce(p_data->>'consent_note',''));
   if p_data->>'consent_checked'<>'true' or length(v_reason) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','consent_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='approved',reviewed_by=v_reviewer_name,reviewed_at=now(),
          consent_checked=true,consent_note=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','approved',
       'publication_status','private_awaiting_publication');
 end if;
 if p_action='reject' then
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   if length(v_reason) not between 8 and 500 then
      return jsonb_build_object('ok',false,'error','reason_required');
   end if;
   update nongkum_sports.activity_photo_submissions
      set status='rejected',reviewed_by=v_reviewer_name,reviewed_at=now(),
          reject_reason=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','rejected');
 end if;
 return jsonb_build_object('ok',false,'error','invalid');
end
$r40$;
revoke all on function public.nongkum_activity_photo_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_activity_photo_gateway(text,jsonb) to service_role;
