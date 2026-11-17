-- R43-F synthetic personal PIN login and session coverage.
-- Run only in CI's disposable R43 database; never provision a real operator.
begin;
do $test$
declare
 v_id uuid;
 v jsonb;
 v_count integer;
begin
 if has_function_privilege('anon','public.nongkum_r43_personal_pin_auth(text,text,text,text,text)','EXECUTE')
   or has_function_privilege('authenticated','public.nongkum_r43_personal_pin_auth(text,text,text,text,text)','EXECUTE')
   or not has_function_privilege('service_role','public.nongkum_r43_personal_pin_auth(text,text,text,text,text)','EXECUTE')
 then raise exception 'Auth function API grants unsafe';end if;
 insert into nongkum_sports.r43_staff_identities
   (full_name,school_id,authority_ref,active,can_propose,can_review)
 values ('ทดสอบ รหัสส่วนบุคคล','wangdong','SYNTHETIC-NOT-REAL-0002',true,true,false)
 returning id into v_id;
 insert into nongkum_sports.r43_staff_pin_keys(staff_id,pin_lookup_mac)
 values(v_id,repeat('a',64));
 v:=public.nongkum_r43_personal_pin_auth('login',repeat('0',64),
   repeat('1',64),repeat('c',64),repeat('d',64));
 if v->>'error'<>'unauthenticated' then raise exception 'Unknown PIN accepted';end if;
 v:=public.nongkum_r43_personal_pin_auth('login',repeat('a',64),
   repeat('b',64),repeat('c',64),repeat('d',64));
 if (v->>'ok')::boolean is distinct from true
   or v->>'full_name'<>'ทดสอบ รหัสส่วนบุคคล'
   or (v->>'can_propose')::boolean is distinct from true
   or (v->>'can_review')::boolean is distinct from false
 then raise exception 'Valid personal identity not bound to expected roles';end if;
 v:=public.nongkum_r43_personal_pin_auth('status',null,
   repeat('b',64),null,null);
 if (v->>'ok')::boolean is distinct from true then
   raise exception 'Active session invalid';end if;
 update nongkum_sports.r43_staff_pin_keys
    set pin_version=pin_version+1 where staff_id=v_id;
 v:=public.nongkum_r43_personal_pin_auth('status',null,repeat('b',64),null,null);
 if v->>'error'<>'unauthenticated' then raise exception 'PIN rotation did not revoke session';end if;
 update nongkum_sports.r43_staff_pin_keys set pin_version=1 where staff_id=v_id;
 v:=public.nongkum_r43_personal_pin_auth('logout',null,repeat('b',64),null,null);
 v:=public.nongkum_r43_personal_pin_auth('status',null,repeat('b',64),null,null);
 if v->>'error'<>'unauthenticated' then raise exception 'Logout did not revoke session';end if;
 -- Consecutive invalid attempts are bounded per client across requests.
 for v_count in 1..6 loop
   v:=public.nongkum_r43_personal_pin_auth('login',repeat('0',64),
     repeat('2',64),repeat('e',64),repeat('f',64));
 end loop;
 if v->>'error'<>'limited' then
   raise exception 'Atomic login limiter did not lock unknown PINs';end if;
 v:=public.nongkum_r43_personal_pin_auth('login',repeat('a',64),
   repeat('3',64),repeat('e',64),repeat('f',64));
 if v->>'error'<>'limited' then
   raise exception 'Correct PIN unexpectedly bypassed lock';end if;
 -- Separate client is not blocked by per-client lock, in this synthetic test.
 v:=public.nongkum_r43_personal_pin_auth('login',repeat('a',64),
   repeat('4',64),repeat('9',64),repeat('f',64));
 if (v->>'ok')::boolean is distinct from true then
   raise exception 'Different client was incorrectly locked';end if;
 update nongkum_sports.r43_staff_identities set active=false where id=v_id;
 v:=public.nongkum_r43_personal_pin_auth('status',null,repeat('4',64),null,null);
 if v->>'error'<>'unauthenticated' then
   raise exception 'Disabled staff has active session';end if;
end
$test$;
rollback;
select 'R43_PERSONAL_PIN_AUTH_SYNTHETIC_PASS' as status;
