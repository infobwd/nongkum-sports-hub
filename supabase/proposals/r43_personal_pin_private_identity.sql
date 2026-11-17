-- R43-F individual-PIN identity storage. Proposal only: NOT applied to Supabase Meeting.
-- This additive first stage deliberately does not touch R32/R33, Auth, R34/R37,
-- or the legacy R43 gateway/FKs. No operator, PIN, or permission is provisioned.
-- PINs must be random, unique, >=10 decimal digits and issued privately by an
-- authorized administrator. Edge computes HMAC-SHA256(PIN, server-only pepper);
-- database stores only its 64-character hex MAC (never PIN or pepper).
-- Do not enable login until an atomic server-side rate limiter + actor-FK
-- migration and new gateway are implemented and tested.
create table if not exists nongkum_sports.r43_staff_identities(
  id uuid primary key default gen_random_uuid(),
  full_name text not null check(length(btrim(full_name)) between 3 and 120),
  school_id text not null references public.nongkum_schedule_schools(school_id),
  authority_ref text not null check(length(btrim(authority_ref)) between 8 and 300),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check(not active or revoked_at is null)
);
create table if not exists nongkum_sports.r43_staff_pin_keys(
  staff_id uuid primary key references nongkum_sports.r43_staff_identities(id),
  pin_lookup_mac text not null unique check(pin_lookup_mac ~ '^[0-9a-f]{64}$'),
  pin_version integer not null default 1 check(pin_version>=1),
  updated_at timestamptz not null default now()
);
create table if not exists nongkum_sports.r43_staff_sessions(
  token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
  staff_id uuid not null references nongkum_sports.r43_staff_identities(id),
  pin_version integer not null check(pin_version>=1),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check(expires_at>issued_at and expires_at<=issued_at+interval '6 hours')
);
create index if not exists r43_staff_sessions_active
  on nongkum_sports.r43_staff_sessions(staff_id,expires_at)
  where revoked_at is null;
-- A server-only limiter will atomically check and update this counter on
-- every attempt (including unknown PINs). The browser must never set its key.
create table if not exists nongkum_sports.r43_staff_login_limits(
  client_key text primary key check(client_key ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null default 0 check(attempts>=0),
  locked_until timestamptz
);
alter table nongkum_sports.r43_staff_identities enable row level security;
alter table nongkum_sports.r43_staff_pin_keys enable row level security;
alter table nongkum_sports.r43_staff_sessions enable row level security;
alter table nongkum_sports.r43_staff_login_limits enable row level security;
revoke all on nongkum_sports.r43_staff_identities,
  nongkum_sports.r43_staff_pin_keys,nongkum_sports.r43_staff_sessions,
  nongkum_sports.r43_staff_login_limits from PUBLIC,anon,authenticated;
grant select,insert,update on nongkum_sports.r43_staff_identities,
  nongkum_sports.r43_staff_pin_keys,nongkum_sports.r43_staff_sessions,
  nongkum_sports.r43_staff_login_limits to service_role;
-- Intentionally no public RPC, no END USER grants, and no real identities seeded.
