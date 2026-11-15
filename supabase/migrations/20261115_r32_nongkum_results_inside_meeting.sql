-- R32: Dedicated sports namespace inside existing Meeting Supabase.
-- No changes to any Meeting tables, grants, functions, triggers or Edge Functions.
create schema if not exists nongkum_sports;
revoke all on schema nongkum_sports from public, anon, authenticated;
grant usage on schema nongkum_sports to service_role;

create table if not exists nongkum_sports.result_submissions (
  id uuid primary key default gen_random_uuid(),
  result_id text not null check (length(trim(result_id)) between 3 and 160),
  fixture_id text,
  event_id text,
  sport_id text not null check (length(trim(sport_id)) between 2 and 80),
  result_type text not null check (result_type in ('score','sets','win_loss','ranking')),
  proposed_result jsonb not null check (jsonb_typeof(proposed_result) = 'object'),
  revision integer not null default 1 check (revision >= 1),
  status text not null default 'review' check (status in ('draft','review','approved','rejected')),
  received_via text not null check (received_via in ('chat','sheets','web','manual')),
  evidence_ref text,
  source_ref text,
  submitted_by text not null check (length(trim(submitted_by)) between 2 and 160),
  submitted_at timestamptz not null default now(),
  approved_by text,
  approval_ref text,
  approved_at timestamptz,
  correction_note text,
  unique(result_id,revision),
  constraint submission_one_target check (
    (fixture_id is not null and event_id is null and result_type <> 'ranking')
    or (fixture_id is null and event_id is not null and result_type = 'ranking')
  ),
  constraint approved_must_be_attributed check (
    status <> 'approved' or (approved_by is not null and approval_ref is not null and approved_at is not null)
  )
);
create index if not exists nongkum_results_status_idx
  on nongkum_sports.result_submissions(status, submitted_at desc);

create table if not exists nongkum_sports.result_approval_audit (
  id bigint generated always as identity primary key,
  submission_id uuid not null references nongkum_sports.result_submissions(id),
  result_id text not null,
  previous_result jsonb,
  approved_result jsonb not null,
  revision integer not null,
  approved_by text not null,
  approval_ref text not null,
  source_ref text not null,
  correction_note text,
  recorded_at timestamptz not null default now()
);
create index if not exists nongkum_approval_audit_result_idx
  on nongkum_sports.result_approval_audit(result_id, recorded_at desc);

create table if not exists public.nongkum_published_results (
  result_id text primary key,
  result jsonb not null,
  revision integer not null check (revision >= 1),
  published_at timestamptz not null default now(),
  constraint nongkum_published_approved_check check (
    jsonb_typeof(result) = 'object'
    and result->>'status' = 'approved'
    and result->>'id' = result_id
    and jsonb_typeof(result->'sport_id') = 'string'
    and result->>'result_type' in ('score','sets','win_loss','ranking')
    and (
      (result->>'result_type' = 'ranking' and jsonb_typeof(result->'rankings') = 'array' and jsonb_array_length(result->'rankings') > 0 and result ? 'event_id')
      or (result->>'result_type' <> 'ranking' and result ? 'fixture_id' and result ? 'team_a_id' and result ? 'team_b_id')
    )
  )
);

alter table nongkum_sports.result_submissions enable row level security;
alter table nongkum_sports.result_approval_audit enable row level security;
alter table public.nongkum_published_results enable row level security;

-- Public data is readable but never writable from the browser.
revoke all on nongkum_sports.result_submissions from public, anon, authenticated;
revoke all on nongkum_sports.result_approval_audit from public, anon, authenticated;
revoke all on public.nongkum_published_results from public, anon, authenticated;
grant select on public.nongkum_published_results to anon, authenticated;
create policy "nongkum approved results public read"
  on public.nongkum_published_results for select to anon, authenticated using (true);

-- Service role can be used by trusted server-side code only; never in GitHub Pages.
grant select, insert, update on nongkum_sports.result_submissions to service_role;
grant select, insert on nongkum_sports.result_approval_audit to service_role;
grant usage, select on sequence nongkum_sports.result_approval_audit_id_seq to service_role;
grant select, insert, update on public.nongkum_published_results to service_role;

-- Publication is a single guarded, audited transaction. No SECURITY DEFINER.
create or replace function nongkum_sports.approve_and_publish(
  p_submission_id uuid,
  p_expected_revision integer,
  p_approved_by text,
  p_approval_ref text,
  p_correction_note text default null
)
returns text
language plpgsql
security invoker
set search_path = pg_catalog, nongkum_sports, public
as $$
declare
  s nongkum_sports.result_submissions%rowtype;
  previous_result jsonb;
  previous_revision integer;
  result_public jsonb;
  bad_count integer;
begin
  if length(trim(coalesce(p_approved_by,''))) < 2
    or length(trim(coalesce(p_approval_ref,''))) < 8 then
    raise exception 'Named human approver and approval reference required';
  end if;

  select * into s from nongkum_sports.result_submissions
    where id=p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if s.status <> 'review' or s.revision <> p_expected_revision then
    raise exception 'Result must be under review at expected revision';
  end if;
  if nullif(trim(coalesce(s.source_ref,'')),'') is null then
    raise exception 'Organizer-verified fixture/event source reference required';
  end if;
  if s.revision > 1 and length(trim(coalesce(p_correction_note,''))) < 8 then
    raise exception 'Correction explanation required for revision > 1';
  end if;
  if s.proposed_result->>'id' is distinct from s.result_id
    or s.proposed_result->>'sport_id' is distinct from s.sport_id
    or s.proposed_result->>'result_type' is distinct from s.result_type then
    raise exception 'Source result ID, sport or type mismatch';
  end if;
  if (s.fixture_id is not null and s.proposed_result->>'fixture_id' is distinct from s.fixture_id)
    or (s.event_id is not null and s.proposed_result->>'event_id' is distinct from s.event_id) then
    raise exception 'Fixture/event mismatch';
  end if;

  -- Explicit allowlist drops private names, evidence, editor identities and arbitrary keys.
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
    into result_public from jsonb_each(s.proposed_result)
    where key = any(array[
      'id','sport_id','result_type','fixture_id','event_id','team_a_id','team_b_id',
      'score_a','score_b','sets','winner_school_id','rankings','division','round',
      'name','result_date','team_a_cards','team_b_cards'
    ]);
  result_public := result_public || jsonb_build_object('status','approved');

  if s.result_type <> 'ranking' then
    if coalesce(length(trim(result_public->>'team_a_id')),0) < 2
      or coalesce(length(trim(result_public->>'team_b_id')),0) < 2
      or result_public->>'team_a_id' = result_public->>'team_b_id' then
      raise exception 'Two distinct, organizer-verified teams required';
    end if;
    if s.result_type = 'score' then
      if jsonb_typeof(result_public->'score_a') <> 'number'
        or jsonb_typeof(result_public->'score_b') <> 'number'
        or coalesce(result_public->>'score_a','') !~ '^[0-9]+$'
        or coalesce(result_public->>'score_b','') !~ '^[0-9]+$' then
        raise exception 'Nonnegative integer scores required';
      end if;
    elsif s.result_type = 'sets' then
      if jsonb_typeof(result_public->'sets') is distinct from 'array'
        or jsonb_array_length(coalesce(result_public->'sets','[]'::jsonb)) = 0 then
        raise exception 'Nonempty score sets required';
      end if;
      select count(*) into bad_count from jsonb_array_elements(result_public->'sets') x
        where jsonb_typeof(x->'a') is distinct from 'number'
          or jsonb_typeof(x->'b') is distinct from 'number'
          or coalesce(x->>'a','') !~ '^[0-9]+$'
          or coalesce(x->>'b','') !~ '^[0-9]+$';
      if bad_count > 0 then raise exception 'Invalid set score'; end if;
    elsif s.result_type = 'win_loss' then
      if coalesce(result_public->>'winner_school_id','') not in
         (result_public->>'team_a_id',result_public->>'team_b_id') then
        raise exception 'Winner must match listed team';
      end if;
    end if;
  else
    if jsonb_typeof(result_public->'rankings') is distinct from 'array'
      or jsonb_array_length(coalesce(result_public->'rankings','[]'::jsonb)) = 0 then
      raise exception 'Nonempty approved ranking required';
    end if;
    select count(*) into bad_count from jsonb_array_elements(result_public->'rankings') x
      where jsonb_typeof(x->'rank') is distinct from 'number'
        or coalesce(x->>'rank','') !~ '^[1-9][0-9]*$'
        or coalesce(length(trim(x->>'school_id')),0) < 2;
    if bad_count > 0 then raise exception 'Invalid ranking row'; end if;
  end if;

  select result,revision into previous_result,previous_revision
    from public.nongkum_published_results
    where result_id=s.result_id for update;
  if found and previous_revision >= s.revision then
    raise exception 'Published revision must increase';
  end if;

  insert into public.nongkum_published_results(result_id,result,revision,published_at)
    values(s.result_id,result_public,s.revision,now())
    on conflict(result_id) do update set
      result=excluded.result, revision=excluded.revision,published_at=excluded.published_at;

  update nongkum_sports.result_submissions set
    status='approved',approved_by=p_approved_by,approval_ref=p_approval_ref,
    approved_at=now(),correction_note=p_correction_note where id=s.id;

  insert into nongkum_sports.result_approval_audit(
    submission_id,result_id,previous_result,approved_result,revision,
    approved_by,approval_ref,source_ref,correction_note)
  values(s.id,s.result_id,previous_result,result_public,s.revision,
    p_approved_by,p_approval_ref,s.source_ref,p_correction_note);
  return s.result_id;
end;
$$;
revoke all on function nongkum_sports.approve_and_publish(uuid,integer,text,text,text)
  from public, anon, authenticated;
grant execute on function nongkum_sports.approve_and_publish(uuid,integer,text,text,text)
  to service_role;

comment on schema nongkum_sports is 'R32: private sports result intake, separate from Meeting; do not expose via Data API';
comment on table public.nongkum_published_results is 'R32: public read-only APPROVED sports result feed; no private evidence or personal data';
