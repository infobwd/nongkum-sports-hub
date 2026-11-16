-- R40-H: show only status metadata for photos submitted with the *current* editor session.
-- Never return private Storage path, names, consent evidence, image bytes or unpublished URL.
create or replace function public.nongkum_activity_photo_my_submissions(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','nongkum_sports','extensions'
as $r40h$
declare
  v_hash text;
begin
  if coalesce(p_token,'') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  v_hash:=encode(extensions.digest(p_token,'sha256'),'hex');
  if not exists (
    select 1 from nongkum_sports.editor_sessions
    where token_hash=v_hash and revoked_at is null and expires_at>now()
  ) then
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  return jsonb_build_object(
    'ok',true,
    'items',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'event_id',x.event_id,
        'sport_id',x.sport_id,'division',x.division,
        'caption',x.caption,'submitted_at',x.submitted_at,
        'status',x.status,'publication_status',x.publication_status,
        'published_at',x.published_at
      ) order by x.submitted_at desc)
      from (
        select id,event_id,sport_id,division,caption,submitted_at,
          status,publication_status,published_at
        from nongkum_sports.activity_photo_submissions
        where uploader_session_hash=v_hash and status not in ('uploading','cancelled')
        order by submitted_at desc limit 30
      ) x
    ),'[]'::jsonb)
  );
end
$r40h$;
revoke all on function public.nongkum_activity_photo_my_submissions(text)
  from public,anon,authenticated;
grant execute on function public.nongkum_activity_photo_my_submissions(text)
  to service_role;
