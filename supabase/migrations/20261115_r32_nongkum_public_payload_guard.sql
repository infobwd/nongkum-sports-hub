-- R32B: Prevent accidental publication of unknown nested fields (e.g. athlete names).
-- This only adds validation to the new sports table; no Meeting object is changed.
create function nongkum_sports.public_result_is_safe(p jsonb)
returns boolean
language plpgsql immutable security invoker
set search_path = pg_catalog
as $$
declare
  key text;
  item jsonb;
  kind text;
begin
  if jsonb_typeof(p) is distinct from 'object' or length(p::text) > 30000 then return false; end if;
  for key in select jsonb_object_keys(p) loop
    if key <> all(array[
      'id','status','sport_id','result_type','fixture_id','event_id',
      'team_a_id','team_b_id','score_a','score_b','sets','winner_school_id',
      'rankings','division','round','name','result_date','team_a_cards','team_b_cards'
    ]) then return false; end if;
  end loop;

  kind:=p->>'result_type';
  if p->>'status' is distinct from 'approved' then return false; end if;
  if coalesce(length(p->>'id'),0) < 3 or coalesce(length(p->>'sport_id'),0) < 2 then return false; end if;
  if kind = 'score' then
    if jsonb_typeof(p->'score_a') is distinct from 'number'
      or jsonb_typeof(p->'score_b') is distinct from 'number'
      or coalesce(p->>'score_a','') !~ '^[0-9]+$'
      or coalesce(p->>'score_b','') !~ '^[0-9]+$' then return false; end if;
  elsif kind = 'sets' then
    if jsonb_typeof(p->'sets') is distinct from 'array' then return false; end if;
    if jsonb_array_length(p->'sets') < 1 then return false; end if;
    for item in select * from jsonb_array_elements(p->'sets') loop
      if jsonb_typeof(item) is distinct from 'object'
        or jsonb_typeof(item->'a') is distinct from 'number'
        or jsonb_typeof(item->'b') is distinct from 'number'
        or coalesce(item->>'a','') !~ '^[0-9]+$'
        or coalesce(item->>'b','') !~ '^[0-9]+$' then return false; end if;
      for key in select jsonb_object_keys(item) loop
        if key <> all(array['a','b']) then return false; end if;
      end loop;
    end loop;
  elsif kind = 'win_loss' then
    if coalesce(p->>'winner_school_id','') not in
      (p->>'team_a_id',p->>'team_b_id') then return false; end if;
  elsif kind = 'ranking' then
    if jsonb_typeof(p->'rankings') is distinct from 'array' then return false; end if;
    if jsonb_array_length(p->'rankings') < 1 then return false; end if;
    for item in select * from jsonb_array_elements(p->'rankings') loop
      if jsonb_typeof(item) is distinct from 'object'
        or jsonb_typeof(item->'rank') is distinct from 'number'
        or coalesce(item->>'rank','') !~ '^[1-9][0-9]*$'
        or coalesce(length(item->>'school_id'),0) < 2 then return false; end if;
      for key in select jsonb_object_keys(item) loop
        if key <> all(array['rank','school_id','mark','unit']) then return false; end if;
      end loop;
    end loop;
  else return false;
  end if;

  for key in select unnest(array['team_a_cards','team_b_cards']) loop
    if p ? key then
      if jsonb_typeof(p->key) is distinct from 'object' then return false; end if;
      for item in select jsonb_build_object('key',x.key,'value',x.value) from jsonb_each(p->key) x loop
        if item->>'key' <> all(array['yellow','red'])
          or jsonb_typeof(item->'value') is distinct from 'number'
          or coalesce(item->>'value','') !~ '^[0-9]+$' then return false; end if;
      end loop;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function nongkum_sports.public_result_is_safe(jsonb) from public, anon, authenticated;
grant execute on function nongkum_sports.public_result_is_safe(jsonb) to service_role;
alter table public.nongkum_published_results
  add constraint nongkum_public_fields_allowlisted
  check (nongkum_sports.public_result_is_safe(result));
