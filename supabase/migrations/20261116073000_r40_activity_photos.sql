-- R40: isolated youth sports photo intake; DO NOT touch meeting-evidence.
-- Migration source for organizer review. Apply only after PR merge + QA.
create table if not exists nongkum_sports.activity_photos (
 id uuid primary key,
 fixture_id text not null,
 sport_id text not null,
 division text not null,
 caption text not null,
 uploader_name text not null,
 uploader_session_hash text not null,
 source_sha256 text not null,
 file_bytes integer not null check (file_bytes between 100 and 650000),
 private_path text not null unique,
 public_path text unique,
 consent_attested boolean not null check (consent_attested),
 status text not null default 'pending' check (status in ('pending','publishing','approved','rejected')),
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by text,
 reviewer_session_hash text,
 rejection_reason text,
 revision integer not null default 1 check (revision>=1)
);
create index if not exists activity_photos_pending_idx on nongkum_sports.activity_photos(status,submitted_at desc);
create index if not exists activity_photos_published_idx on nongkum_sports.activity_photos(fixture_id,reviewed_at desc) where status='approved';
alter table nongkum_sports.activity_photos enable row level security;
revoke all on table nongkum_sports.activity_photos from public,anon,authenticated;

-- Separate from Meeting assets. Only service-role accesses unapproved storage objects.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('nongkum-activity-intake','nongkum-activity-intake',false,650000,array['image/webp'])
on conflict (id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('nongkum-activity-public','nongkum-activity-public',true,650000,array['image/webp'])
on conflict (id) do nothing;
-- No anon or authenticated write policies are created for either bucket.

create or replace function public.nongkum_activity_gateway(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public','nongkum_sports','storage','extensions'
as $r40$
declare
  v_token text := coalesce(p_data->>'token','');
  v_hash text;
  v_editor boolean := false;
  v_reviewer_name text;
  v_fixture public.nongkum_schedule_fixtures%rowtype;
  v_id uuid;
  v_id_string text;
  v_photo nongkum_sports.activity_photos%rowtype;
  v_count integer;
  v_caption text;
  v_uploader text;
  v_bytes integer;
  v_reason text;
  v_path text;
  v_public jsonb;
begin
  if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>8000 then
    return jsonb_build_object('ok',false,'error','invalid');
  end if;
  -- Public catalog deliberately discloses only approved display values, not original paths or staff names.
  if p_action='published' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'event_id',x.fixture_id,'sport_id',x.sport_id,'division',x.division,
      'caption',x.caption,'revision',x.revision,'path',x.public_path
    ) order by x.fixture_id),'[]'::jsonb) into v_public
    from (
      select distinct on (fixture_id) fixture_id,sport_id,division,caption,revision,public_path
      from nongkum_sports.activity_photos
      where status='approved' and public_path is not null
      order by fixture_id,reviewed_at desc,id desc
    ) x;
    return jsonb_build_object('ok',true,'approved_only',true,'photos',v_public);
  end if;
  if p_action not in ('preflight','register','queue','preview',
    'approve_prepare','approve_commit','approve_cancel','reject') then
    return jsonb_build_object('ok',false,'error','invalid');
  end if;
  if v_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
  select exists(select 1 from nongkum_sports.editor_sessions
      where token_hash=v_hash and revoked_at is null and expires_at>now()) into v_editor;
  select reviewer_name into v_reviewer_name from nongkum_sports.reviewer_sessions
    where token_hash=v_hash and revoked_at is null and expires_at>now();
  if p_action in ('preflight','register') and not v_editor then
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  if p_action not in ('preflight','register') and v_reviewer_name is null then
    return jsonb_build_object('ok',false,'error','expired');
  end if;

  if p_action in ('preflight','register') then
    v_id_string:=coalesce(p_data->>'fixture_id','');
    if length(v_id_string) not between 3 and 140 then
      return jsonb_build_object('ok',false,'error','invalid');
    end if;
    select f.* into v_fixture from public.nongkum_schedule_fixtures f
      join public.nongkum_schedule_active a on a.source_key=f.source_key
      where f.fixture_id=v_id_string limit 1;
    if not found then return jsonb_build_object('ok',false,'error','missing_fixture'); end if;
    select count(*) into v_count from nongkum_sports.activity_photos
      where submitted_at>now()-interval '24 hours';
    if v_count>=150 then return jsonb_build_object('ok',false,'error','limited'); end if;
    select count(*) into v_count from nongkum_sports.activity_photos
      where submitted_at>now()-interval '24 hours' and uploader_session_hash=v_hash;
    if v_count>=30 then return jsonb_build_object('ok',false,'error','limited'); end if;
    if p_action='preflight' then
      return jsonb_build_object('ok',true,'fixture_id',v_fixture.fixture_id,
        'sport_id',v_fixture.sport_id,'division',v_fixture.division,'kind',v_fixture.kind);
    end if;
    v_caption:=btrim(coalesce(p_data->>'caption',''));
    v_uploader:=btrim(coalesce(p_data->>'uploader_name',''));
    if length(v_caption) not between 3 and 120 or length(v_uploader) not between 2 and 60
      or coalesce(p_data->>'consent_attested','')<>'true'
      or coalesce(p_data->>'image_sha256','') !~ '^[0-9a-f]{64}$'
      or coalesce(p_data->>'file_bytes','') !~ '^[0-9]{1,6}$' then
      return jsonb_build_object('ok',false,'error','invalid');
    end if;
    v_bytes:=(p_data->>'file_bytes')::integer;
    if v_bytes not between 100 and 650000 then return jsonb_build_object('ok',false,'error','invalid'); end if;
    if coalesce(p_data->>'photo_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      return jsonb_build_object('ok',false,'error','invalid');
    end if;
    v_id:=(p_data->>'photo_id')::uuid;
    v_path:='photos/'||v_id::text||'.webp';
    if not exists(select 1 from storage.objects
       where bucket_id='nongkum-activity-intake' and name=v_path) then
      return jsonb_build_object('ok',false,'error','upload_missing');
    end if;
    insert into nongkum_sports.activity_photos
      (id,fixture_id,sport_id,division,caption,uploader_name,uploader_session_hash,
       source_sha256,file_bytes,private_path,consent_attested)
    values(v_id,v_fixture.fixture_id,v_fixture.sport_id,v_fixture.division,
      v_caption,v_uploader,v_hash,p_data->>'image_sha256',v_bytes,v_path,true);
    return jsonb_build_object('ok',true,'photo_id',v_id,'status','pending');
  end if;

  if p_action='queue' then
    select coalesce(jsonb_agg(jsonb_build_object(
       'photo_id',id,'fixture_id',fixture_id,'sport_id',sport_id,'division',division,
       'caption',caption,'uploader_name',uploader_name,'submitted_at',submitted_at,
       'consent_attested',consent_attested
    ) order by submitted_at desc),'[]'::jsonb) into v_public
    from nongkum_sports.activity_photos where status='pending';
    return jsonb_build_object('ok',true,'items',v_public);
  end if;

  v_id_string:=coalesce(p_data->>'photo_id','');
  if v_id_string !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok',false,'error','invalid');
  end if;
  v_id:=v_id_string::uuid;
  if p_action='preview' then
    select * into v_photo from nongkum_sports.activity_photos where id=v_id and status='pending';
    if not found then return jsonb_build_object('ok',false,'error','missing'); end if;
    return jsonb_build_object('ok',true,'private_path',v_photo.private_path);
  end if;
  if p_action='reject' then
    v_reason:=btrim(coalesce(p_data->>'reason',''));
    if length(v_reason) not between 8 and 500 then
      return jsonb_build_object('ok',false,'error','reason_required');
    end if;
    update nongkum_sports.activity_photos set status='rejected',rejection_reason=v_reason,
      reviewed_by=v_reviewer_name,reviewed_at=now(),reviewer_session_hash=v_hash
    where id=v_id and status='pending'
    returning * into v_photo;
    if not found then return jsonb_build_object('ok',false,'error','stale'); end if;
    return jsonb_build_object('ok',true,'status','rejected');
  end if;
  if p_action='approve_prepare' then
    if coalesce(p_data->>'consent_verified','')<>'true' then
      return jsonb_build_object('ok',false,'error','consent_required');
    end if;
    update nongkum_sports.activity_photos set status='publishing',
      reviewer_session_hash=v_hash,reviewed_by=v_reviewer_name
    where id=v_id and status='pending' and consent_attested=true
    returning * into v_photo;
    if not found then return jsonb_build_object('ok',false,'error','stale'); end if;
    return jsonb_build_object('ok',true,'private_path',v_photo.private_path,
      'public_path',v_photo.private_path);
  end if;
  if p_action='approve_cancel' then
    update nongkum_sports.activity_photos set status='pending',
       reviewer_session_hash=null,reviewed_by=null
    where id=v_id and status='publishing' and reviewer_session_hash=v_hash
    returning * into v_photo;
    return jsonb_build_object('ok',found,'error',case when found then null else 'stale' end);
  end if;
  if p_action='approve_commit' then
    update nongkum_sports.activity_photos set status='approved',
       public_path=private_path,reviewed_at=now()
    where id=v_id and status='publishing' and reviewer_session_hash=v_hash
      and exists(select 1 from storage.objects
       where bucket_id='nongkum-activity-public' and name=private_path)
    returning * into v_photo;
    if not found then return jsonb_build_object('ok',false,'error','stale'); end if;
    return jsonb_build_object('ok',true,'status','approved','event_id',v_photo.fixture_id);
  end if;
  return jsonb_build_object('ok',false,'error','invalid');
end
$r40$;

revoke all on function public.nongkum_activity_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function public.nongkum_activity_gateway(text,jsonb) to service_role;
