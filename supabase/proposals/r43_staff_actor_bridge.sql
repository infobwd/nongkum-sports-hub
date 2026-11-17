-- R43-F staff actor migration proposal. NOT applied to Supabase Meeting.
-- Preconditions: apply r43_personal_pin_private_identity.sql first.
-- This migration is intentionally FAIL CLOSED if any legacy R43 data exists.
-- It does NOT update the live R32/R33 results or fixtures, or auth.users.
do $r43_staff_actor_bridge$
declare
  t text;
  c text;
  f text;
  k text;
  n integer;
begin
  foreach t in array array[
    'r43_roles','r43_people','r43_people_audit','r43_requests',
    'r43_audit','r43_new_fixture_requests','r43_new_fixture_audit'
  ] loop
    execute format('select count(*) from nongkum_sports.%I',t) into n;
    if n<>0 then
      raise exception 'R43 staff actor migration blocked: %.% rows already exist; manual history-safe plan required',t,n;
    end if;
  end loop;
  if (select count(*) from nongkum_sports.r43_staff_identities)<>0 then
    raise exception 'R43 staff actor migration blocked: staff already provisioned';
  end if;

  -- The existing ten foreign keys reference auth.users. Repoint each to the
  -- private immutable actor identity, retaining UUID columns and audit history.
  for t,c in
    select x.table_name,x.column_name from (values
      ('r43_roles','user_id'),
      ('r43_people','proposed_by'),('r43_people','reviewed_by'),
      ('r43_people_audit','actor'),
      ('r43_requests','submitted_by'),('r43_requests','reviewed_by'),
      ('r43_audit','actor'),
      ('r43_new_fixture_requests','proposed_by'),
      ('r43_new_fixture_requests','reviewed_by'),
      ('r43_new_fixture_audit','actor')
    ) x(table_name,column_name)
  loop
    k:=t||'_'||c||'_fkey';
    if not exists(
      select 1 from pg_constraint p
      where p.conrelid=format('nongkum_sports.%I',t)::regclass
        and p.conname=k and p.contype='f'
        and p.confrelid='auth.users'::regclass
    ) then
      raise exception 'R43 actor FK drift: expected auth.users reference on %.%',t,c;
    end if;
    execute format('alter table nongkum_sports.%I drop constraint %I',t,k);
    execute format(
      'alter table nongkum_sports.%I add constraint %I foreign key (%I) references nongkum_sports.r43_staff_identities(id)',
      t,k,c
    );
  end loop;
end;
$r43_staff_actor_bridge$;

comment on column nongkum_sports.r43_roles.user_id is
  'R43-F staff actor UUID from nongkum_sports.r43_staff_identities; name preserved for original gateway compatibility';
