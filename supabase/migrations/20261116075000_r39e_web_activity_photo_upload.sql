-- R39-E: private photo intake + separately reviewed public derivatives.
-- Keep all Meeting evidence buckets/tables untouched. No public write permissions.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
 ('nongkum-sports-photo-pending','nongkum-sports-photo-pending',false,350000,array['image/webp']::text[]),
 ('nongkum-sports-photo-public','nongkum-sports-photo-public',true,350000,array['image/webp']::text[])
on conflict (id) do nothing;

do $$
begin
 if (select count(*) from storage.buckets
     where id in ('nongkum-sports-photo-pending','nongkum-sports-photo-public')
       and file_size_limit=350000 and allowed_mime_types=array['image/webp']::text[]
       and public=(id='nongkum-sports-photo-public'))<>2 then
   raise exception 'R39E bucket configuration conflict — review manually';
 end if;
end $$;

create table if not exists nongkum_sports.activity_photos (
 id uuid primary key default gen_random_uuid(),
 fixture_id text not null,
 source_key text not null,
 sport_id text not null,
 division text not null,
 caption text not null check (char_length(caption) between 3 and 120 and caption !~ '[[:cntrl:]]'),
 private_path text not null unique,
 public_path text unique,
 file_size integer not null check (file_size between 1 and 350000),
 mime_type text not null default 'image/webp' check (mime_type='image/webp'),
 uploader_token_hash text not null,
 status text not null default 'reserved'
   check (status in ('reserved','pending','approved','rejected','withdrawn')),
 created_at timestamptz not null default now(),
 uploaded_at timestamptz,
 reviewed_at timestamptz,
 reviewed_by text,
 review_reason text,
 consent_checked boolean not null default false,
 publication_revision integer check (publication_revision is null or publication_revision>0)
);
create index if not exists activity_photos_status_created
 on nongkum_sports.activity_photos(status,created_at desc);
create index if not exists activity_photos_fixture
 on nongkum_sports.activity_photos(fixture_id,created_at desc);
create index if not exists activity_photos_uploader_rate
 on nongkum_sports.activity_photos(uploader_token_hash,created_at desc);

create table if not exists nongkum_sports.activity_photo_actions (
 id bigint generated always as identity primary key,
 photo_id uuid not null references nongkum_sports.activity_photos(id),
 action text not null check(action in ('reserved','submitted','approved','rejected','withdrawn')),
 actor_role text not null check(actor_role in ('editor','reviewer')),
 actor_name text,
 reason text,
 created_at timestamptz not null default now()
);

-- This is the ONLY public image metadata. Private paths and reviewer identities are never included.
create table if not exists public.nongkum_published_activity_photos (
 fixture_id text primary key,
 sport_id text not null,
 division text not null,
 caption text not null,
 image_path text not null check (image_path ~ '^approved/[0-9a-f-]{36}\.webp$'),
 revision integer not null check (revision>=1),
 photo_id uuid not null unique,
 published_at timestamptz not null default now()
);
alter table public.nongkum_published_activity_photos enable row level security;
drop policy if exists r39e_read_published_activities on public.nongkum_published_activity_photos;
create policy r39e_read_published_activities on public.nongkum_published_activity_photos
  for select to anon,authenticated using (true);
revoke all on public.nongkum_published_activity_photos from public,anon,authenticated;
grant select on public.nongkum_published_activity_photos to anon,authenticated;
grant select,insert,update,delete on public.nongkum_published_activity_photos to service_role;
grant usage on schema nongkum_sports to service_role;
revoke all on nongkum_sports.activity_photos,nongkum_sports.activity_photo_actions
  from public,anon,authenticated;
grant select,insert,update,delete on nongkum_sports.activity_photos,
  nongkum_sports.activity_photo_actions to service_role;
grant usage,select on sequence nongkum_sports.activity_photo_actions_id_seq to service_role;

create or replace function public.nongkum_photo_gateway(p_action text,p_data jsonb)
returns jsonb
language plpgsql
set search_path to pg_catalog,public,nongkum_sports,extensions
as $$
declare
 v_token text; v_hash text; v_editor boolean := false; v_reviewer text;
 v_id uuid; v_photo nongkum_sports.activity_photos%rowtype;
 v_fixture text; v_sport text; v_division text; v_caption text;
 v_source text; v_current_sport text; v_current_division text;
 v_bytes int; v_path text; v_public text; v_old text; v_revision int;
 v_reason text; v_items jsonb;
begin
 if p_action not in ('status','reserve','finalize','abandon','queue','published','get','approve','reject','withdraw')
    or p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>6000 then
   return jsonb_build_object('ok',false,'error','invalid');
 end if;
 v_token:=coalesce(p_data->>'token','');
 if v_token !~ '^[0-9a-f]{64}$' then
   return jsonb_build_object('ok',false,'error','expired');
 end if;
 v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
 select exists(select 1 from nongkum_sports.editor_sessions
   where token_hash=v_hash and revoked_at is null and expires_at>now()) into v_editor;
 select reviewer_name into v_reviewer from nongkum_sports.reviewer_sessions
   where token_hash=v_hash and revoked_at is null and expires_at>now();
 if p_action in ('status','reserve','finalize','abandon') and not v_editor then
   return jsonb_build_object('ok',false,'error','expired');
 end if;
 if p_action in ('queue','published','get','approve','reject','withdraw') and v_reviewer is null then
   return jsonb_build_object('ok',false,'error','expired');
 end if;
 if p_action='status' then
   return jsonb_build_object('ok',true,'role','editor');
 end if;
 if p_action='reserve' then
   v_fixture:=coalesce(p_data->>'fixture_id','');
   v_caption:=btrim(coalesce(p_data->>'caption',''));
   if char_length(v_fixture) not between 4 and 160 or v_fixture ~ '[[:cntrl:]]'
     or char_length(v_caption) not between 3 and 120 or v_caption ~ '[[:cntrl:]]'
     or (p_data->>'file_size') !~ '^[0-9]{1,6}$' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   v_bytes:=(p_data->>'file_size')::int;
   if v_bytes<1 or v_bytes>350000 then return jsonb_build_object('ok',false,'error','too_large'); end if;
   select source_key into v_source from public.nongkum_schedule_active where singleton=1;
   select sport_id,division into v_sport,v_division from public.nongkum_schedule_fixtures
     where source_key=v_source and fixture_id=v_fixture;
   if not found then return jsonb_build_object('ok',false,'error','fixture_missing'); end if;
   -- Advisory lock makes the per-editor/global limits meaningful even with simultaneous requests.
   perform pg_advisory_xact_lock(703459);
   if (select count(*) from nongkum_sports.activity_photos
        where uploader_token_hash=v_hash and created_at>now()-interval '15 minutes')>=20
      or (select count(*) from nongkum_sports.activity_photos
        where created_at>now()-interval '1 day')>=500
      or (select count(*) from nongkum_sports.activity_photos
        where fixture_id=v_fixture and created_at>now()-interval '1 day')>=8 then
      return jsonb_build_object('ok',false,'error','limited');
   end if;
   v_id:=gen_random_uuid(); v_path:='pending/'||v_id::text||'.webp';
   insert into nongkum_sports.activity_photos
     (id,fixture_id,source_key,sport_id,division,caption,private_path,file_size,uploader_token_hash)
     values(v_id,v_fixture,v_source,v_sport,v_division,v_caption,v_path,v_bytes,v_hash);
   insert into nongkum_sports.activity_photo_actions(photo_id,action,actor_role)
     values(v_id,'reserved','editor');
   return jsonb_build_object('ok',true,'id',v_id,'path',v_path);
 end if;
 if p_action in ('finalize','abandon') then
   begin v_id:=(p_data->>'id')::uuid; exception when others then
     return jsonb_build_object('ok',false,'error','invalid');
   end;
   select * into v_photo from nongkum_sports.activity_photos
      where id=v_id and uploader_token_hash=v_hash for update;
   if not found or v_photo.status<>'reserved' or v_photo.created_at<now()-interval '10 minutes' then
      return jsonb_build_object('ok',false,'error','stale');
   end if;
   if p_action='abandon' then
     delete from nongkum_sports.activity_photo_actions where photo_id=v_id;
     delete from nongkum_sports.activity_photos where id=v_id;
     return jsonb_build_object('ok',true);
   end if;
   update nongkum_sports.activity_photos set status='pending',uploaded_at=now() where id=v_id;
   insert into nongkum_sports.activity_photo_actions(photo_id,action,actor_role)
       values(v_id,'submitted','editor');
   return jsonb_build_object('ok',true,'id',v_id,'status','pending');
 end if;
 if p_action='queue' then
   select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb)
     into v_items from (select id,fixture_id,sport_id,division,caption,file_size,
       created_at,uploaded_at from nongkum_sports.activity_photos
       where status='pending' order by created_at desc limit 80) q;
   return jsonb_build_object('ok',true,'items',v_items);
 end if;
 if p_action='published' then
   select coalesce(jsonb_agg(to_jsonb(q) order by q.published_at desc),'[]'::jsonb)
     into v_items from (select fixture_id,sport_id,division,caption,revision,published_at
       from public.nongkum_published_activity_photos
       order by published_at desc limit 80) q;
   return jsonb_build_object('ok',true,'items',v_items);
 end if;
 if p_action in ('get','approve','reject') then
   begin v_id:=(p_data->>'id')::uuid; exception when others then
     return jsonb_build_object('ok',false,'error','invalid');
   end;
   select * into v_photo from nongkum_sports.activity_photos
      where id=v_id and status='pending' for update;
   if not found then return jsonb_build_object('ok',false,'error','missing'); end if;
   if p_action='get' then
     return jsonb_build_object('ok',true,'id',v_id,'path',v_photo.private_path,
       'caption',v_photo.caption,'fixture_id',v_photo.fixture_id,'file_size',v_photo.file_size);
   end if;
   if p_action='reject' then
     v_reason:=btrim(coalesce(p_data->>'reason',''));
     if char_length(v_reason)<8 or char_length(v_reason)>400 or v_reason ~ '[[:cntrl:]]' then
       return jsonb_build_object('ok',false,'error','reason_required');
     end if;
     update nongkum_sports.activity_photos set status='rejected',reviewed_at=now(),
       reviewed_by=v_reviewer,review_reason=v_reason where id=v_id;
     insert into nongkum_sports.activity_photo_actions(photo_id,action,actor_role,actor_name,reason)
       values(v_id,'rejected','reviewer',v_reviewer,v_reason);
     return jsonb_build_object('ok',true,'status','rejected');
   end if;
   if p_data->>'consent_checked'<>'true' then
     return jsonb_build_object('ok',false,'error','consent_required');
   end if;
   v_public:=coalesce(p_data->>'public_path','');
   if v_public <> 'approved/'||v_id::text||'.webp' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   select source_key into v_source from public.nongkum_schedule_active where singleton=1;
   select sport_id,division into v_current_sport,v_current_division
     from public.nongkum_schedule_fixtures
     where source_key=v_source and fixture_id=v_photo.fixture_id;
   if v_source is distinct from v_photo.source_key or not found or
     v_photo.sport_id is distinct from v_current_sport or
     v_photo.division is distinct from v_current_division then
     return jsonb_build_object('ok',false,'error','source_changed');
   end if;
   -- Serialize approvals for one fixture without locking unrelated events.
   perform pg_advisory_xact_lock(703460,hashtext(v_photo.fixture_id));
   select image_path,revision into v_old,v_revision
      from public.nongkum_published_activity_photos
      where fixture_id=v_photo.fixture_id for update;
   v_revision:=coalesce(v_revision,0)+1;
   insert into public.nongkum_published_activity_photos
     (fixture_id,sport_id,division,caption,image_path,revision,photo_id,published_at)
   values(v_photo.fixture_id,v_photo.sport_id,v_photo.division,v_photo.caption,
      v_public,v_revision,v_id,now())
   on conflict(fixture_id) do update set
     sport_id=excluded.sport_id,division=excluded.division,caption=excluded.caption,
     image_path=excluded.image_path,revision=excluded.revision,
     photo_id=excluded.photo_id,published_at=excluded.published_at;
   update nongkum_sports.activity_photos set status='approved',public_path=v_public,
     consent_checked=true,reviewed_at=now(),reviewed_by=v_reviewer,
     publication_revision=v_revision where id=v_id;
   insert into nongkum_sports.activity_photo_actions(photo_id,action,actor_role,actor_name)
     values(v_id,'approved','reviewer',v_reviewer);
   return jsonb_build_object('ok',true,'status','approved','revision',v_revision,
     'replaced_path',v_old);
 end if;
 if p_action='withdraw' then
   v_fixture:=coalesce(p_data->>'fixture_id','');
   v_reason:=btrim(coalesce(p_data->>'reason',''));
   if char_length(v_fixture) not between 4 and 160 or char_length(v_reason)<8
      or char_length(v_reason)>400 or v_reason ~ '[[:cntrl:]]' then
     return jsonb_build_object('ok',false,'error','invalid');
   end if;
   select photo_id,image_path into v_id,v_public
     from public.nongkum_published_activity_photos where fixture_id=v_fixture for update;
   if not found then return jsonb_build_object('ok',false,'error','missing'); end if;
   delete from public.nongkum_published_activity_photos where fixture_id=v_fixture;
   update nongkum_sports.activity_photos set status='withdrawn',reviewed_at=now(),
     reviewed_by=v_reviewer,review_reason=v_reason where id=v_id;
   insert into nongkum_sports.activity_photo_actions(photo_id,action,actor_role,actor_name,reason)
     values(v_id,'withdrawn','reviewer',v_reviewer,v_reason);
   return jsonb_build_object('ok',true,'removed_path',v_public);
 end if;
 return jsonb_build_object('ok',false,'error','invalid');
end $$;
revoke all on function public.nongkum_photo_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_photo_gateway(text,jsonb) to service_role;
