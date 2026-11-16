-- R40-G: explicit public publication of event photos; never auto-publish R40 approved rows.
-- This migration is NOT applied by merely merging it. Run security review before deployment.
-- R40 status 'approved' remains internal consent. Public consent is separate and opt-in.
create table if not exists public.nongkum_public_activity_photos (
  id uuid primary key,
  event_id text not null,
  sport_id text not null,
  division text not null,
  event_date date,
  caption text not null check (length(caption) between 3 and 120),
  object_path text not null unique check (object_path ~ '^media/[0-9a-f-]{36}[.](webp|jpg)$'),
  mime_type text not null check (mime_type in ('image/webp','image/jpeg')),
  published_at timestamptz not null default now()
);
create index if not exists r40g_public_sport_date_idx
 on public.nongkum_public_activity_photos(sport_id,event_date,published_at desc);
create index if not exists r40g_public_event_idx
 on public.nongkum_public_activity_photos(event_id,published_at asc);
alter table public.nongkum_public_activity_photos enable row level security;
revoke all on public.nongkum_public_activity_photos from public,anon,authenticated;
grant select on public.nongkum_public_activity_photos to anon,authenticated;
grant select,insert,update,delete on public.nongkum_public_activity_photos to service_role;
drop policy if exists r40g_published_read on public.nongkum_public_activity_photos;
create policy r40g_published_read on public.nongkum_public_activity_photos
 for select to anon,authenticated using (true);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('nongkum-activity-public','nongkum-activity-public',true,350000,
        array['image/webp','image/jpeg']::text[])
on conflict (id) do update
set public=true,file_size_limit=350000,
    allowed_mime_types=array['image/webp','image/jpeg']::text[];
-- Public bucket is readable, but no client INSERT/UPDATE/DELETE policy is granted.
-- Only service_role in the server-side Edge Function may copy approved images here.

alter table nongkum_sports.activity_photo_submissions
  add column if not exists publication_status text not null default 'private'
    check (publication_status in ('private','publishing','failed','published','revoked')),
  add column if not exists public_object_path text,
  add column if not exists public_consent_note text,
  add column if not exists public_consented_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by text,
  add column if not exists revoke_reason text;
create index if not exists r40g_publication_status_idx
 on nongkum_sports.activity_photo_submissions(publication_status,reviewed_at desc);
-- Existing rows, including approved photos, remain 'private' intentionally.

create or replace function public.nongkum_activity_photo_publication_gateway(p_action text,p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','nongkum_sports','storage','extensions'
as $r40g$
declare
 v_token text:=coalesce(p_data->>'token','');
 v_hash text;
 v_reviewer text;
 v_id uuid;
 v_item nongkum_sports.activity_photo_submissions%rowtype;
 v_note text;
 v_reason text;
 v_path text;
 v_size integer;
 v_mime text;
 v_date date;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object'
    or length(p_data::text)>2000
    or p_action not in ('queue','prepare','finish','fail','revoke')
    or v_token !~ '^[0-9a-f]{64}$' then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
 select reviewer_name into v_reviewer from nongkum_sports.reviewer_sessions
  where token_hash=v_hash and revoked_at is null and expires_at>now();
 if v_reviewer is null then
   return jsonb_build_object('ok',false,'error','expired');
 end if;

 if p_action='queue' then
   return jsonb_build_object('ok',true,'items',coalesce((
     select jsonb_agg(jsonb_build_object(
       'id',q.id,'event_id',q.event_id,'sport_id',q.sport_id,
       'division',q.division,'caption',q.caption,'uploaded_by',q.uploaded_by,
       'submitted_at',q.submitted_at,'status',q.status,
       'publication_status',q.publication_status,'published_at',q.published_at))
     from (
       select id,event_id,sport_id,division,caption,uploaded_by,submitted_at,
              status,publication_status,published_at
       from nongkum_sports.activity_photo_submissions
       where status='approved'
       order by reviewed_at desc nulls last limit 100
     ) q
   ),'[]'::jsonb));
 end if;

 if coalesce(p_data->>'id','') !~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_id:=(p_data->>'id')::uuid;
 select * into v_item from nongkum_sports.activity_photo_submissions
  where id=v_id for update;
 if not found then return jsonb_build_object('ok',false,'error','missing'); end if;

 if p_action='prepare' then
   v_note:=btrim(coalesce(p_data->>'public_consent_note',''));
   if p_data->>'public_consent_checked'<>'true' or length(v_note) not between 8 and 500 then
     return jsonb_build_object('ok',false,'error','consent_required');
   end if;
   if v_item.status not in ('review','approved')
      or v_item.publication_status not in ('private','failed') then
     return jsonb_build_object('ok',false,'error','stale');
   end if;
   if not exists (
      select 1 from public.nongkum_schedule_fixtures f
      join public.nongkum_schedule_active a on a.source_key=f.source_key and a.singleton=1
      where f.fixture_id=v_item.event_id and f.source_key=v_item.source_key
        and f.sport_id=v_item.sport_id and f.division=v_item.division
   ) then return jsonb_build_object('ok',false,'error','source_changed'); end if;
   v_path:='media/'||gen_random_uuid()::text||
     case when v_item.mime_type='image/webp' then '.webp' else '.jpg' end;
   update nongkum_sports.activity_photo_submissions set
       status='approved',reviewed_by=v_reviewer,reviewed_at=now(),
       consent_checked=true,
       consent_note=coalesce(consent_note,v_note),
       publication_status='publishing',public_object_path=v_path,
       public_consent_note=v_note,public_consented_at=now()
   where id=v_id;
   return jsonb_build_object('ok',true,'id',v_id,'private_path',v_item.storage_path,
       'public_path',v_path,'mime_type',v_item.mime_type,'byte_size',v_item.byte_size);
 end if;

 if p_action='finish' then
   if v_item.status<>'approved' or v_item.publication_status<>'publishing' then
      return jsonb_build_object('ok',false,'error','stale');
   end if;
   select case when (metadata->>'size') ~ '^[0-9]{1,8}$'
       then (metadata->>'size')::int end,metadata->>'mimetype'
   into v_size,v_mime from storage.objects
   where bucket_id='nongkum-activity-public' and name=v_item.public_object_path;
   if not found or v_size is distinct from v_item.byte_size
      or v_mime is distinct from v_item.mime_type then
      return jsonb_build_object('ok',false,'error','invalid');
   end if;
   select case when f.date_confirmed then f.draft_date else null end into v_date
   from public.nongkum_schedule_fixtures f
   join public.nongkum_schedule_active a on a.singleton=1 and a.source_key=f.source_key
   where f.fixture_id=v_item.event_id and f.source_key=v_item.source_key
     and f.sport_id=v_item.sport_id and f.division=v_item.division;
   if not found then return jsonb_build_object('ok',false,'error','source_changed'); end if;
   insert into public.nongkum_public_activity_photos
     (id,event_id,sport_id,division,event_date,caption,object_path,mime_type)
   values (v_item.id,v_item.event_id,v_item.sport_id,v_item.division,
     v_date,v_item.caption,v_item.public_object_path,v_item.mime_type)
   on conflict (id) do nothing;
   update nongkum_sports.activity_photo_submissions
      set publication_status='published',published_at=now()
      where id=v_id;
   return jsonb_build_object('ok',true,'status','published');
 end if;

 if p_action='fail' then
   if v_item.publication_status<>'publishing' then
     return jsonb_build_object('ok',false,'error','stale');
   end if;
   update nongkum_sports.activity_photo_submissions
      set publication_status='failed' where id=v_id;
   return jsonb_build_object('ok',true,'status','failed');
 end if;

 if p_action='revoke' then
   -- A retry after partial Storage cleanup must not re-open or re-publish the photo.
   if v_item.publication_status='revoked' then
     return jsonb_build_object('ok',true,'status','revoked',
       'public_path',v_item.public_object_path);
   end if;
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   if length(v_reason) not between 8 and 500 then
      return jsonb_build_object('ok',false,'error','reason_required');
   end if;
   if v_item.publication_status<>'published' then
      return jsonb_build_object('ok',false,'error','stale');
   end if;
   -- Hide from the public catalog first, keeping original and consent audit private.
   delete from public.nongkum_public_activity_photos where id=v_id;
   update nongkum_sports.activity_photo_submissions
     set publication_status='revoked',revoked_at=now(),
         revoked_by=v_reviewer,revoke_reason=v_reason where id=v_id;
   return jsonb_build_object('ok',true,'status','revoked',
      'public_path',v_item.public_object_path);
 end if;
 return jsonb_build_object('ok',false,'error','invalid');
end
$r40g$;
revoke all on function public.nongkum_activity_photo_publication_gateway(text,jsonb)
 from public,anon,authenticated;
grant execute on function public.nongkum_activity_photo_publication_gateway(text,jsonb)
 to service_role;
