-- GateCall — migration: calls become a permanent history
--
-- Calls should survive demo resets. To do that:
--   1. Drop the cascading FKs from calls → passengers/flights, so the
--      passenger/flight tables can be wiped without taking calls with them.
--   2. Allow passenger_id and flight_id to go NULL (they may end up orphaned).
--   3. Denormalise passenger_name and flight_no onto the call row, so the
--      history remains readable even after the live rows are gone.
--
-- Safe to re-run (every statement is guarded).

alter table calls drop constraint if exists calls_passenger_id_fkey;
alter table calls drop constraint if exists calls_flight_id_fkey;

alter table calls alter column passenger_id drop not null;
alter table calls alter column flight_id    drop not null;

alter table calls add column if not exists passenger_name text;
alter table calls add column if not exists flight_no      text;
