"use client";

// Client-side wrappers around the API routes.

import type { Cohort } from "./types";

interface ApiResult {
  ok: boolean;
  error?: string;
  started?: number;
  flightId?: string;
  cohort?: Cohort;
}

async function request(
  method: string,
  url: string,
  body: unknown,
): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return { ok: false, error: "Session expired" };
    }
    return (await res.json()) as ApiResult;
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}

/** Start outbound calls for a flight (all not-boarded, or specific passengers). */
export function startCalls(
  flightId: string,
  passengerIds?: string[],
): Promise<ApiResult> {
  return request("POST", "/api/calls/start", { flightId, passengerIds });
}

/** Wipe and re-seed the demo cohorts, flights, and passengers. */
export function resetBoard(): Promise<ApiResult> {
  return request("POST", "/api/reset", {});
}

/** Create a new flight with its passengers. */
export function createFlight(payload: unknown): Promise<ApiResult> {
  return request("POST", "/api/flights", payload);
}

/** Map a flight to a different cohort. */
export function setFlightCohort(
  flightId: string,
  cohortId: string,
): Promise<ApiResult> {
  return request("PATCH", "/api/flights", { flightId, cohort_id: cohortId });
}

/** Create a new cohort (with default controls). */
export function createCohort(name?: string): Promise<ApiResult> {
  return request("POST", "/api/cohorts", { name });
}

/** Save edited controls for one cohort. */
export function saveCohort(cohort: Partial<Cohort>): Promise<ApiResult> {
  return request("PATCH", "/api/cohorts", cohort);
}

/** Clear the session and return to the login screen. */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}
