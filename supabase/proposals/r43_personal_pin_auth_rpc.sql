-- R43-F: personal PIN authentication RPC (proposal ONLY; NOT deployed).
-- Requires r43_personal_pin_private_identity.sql. Does not grant public API access.
-- Each PIN is random, >=10 decimal digits, HMAC-SHA256 with an Edge-only pepper.
-- Only service_role may call this atomic login/session RPC; never expose service key.
grant delete on nongkum_sports.r43_staff_login_limits to service_role;

-- Authority comes only from r43_roles after the guarded actor-FK migration.
-- Do not duplicate permissions in r43_staff_identities.

create or replace function public.nongkum_r43_personal_pin_auth(
  p_action text, p_pin_mac text, p_session_hash text,
  p_client_key text, p_global_key text
) returns jsonb
language plpgsql security invoker
set search_path to 'pg_catalog','public','nongkum_sports'
as $auth$
declare
  v_now timestamptz := clock_timestamp();
  v_actor record;
  v_limited timestamptz;
  v_attempts integer;
  v_key text;
  v_limit integer;
  v_period interval;
  v_lock interval;
  v_idx integer;
begin
  if p_action not in ('login','status','logout')
     or coalesce(p_session_hash,'') !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error','invalid');
  end if;

  if p_action='login' then
    if coalesce(p_pin_mac,'') !~ '^[0-9a-f]{64}$'
      or coalesce(p_client_key,'') !~ '^[0-9a-f]{64}$'
      or coalesce(p_global_key,'') !~ '^[0-9a-f]{64}$'
      or p_client_key=p_global_key then
      return jsonb_build_object('ok',false,'error','invalid');
    end if;

    -- Atomic, persisted limiter. BOTH per-client and global counters are
    -- checked on EVERY attempt, including unknown or disabled PINs.
    for v_idx in 1..2 loop
      v_key:=case when v_idx=1 then p_client_key else p_global_key end;
      v_limit:=case when v_idx=1 then 6 else 90 end;
      v_period:=case when v_idx=1 then interval '10 minutes' else interval '1 minute' end;
      v_lock:=case when v_idx=1 then interval '10 minutes' else interval '1 minute' end;
      insert into nongkum_sports.r43_staff_login_limits as l
        (client_key,window_start,attempts,locked_until)
      values (v_key,v_now,1,null)
      on conflict(client_key) do update set
        attempts=case when l.window_start < v_now-v_period then 1
                      else l.attempts+1 end,
        window_start=case when l.window_start < v_now-v_period then v_now
                          else l.window_start end,
        locked_until=case
          when l.locked_until>v_now then l.locked_until
          when l.window_start < v_now-v_period then null
          when l.attempts+1>=v_limit then v_now+v_lock
          else null end
      returning attempts,locked_until into v_attempts,v_limited;
      if v_limited>v_now then
        return jsonb_build_object('ok',false,'error','limited');
      end if;
    end loop;

    select s.id,s.full_name,s.school_id,r.can_propose,r.can_assign,r.can_review,
           k.pin_version
      into v_actor
      from nongkum_sports.r43_staff_pin_keys k
      join nongkum_sports.r43_staff_identities s on s.id=k.staff_id
      join nongkum_sports.r43_roles r on r.user_id=s.id and r.active=true
     where k.pin_lookup_mac=p_pin_mac
       and s.active=true and s.revoked_at is null
       and (r.can_propose or r.can_assign or r.can_review);
    if not found then
      return jsonb_build_object('ok',false,'error','unauthenticated');
    end if;
    insert into nongkum_sports.r43_staff_sessions
      (token_hash,staff_id,pin_version,issued_at,expires_at)
    values(p_session_hash,v_actor.id,v_actor.pin_version,v_now,v_now+interval '6 hours');
    -- Successful login clears the per-client counter, NOT global throttling.
    delete from nongkum_sports.r43_staff_login_limits where client_key=p_client_key;
    return jsonb_build_object('ok',true,'staff_id',v_actor.id,
      'full_name',v_actor.full_name,'school_id',v_actor.school_id,'can_propose',v_actor.can_propose,
      'can_assign',v_actor.can_assign,'can_review',v_actor.can_review,
      'expires_at',v_now+interval '6 hours');
  end if;

  if p_action='logout' then
    update nongkum_sports.r43_staff_sessions set revoked_at=v_now
     where token_hash=p_session_hash and revoked_at is null;
    return jsonb_build_object('ok',true);
  end if;

  -- A disabled identity, rotated PIN, expired or revoked session is rejected.
  select s.id,s.full_name,s.school_id,r.can_propose,r.can_assign,r.can_review,
         t.expires_at into v_actor
    from nongkum_sports.r43_staff_sessions t
    join nongkum_sports.r43_staff_identities s on s.id=t.staff_id
    join nongkum_sports.r43_staff_pin_keys k on k.staff_id=s.id
    join nongkum_sports.r43_roles r on r.user_id=s.id and r.active=true
   where t.token_hash=p_session_hash and t.revoked_at is null
     and t.expires_at>v_now and s.active=true and s.revoked_at is null
     and t.pin_version=k.pin_version
     and (r.can_propose or r.can_assign or r.can_review);
  if not found then
    return jsonb_build_object('ok',false,'error','unauthenticated');
  end if;
  return jsonb_build_object('ok',true,'staff_id',v_actor.id,
    'full_name',v_actor.full_name,'school_id',v_actor.school_id,'can_propose',v_actor.can_propose,
    'can_assign',v_actor.can_assign,'can_review',v_actor.can_review,
    'expires_at',v_actor.expires_at);
end
$auth$;
revoke all on function public.nongkum_r43_personal_pin_auth(
  text,text,text,text,text) from PUBLIC,anon,authenticated;
grant execute on function public.nongkum_r43_personal_pin_auth(
  text,text,text,text,text) to service_role;
