-- R33 activation MUST fail if source count/review gates drift. Do not bypass.
do $r33$
declare
  n integer;
  nm integer;
  nt integer;
  nc integer;
  nv integer;
  ne integer;
begin
  select count(*),count(*) filter(where kind='match'),count(*) filter(where kind='track_event'),
    count(*) filter(where date_confirmed and time_confirmed),count(*) filter(where venue_confirmed)
   into n,nm,nt,nc,nv from public.nongkum_schedule_fixtures where source_key='r33-20261116-7ba60be1-fa3269b5';
  select count(*) into ne from public.nongkum_schedule_bracket_links where source_key='r33-20261116-7ba60be1-fa3269b5';
  if n <> 236 or nm <> 186 or nt <> 50 or nc <> 45 or nv <> 236 or ne <> 89 then
    raise exception 'R33 source QA mismatch: count %, matches %, track %, confirmed %, venues %, brackets %', n,nm,nt,nc,nv,ne;
  end if;
  update public.nongkum_schedule_sources set state='superseded' where state='active' and source_key <> 'r33-20261116-7ba60be1-fa3269b5';
  update public.nongkum_schedule_sources set state='active' where source_key='r33-20261116-7ba60be1-fa3269b5';
  insert into public.nongkum_schedule_active(singleton,source_key) values(1,'r33-20261116-7ba60be1-fa3269b5')
    on conflict(singleton) do update set source_key=excluded.source_key,switched_at=now();
end;
$r33$;
