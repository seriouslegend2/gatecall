-- GateCall — database schema
--
-- Apply it: Supabase SQL Editor → paste this whole file → Run
--           (or with the Supabase CLI:  supabase db push)
--
-- It drops and recreates the tables, so it is safe to re-run. The app seeds
-- the demo data automatically on first load.
--
-- Model:
--   cohorts      reusable control profiles
--   flights      a flight, mapped to one cohort (cohort_id)
--   passengers   passenger identity
--   calls        one row per outbound voice call

drop table if exists calls cascade;
drop table if exists passengers cascade;
drop table if exists flights cascade;
drop table if exists cohorts cascade;

create table cohorts (
  id                   text primary key,
  name                 text not null,
  auto_call_enabled    boolean not null default true,
  auto_call_window_min integer not null default 5,   -- dial inside this many min of gate close
  max_call_attempts    integer not null default 1,   -- auto-retry an unreachable passenger up to N
  gate_hold_buffer_min integer not null default 3,   -- minutes the gate may hold for inbound pax
  offload_grace_min    integer not null default 2,   -- grace after gate close before bag offload
  call_language        text not null default 'auto', -- auto | english | hindi
  created_at           timestamptz not null default now()
);

create table flights (
  id              text primary key,
  airline         text not null,
  flight_no       text not null,
  origin          text not null,
  destination     text not null,
  gate            text not null,
  departure_time  timestamptz not null,
  gate_close_time timestamptz not null,
  status          text not null default 'boarding',
  cohort_id       text references cohorts(id)        -- the cohort this flight is mapped to
);

create table passengers (
  id              text primary key,
  flight_id       text not null references flights(id) on delete cascade,
  name            text not null,
  seat            text not null,
  phone           text not null,
  boarding_status text not null default 'not_boarded',
  sort_order      integer not null default 0
);
create index idx_passengers_flight on passengers(flight_id);

create table calls (
  id                 uuid primary key default gen_random_uuid(),
  passenger_id       text not null references passengers(id) on delete cascade,
  flight_id          text not null references flights(id) on delete cascade,
  bolna_execution_id text unique,
  call_status        text not null default 'calling',
  location_status    text,
  eta_minutes        integer,
  will_board         text,
  call_outcome       text,
  transcript         text,
  recording_url      text,
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_calls_passenger on calls(passenger_id);
create index idx_calls_flight    on calls(flight_id);

-- Security: the server writes with the service-role key (bypasses RLS); the
-- browser gets read-only access so it can subscribe to Realtime.
alter table cohorts    enable row level security;
alter table flights    enable row level security;
alter table passengers enable row level security;
alter table calls      enable row level security;

create policy "anon read cohorts"    on cohorts    for select to anon using (true);
create policy "anon read flights"    on flights    for select to anon using (true);
create policy "anon read passengers" on passengers for select to anon using (true);
create policy "anon read calls"      on calls      for select to anon using (true);

-- Realtime publication — the dashboard subscribes to all four tables.
do $$ begin alter publication supabase_realtime add table cohorts;
  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table flights;
  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table passengers;
  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table calls;
  exception when duplicate_object then null; end $$;
