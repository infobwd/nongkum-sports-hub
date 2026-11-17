-- R43-F PRIVATE PIN identity schema security tests, in disposable PostgreSQL only.
-- This is a schema-layer test, not proof of successful operator PIN login.
do $checks$
declare n text;
begin
  foreach n in array array[
    'r43_staff_identities','r43_staff_pin_keys',
    'r43_staff_sessions','r43_staff_login_limits'
  ] loop
    if not exists(
      select 1 from pg_class c
      join pg_namespace s on s.oid=c.relnamespace
      where s.nspname='nongkum_sports' and c.relname=n and c.relrowsecurity
    ) then
      raise exception 'RLS not enabled for %',n;
    end if;
    if has_table_privilege('anon',format('nongkum_sports.%I',n),'SELECT')
      or has_table_privilege('anon',format('nongkum_sports.%I',n),'INSERT')
      or has_table_privilege('authenticated',format('nongkum_sports.%I',n),'SELECT')
      or has_table_privilege('authenticated',format('nongkum_sports.%I',n),'UPDATE')
      or not has_table_privilege('service_role',format('nongkum_sports.%I',n),'SELECT')
    then
      raise exception 'Unsafe or missing privilege on %',n;
    end if;
  end loop;
  if (select count(*) from nongkum_sports.r43_staff_identities)<>0
    or (select count(*) from nongkum_sports.r43_staff_pin_keys)<>0
    or (select count(*) from nongkum_sports.r43_staff_sessions)<>0
    or (select count(*) from nongkum_sports.r43_staff_login_limits)<>0
  then raise exception 'Test migration auto-provisioned a credential or operator'; end if;
  if (select confrelid::regclass::text from pg_constraint
      where conrelid='nongkum_sports.r43_roles'::regclass
        and conname='r43_roles_user_id_fkey') <> 'auth.users'
  then raise exception 'Legacy R43 actor FK unexpectedly changed';end if;
end;
$checks$;

-- Check real DB constraints against ONLY artificial values, then roll back.
begin;
insert into nongkum_sports.r43_staff_identities(full_name,school_id,authority_ref)
  values ('สมมติ เจ้าหน้าที่ทดสอบ','wangdong','SYNTHETIC-AUTH-0001');
do $assertions$
declare v_staff uuid;
begin
 select id into v_staff from nongkum_sports.r43_staff_identities
 where full_name='สมมติ เจ้าหน้าที่ทดสอบ';
 if (select active from nongkum_sports.r43_staff_identities where id=v_staff)
 then raise exception 'New staff must remain disabled';end if;
 begin
   insert into nongkum_sports.r43_staff_pin_keys(staff_id,pin_lookup_mac)
   values(v_staff,'invalid-mac');
   raise exception 'Malformed MAC accepted';
 exception when check_violation then null;end;
 insert into nongkum_sports.r43_staff_pin_keys(staff_id,pin_lookup_mac)
 values(v_staff,repeat('a',64));
 begin
   insert into nongkum_sports.r43_staff_sessions(token_hash,staff_id,pin_version,expires_at)
   values(repeat('b',64),v_staff,1,now()+interval '7 hours');
   raise exception 'Session longer than six hours accepted';
 exception when check_violation then null;end;
 insert into nongkum_sports.r43_staff_sessions(token_hash,staff_id,pin_version,expires_at)
 values(repeat('b',64),v_staff,1,now()+interval '5 hours');
 begin
   update nongkum_sports.r43_staff_identities set active=true,revoked_at=now() where id=v_staff;
   raise exception 'Active revoked actor accepted';
 exception when check_violation then null;end;
end;
$assertions$;
rollback;
select 'R43_PERSONAL_PIN_IDENTITY_SCHEMA_PASS' as status;
