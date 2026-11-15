-- R33 performance advisor follow-up: covering indexes for only new schedule foreign keys.
-- These indexes do not change rows or existing Meeting / R32 schemas.
create index if not exists nongkum_schedule_active_source_idx on public.nongkum_schedule_active(source_key);
create index if not exists nongkum_fixture_sport_fk_idx on public.nongkum_schedule_fixtures(sport_id);
create index if not exists nongkum_fixture_team_a_fk_idx on public.nongkum_schedule_fixtures(team_a_id);
create index if not exists nongkum_fixture_team_b_fk_idx on public.nongkum_schedule_fixtures(team_b_id);
