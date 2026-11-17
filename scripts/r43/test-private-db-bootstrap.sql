-- Disposable CI PostgreSQL database ONLY: fake Auth and R33/R32 schemas.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema nongkum_sports;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema nongkum_sports,public,extensions to service_role;
-- Synthetic six-hour R34/R37 sessions only: no production credential or PIN.
create table nongkum_sports.editor_sessions(
 token_hash text primary key, expires_at timestamptz not null,revoked_at timestamptz
);
create table nongkum_sports.reviewer_sessions(
 token_hash text primary key, expires_at timestamptz not null,revoked_at timestamptz
);
grant select on nongkum_sports.editor_sessions,nongkum_sports.reviewer_sessions to service_role;
insert into nongkum_sports.editor_sessions(token_hash,expires_at)
 values(encode(extensions.digest(repeat('a',64),'sha256'),'hex'),now()+interval '6 hours');
insert into nongkum_sports.reviewer_sessions(token_hash,expires_at)
 values(encode(extensions.digest(repeat('b',64),'sha256'),'hex'),now()+interval '6 hours');
create table auth.users(id uuid primary key);
create table public.nongkum_schedule_sources(source_key text primary key);
create table public.nongkum_schedule_active(singleton integer primary key,source_key text not null);
create table public.nongkum_schedule_schools(school_id text primary key);
create table public.nongkum_schedule_sports(sport_id text primary key);
create table public.nongkum_schedule_fixtures(
  source_key text not null,fixture_id text not null,kind text not null,
  sport_id text not null,division text not null,primary key(source_key,fixture_id));
create table public.nongkum_published_results(result_id text primary key,result jsonb not null);
insert into auth.users(id) values
('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),
('00000000-0000-4000-8000-000000000003');
insert into public.nongkum_schedule_sources values('r33-test');
insert into public.nongkum_schedule_active values(1,'r33-test');
insert into public.nongkum_schedule_schools values('wangdong'),('nongkrathum');
insert into public.nongkum_schedule_sports values('volleyball'),('athletics');
insert into public.nongkum_schedule_fixtures values
('r33-test','fixture-one','match','volleyball','12 ปี หญิง'),
('r33-test','fixture-two','match','volleyball','12 ปี หญิง'),
('r33-test','fixture-locked','match','volleyball','12 ปี หญิง');
