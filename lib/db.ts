// Supabase data-access layer. Server-only.

import { getSupabase } from "./supabase";
import { buildSeed } from "./seed";
import type { Call, Cohort, Flight, Passenger } from "./types";

// --- cohorts -------------------------------------------------------------

export async function fetchCohorts(): Promise<Cohort[]> {
  const { data, error } = await getSupabase()
    .from("cohorts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Supabase (read cohorts): ${error.message}`);
  return (data as Cohort[]) ?? [];
}

export async function insertCohort(cohort: Cohort): Promise<void> {
  const { error } = await getSupabase().from("cohorts").insert(cohort);
  if (error) throw new Error(`Supabase (insert cohort): ${error.message}`);
}

export async function updateCohort(
  id: string,
  patch: Partial<Cohort>,
): Promise<void> {
  const { error } = await getSupabase()
    .from("cohorts")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(`Supabase (update cohort): ${error.message}`);
}

// --- flights -------------------------------------------------------------

/** All flights, most-urgent (soonest gate close) first. */
export async function fetchFlights(): Promise<Flight[]> {
  const { data, error } = await getSupabase()
    .from("flights")
    .select("*")
    .order("gate_close_time", { ascending: true });
  if (error) throw new Error(`Supabase (read flights): ${error.message}`);
  return (data as Flight[]) ?? [];
}

export async function fetchFlight(id: string): Promise<Flight | null> {
  const { data, error } = await getSupabase()
    .from("flights")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase (read flight): ${error.message}`);
  return (data as Flight) ?? null;
}

export async function updateFlight(
  id: string,
  patch: Partial<Flight>,
): Promise<void> {
  const { error } = await getSupabase()
    .from("flights")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(`Supabase (update flight): ${error.message}`);
}

/** Insert one flight and its passengers (used by the "add flight" form). */
export async function insertFlight(
  flight: Flight,
  passengers: Passenger[],
): Promise<void> {
  const sb = getSupabase();
  const { error: fErr } = await sb.from("flights").insert(flight);
  if (fErr) throw new Error(`Supabase (insert flight): ${fErr.message}`);
  if (passengers.length) {
    const { error: pErr } = await sb.from("passengers").insert(passengers);
    if (pErr) throw new Error(`Supabase (insert passengers): ${pErr.message}`);
  }
}

// --- passengers ----------------------------------------------------------

export async function fetchAllPassengers(): Promise<Passenger[]> {
  const { data, error } = await getSupabase()
    .from("passengers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Supabase (read passengers): ${error.message}`);
  return (data as Passenger[]) ?? [];
}

export async function fetchPassengers(flightId: string): Promise<Passenger[]> {
  const { data, error } = await getSupabase()
    .from("passengers")
    .select("*")
    .eq("flight_id", flightId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Supabase (read passengers): ${error.message}`);
  return (data as Passenger[]) ?? [];
}

// --- calls ---------------------------------------------------------------

/** Every call, oldest first. */
export async function fetchCalls(): Promise<Call[]> {
  const { data, error } = await getSupabase()
    .from("calls")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Supabase (read calls): ${error.message}`);
  return (data as Call[]) ?? [];
}

/** Start a call row in the "calling" state; returns its id. The passenger
 *  name and flight number are stored alongside the ids so the call history
 *  remains readable after a demo reset orphans those ids. */
export async function insertCall(
  passengerId: string,
  flightId: string,
  passengerName: string,
  flightNo: string,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("calls")
    .insert({
      passenger_id: passengerId,
      flight_id: flightId,
      passenger_name: passengerName,
      flight_no: flightNo,
      call_status: "calling",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Supabase (insert call): ${error.message}`);
  return (data as { id: string }).id;
}

/** Start an ad-hoc call row — no passenger row backing it, just a phone
 *  number being dialled in the context of a flight. */
export async function insertAdhocCall(
  flightId: string,
  flightNo: string,
  passengerName: string,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("calls")
    .insert({
      passenger_id: null,
      flight_id: flightId,
      passenger_name: passengerName,
      flight_no: flightNo,
      call_status: "calling",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Supabase (insert ad-hoc call): ${error.message}`);
  return (data as { id: string }).id;
}

export async function updateCall(
  id: string,
  patch: Partial<Call>,
): Promise<void> {
  const { error } = await getSupabase()
    .from("calls")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Supabase (update call): ${error.message}`);
}

export async function findCallByExecution(
  executionId: string,
): Promise<Call | null> {
  const { data, error } = await getSupabase()
    .from("calls")
    .select("*")
    .eq("bolna_execution_id", executionId)
    .maybeSingle();
  if (error) throw new Error(`Supabase (find call): ${error.message}`);
  return (data as Call) ?? null;
}

// --- demo seed -----------------------------------------------------------

/** Wipe and re-seed the demo cohorts, flights, and passengers. Calls are
 *  intentionally preserved — they form a permanent call history that
 *  survives every reset. */
export async function resetDemo(): Promise<void> {
  const sb = getSupabase();
  // Calls no longer reference passengers/flights with cascading FKs, so we
  // can wipe the live tables without taking the call history with them.
  // Flights → cohorts FK still exists, so delete flights before cohorts.
  await sb.from("passengers").delete().neq("id", "");
  await sb.from("flights").delete().neq("id", "");
  await sb.from("cohorts").delete().neq("id", "");

  const seed = buildSeed();
  const { error: cErr } = await sb.from("cohorts").insert(seed.cohorts);
  if (cErr) throw new Error(`Supabase (seed cohorts): ${cErr.message}`);
  const { error: fErr } = await sb.from("flights").insert(seed.flights);
  if (fErr) throw new Error(`Supabase (seed flights): ${fErr.message}`);
  const { error: pErr } = await sb.from("passengers").insert(seed.passengers);
  if (pErr) throw new Error(`Supabase (seed passengers): ${pErr.message}`);
}

/** Seed once if the database is empty (first run after the migration). */
export async function ensureSeeded(): Promise<void> {
  const flights = await fetchFlights();
  if (flights.length === 0) await resetDemo();
}
