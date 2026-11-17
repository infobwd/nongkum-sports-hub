-- R43-F: authorize a private R43 action only when a named Supabase Auth user
-- has both a specifically granted R43 role AND an active R34/R37 session.
-- NOTE: proposal only. Do not install in Meeting until review/QA is complete.
-- Uses existing six-hour results sessions; no PIN or raw token is persisted here.
create or replace function public.nongkum_r43_pin_session_valid(
  p_user uuid, p_kind text, p_token text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p_user is not null
    and p_kind in ('editor','reviewer')
    and p_token ~ '^[0-9a-f]{64}$'
    and exists (
      select 1
      from nongkum_sports.r43_roles r
      where r.user_id = p_user
        and r.active is true
        and (
          (p_kind = 'editor' and (r.can_propose is true or r.can_assign is true))
          or (p_kind = 'reviewer' and r.can_review is true)
        )
    )
    and (
      (
        p_kind = 'editor'
        and exists (
          select 1 from nongkum_sports.editor_sessions s
          where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
            and s.revoked_at is null and s.expires_at > now()
        )
      )
      or
      (
        p_kind = 'reviewer'
        and exists (
          select 1 from nongkum_sports.reviewer_sessions s
          where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
            and s.revoked_at is null and s.expires_at > now()
        )
      )
    );
$$;
revoke all on function public.nongkum_r43_pin_session_valid(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.nongkum_r43_pin_session_valid(uuid,text,text)
  to service_role;

-- Threat model:
-- * Shared PIN alone never supplies actor identity or creates a role.
-- * Supabase Auth user ID is resolved server-side and cannot be supplied from browser.
-- * This function is read-only and only service_role may EXECUTE it.
-- * R43 main gateway still enforces role per action, separate actor IDs,
--   source locks, R32 results locks, and self-approval prohibition.
-- * If the original results session is revoked/expired, R43 access stops too.
