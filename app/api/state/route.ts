// GET /api/state
// The board's single read endpoint. Returns every cohort, flight, passenger,
// and call. On each call it reconciles any in-flight Bolna calls into Postgres
// — the backstop for the webhook push path.

import { NextResponse } from "next/server";
import { missingSupabaseEnv } from "@/lib/env";
import {
  ensureSeeded,
  fetchAllPassengers,
  fetchCalls,
  fetchCohorts,
  fetchFlights,
  updateCall,
} from "@/lib/db";
import { getBolnaExecution } from "@/lib/bolna";
import { mapBolnaStatus, normalizeTranscript, parseExtraction } from "@/lib/logic";
import { ACTIVE_CALL } from "@/lib/display";
import type { Call, StateResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const missingEnv = missingSupabaseEnv();
  if (missingEnv.length) {
    return NextResponse.json<StateResponse>({
      configured: false,
      missingEnv,
      cohorts: [],
      flights: [],
      passengers: [],
      calls: [],
      generatedAt: new Date().toISOString(),
    });
  }

  try {
    await ensureSeeded();
    const cohorts = await fetchCohorts();
    const flights = await fetchFlights();
    const passengers = await fetchAllPassengers();
    const calls = await fetchCalls();

    // Reconcile every live call from Bolna, in parallel.
    const active = calls.filter(
      (c) => c.bolna_execution_id && ACTIVE_CALL.includes(c.call_status),
    );
    await Promise.all(
      active.map(async (c) => {
        const exec = await getBolnaExecution(c.bolna_execution_id!);
        if (!exec) return;
        const ext = parseExtraction(exec);
        const patch: Partial<Call> = {
          call_status: mapBolnaStatus(exec.status),
          transcript: normalizeTranscript(exec.transcript) ?? c.transcript,
          recording_url: exec.telephony_data?.recording_url ?? c.recording_url,
          location_status: ext.location_status ?? c.location_status,
          eta_minutes: ext.eta_minutes ?? c.eta_minutes,
          will_board: ext.will_board ?? c.will_board,
          call_outcome: ext.call_outcome ?? c.call_outcome,
          error_message: exec.error_message
            ? String(exec.error_message)
            : c.error_message,
        };
        await updateCall(c.id, patch);
        Object.assign(c, patch);
      }),
    );

    return NextResponse.json<StateResponse>({
      configured: true,
      missingEnv: [],
      cohorts,
      flights,
      passengers,
      calls,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json<StateResponse>(
      {
        configured: true,
        missingEnv: [],
        cohorts: [],
        flights: [],
        passengers: [],
        calls: [],
        generatedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
