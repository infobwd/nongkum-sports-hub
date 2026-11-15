-- R33: additive, versioned, read-only sports schedule search inside Supabase Meeting.
-- Scope: new public nongkum_schedule_* objects only; no Meeting or R32 changes.
create table public.nongkum_schedule_sources (
  source_key text primary key check (length(source_key) between 12 and 180),
  candidate_path text not null,
  candidate_blob_sha text not null check (candidate_blob_sha ~ '^[a-f0-9]{40}$'),
  corrections_blob_sha text not null check (corrections_blob_sha ~ '^[a-f0-9]{40}$'),
  source_document_sha256 text not null,
  expected_items integer not null check (expected_items = 236),
  expected_matches integer not null check (expected_matches = 186),
  expected_track_events integer not null check (expected_track_events = 50),
  state text not null default 'staged' check (state in ('staged','active','superseded')),
  imported_at timestamptz not null default now(),
  source_note text not null default ''
);
create table public.nongkum_schedule_schools (
  school_id text primary key,
  name text not null,
  short_name text not null,
  aliases text[] not null default '{}'::text[]
);
create table public.nongkum_schedule_sports (
  sport_id text primary key,
  name text not null,
  aliases text[] not null default '{}'::text[]
);
create table public.nongkum_schedule_fixtures (
  source_key text not null references public.nongkum_schedule_sources(source_key),
  fixture_id text not null check (length(fixture_id) between 3 and 200),
  kind text not null check (kind in ('match','track_event')),
  sport_id text not null references public.nongkum_schedule_sports(sport_id),
  division text not null,
  age_years integer check (age_years between 1 and 20),
  gender text not null check (gender in ('ชาย','หญิง','ไม่ระบุ')),
  round_name text,
  source_match_no text,
  source_pair_text text,
  team_a_id text references public.nongkum_schedule_schools(school_id),
  team_b_id text references public.nongkum_schedule_schools(school_id),
  school_ids text[] not null default '{}'::text[],
  unresolved_school_labels text[] not null default '{}'::text[],
  draft_date date,
  draft_time time without time zone,
  field_name text,
  venue_name text,
  venue_confirmed boolean not null default false,
  date_confirmed boolean not null default false,
  time_confirmed boolean not null default false,
  schedule_status text not null default 'draft' check (schedule_status in ('draft','review','confirmed')),
  source_page integer check (source_page between 1 and 250),
  qa_flags text[] not null default '{}'::text[],
  conflict_note text,
  primary key(source_key,fixture_id),
  constraint no_duplicate_side check (team_a_id is null or team_b_id is null or team_a_id <> team_b_id),
  constraint draft_is_not_automatically_approved check (schedule_status <> 'confirmed' or (date_confirmed and time_confirmed))
);
create index nongkum_fixture_school_ids_gin on public.nongkum_schedule_fixtures using gin(school_ids);
create index nongkum_fixture_sport_age_gender_idx on public.nongkum_schedule_fixtures(source_key,sport_id,age_years,gender);
create index nongkum_fixture_date_idx on public.nongkum_schedule_fixtures(source_key,draft_date,draft_time);
create index nongkum_fixture_round_idx on public.nongkum_schedule_fixtures(source_key,sport_id,division,source_match_no);
create table public.nongkum_schedule_bracket_links (
  source_key text not null,
  downstream_fixture_id text not null,
  upstream_fixture_id text not null,
  downstream_side text not null check (downstream_side in ('a','b')),
  source_ref_match_no text not null,
  link_status text not null default 'draft' check (link_status in ('draft','conflict','confirmed')),
  note text not null default '',
  primary key(source_key,downstream_fixture_id,downstream_side),
  foreign key(source_key,downstream_fixture_id) references public.nongkum_schedule_fixtures(source_key,fixture_id),
  foreign key(source_key,upstream_fixture_id) references public.nongkum_schedule_fixtures(source_key,fixture_id)
);
create index nongkum_bracket_upstream_idx on public.nongkum_schedule_bracket_links(source_key,upstream_fixture_id);

create table public.nongkum_schedule_active (
  singleton integer primary key default 1 check (singleton=1),
  source_key text not null references public.nongkum_schedule_sources(source_key),
  switched_at timestamptz not null default now()
);

-- RLS and two independent access checks: grants AND row-level policies.
alter table public.nongkum_schedule_sources enable row level security;
alter table public.nongkum_schedule_schools enable row level security;
alter table public.nongkum_schedule_sports enable row level security;
alter table public.nongkum_schedule_fixtures enable row level security;
alter table public.nongkum_schedule_bracket_links enable row level security;
alter table public.nongkum_schedule_active enable row level security;

revoke all on public.nongkum_schedule_sources, public.nongkum_schedule_schools,
  public.nongkum_schedule_sports, public.nongkum_schedule_fixtures,
  public.nongkum_schedule_bracket_links, public.nongkum_schedule_active
  from public, anon, authenticated;
grant select on public.nongkum_schedule_sources, public.nongkum_schedule_schools,
  public.nongkum_schedule_sports, public.nongkum_schedule_fixtures,
  public.nongkum_schedule_bracket_links, public.nongkum_schedule_active
  to anon, authenticated;
grant select, insert, update, delete on public.nongkum_schedule_sources, public.nongkum_schedule_schools,
  public.nongkum_schedule_sports, public.nongkum_schedule_fixtures,
  public.nongkum_schedule_bracket_links, public.nongkum_schedule_active
  to service_role;

create policy "R33 public read sources" on public.nongkum_schedule_sources for select to anon, authenticated using (true);
create policy "R33 public read schools" on public.nongkum_schedule_schools for select to anon, authenticated using (true);
create policy "R33 public read sports" on public.nongkum_schedule_sports for select to anon, authenticated using (true);
create policy "R33 public read fixtures" on public.nongkum_schedule_fixtures for select to anon, authenticated
  using (source_key in (select source_key from public.nongkum_schedule_active));
create policy "R33 public read brackets" on public.nongkum_schedule_bracket_links for select to anon, authenticated
  using (source_key in (select source_key from public.nongkum_schedule_active));
create policy "R33 public read active version" on public.nongkum_schedule_active for select to anon, authenticated using (true);

-- RPC filters by exact normalized public aliases, never scans private Meeting or R32 rows.
create function public.search_nongkum_schedule(
  p_school text default null,
  p_sport text default null,
  p_age_years integer default null,
  p_gender text default null,
  p_division text default null,
  p_limit integer default 50
)
returns table (
  fixture_id text, sport_id text, sport_name text, division text,
  age_years integer, gender text, kind text, round_name text,
  source_match_no text, source_pair_text text, team_a_id text, team_b_id text,
  team_a_name text, team_b_name text, draft_date date, draft_time time without time zone,
  field_name text, venue_name text, date_confirmed boolean, time_confirmed boolean,
  venue_confirmed boolean, schedule_status text, source_page integer,
  qa_flags text[], conflict_note text, source_key text, unresolved_school_labels text[]
)
language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select
    f.fixture_id,f.sport_id,sp.name,f.division,f.age_years,f.gender,f.kind,f.round_name,
    f.source_match_no,f.source_pair_text,f.team_a_id,f.team_b_id,
    a.name,b.name,f.draft_date,f.draft_time,f.field_name,f.venue_name,
    f.date_confirmed,f.time_confirmed,f.venue_confirmed,f.schedule_status,
    f.source_page,f.qa_flags,f.conflict_note,f.source_key,f.unresolved_school_labels
  from public.nongkum_schedule_fixtures f
  join public.nongkum_schedule_active v on v.source_key=f.source_key
  join public.nongkum_schedule_sports sp on sp.sport_id=f.sport_id
  left join public.nongkum_schedule_schools a on a.school_id=f.team_a_id
  left join public.nongkum_schedule_schools b on b.school_id=f.team_b_id
  where
    (nullif(btrim(p_school),'') is not null or nullif(btrim(p_sport),'') is not null
      or p_age_years is not null or nullif(btrim(p_gender),'') is not null
      or nullif(btrim(p_division),'') is not null)
    and (nullif(btrim(p_school),'') is null or exists (
      select 1 from public.nongkum_schedule_schools sc
      where (lower(btrim(p_school))=sc.school_id
        or lower(btrim(p_school))=lower(sc.name)
        or lower(btrim(p_school))=lower(sc.short_name)
        or lower(btrim(p_school))=any(sc.aliases))
        and sc.school_id=any(f.school_ids)
    ))
    and (nullif(btrim(p_sport),'') is null or
       lower(btrim(p_sport))=f.sport_id or
       lower(btrim(p_sport))=lower(sp.name) or
       lower(btrim(p_sport))=any(sp.aliases))
    and (p_age_years is null or f.age_years=p_age_years)
    and (nullif(btrim(p_gender),'') is null or f.gender=btrim(p_gender))
    and (nullif(btrim(p_division),'') is null or f.division=btrim(p_division))
  order by f.date_confirmed desc, f.draft_date nulls last,
    f.draft_time nulls last, f.source_page nulls last, f.fixture_id
  limit least(greatest(coalesce(p_limit,50),1),150);
$$;
revoke all on function public.search_nongkum_schedule(text,text,integer,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.search_nongkum_schedule(text,text,integer,text,text,integer) to anon, authenticated;

-- Optional bracket hop, always labeled draft/conflict until separately ratified.
create function public.get_nongkum_schedule_bracket(p_fixture_id text)
returns table (
  from_fixture_id text, to_fixture_id text, to_pair_text text,
  to_round text, downstream_side text, link_status text, note text
)
language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select b.upstream_fixture_id,b.downstream_fixture_id,f.source_pair_text,
    f.round_name,b.downstream_side,b.link_status,b.note
  from public.nongkum_schedule_bracket_links b
  join public.nongkum_schedule_active a on a.source_key=b.source_key
  join public.nongkum_schedule_fixtures f on f.source_key=b.source_key
    and f.fixture_id=b.downstream_fixture_id
  where b.upstream_fixture_id=p_fixture_id
  order by f.source_page,f.source_match_no,b.downstream_side
  limit 30;
$$;
revoke all on function public.get_nongkum_schedule_bracket(text) from public, anon, authenticated;
grant execute on function public.get_nongkum_schedule_bracket(text) to anon, authenticated;
comment on function public.search_nongkum_schedule(text,text,integer,text,text,integer) is
  'R33 read-only schedule: source status is draft even if date/time/venue were separately confirmed';
comment on table public.nongkum_schedule_fixtures is
  'R33 versioned source rows: never infer winners, never show personal athlete data, retain source-level draft/confirm states';
