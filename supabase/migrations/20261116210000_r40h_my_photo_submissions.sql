-- R40-H: read-only "my submissions" scoped to the active editor session.
-- Uploaded-by text is not an identity. Never return paths, tokens, private URLs or reviewer audit.
create or replace function public.nongkum_activity_photo_my_uploads_gateway(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','nongkum_sports','extensions'
as $r40h$
declare
  v_token text:=coalesce(p_data->>'token','');
  v_hash text;
begin
  if p_data is null or jsonb_typeof(p_data)<>'object'
     or length(p_data::text)>500
     or v_token !~ '^[0-9a-f]{64}$' then
     return jsonb_build_object('ok',false,'error','invalid');
  end if;
  v_hash:=encode(extensions.digest(v_token,'sha256'),'hex');
  if not exists (
    select 1 from nongkum_sports.editor_sessions
    where token_hash=v_hash and revoked_at is null and expires_at>now()
  ) then
    return jsonb_build_object('ok',false,'error','expired');
  end if;
  return jsonb_build_object('ok',true,'items',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',x.id,'event_id',x.event_id,'sport_id',x.sport_id,
      'division',x.division,'caption',x.caption,
      'submitted_at',x.submitted_at,'status',x.status,
      'publication_status',x.publication_status,
      'reject_reason',case when x.status='rejected' then x.reject_reason else null end
    ))
    from (
      select id,event_id,sport_id,division,caption,submitted_at,
             status,publication_status,reject_reason
      from nongkum_sports.activity_photo_submissions
      where uploader_session_hash=v_hash and status <> 'cancelled'
      order by submitted_at desc limit 50
    ) x
  ),'[]'::jsonb));
end
$r40h$;
revoke all on function public.nongkum_activity_photo_my_uploads_gateway(jsonb)
  from public,anon,authenticated;
grant execute on function public.nongkum_activity_photo_my_uploads_gateway(jsonb)
  to service_role;
