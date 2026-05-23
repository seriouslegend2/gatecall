// POST /api/calls/start
// Triggers outbound Bolna calls for one flight. Each call creates a row in the
// `calls` table — re-calling a passenger adds another row (their history).
// Body: { flightId: string, passengerIds?: string[] }
//   - passengerIds omitted → call every not-yet-boarded passenger on the flight

import { NextRequest, NextResponse } from "next/server";
import { missingBolnaEnv, missingSupabaseEnv } from "@/lib/env";
import {
  fetchCalls,
  fetchCohorts,
  fetchFlight,
  fetchPassengers,
  insertCall,
  updateCall,
} from "@/lib/db";
import { startBolnaCall } from "@/lib/bolna";
import { cohortFor, minutesLeft } from "@/lib/logic";
import { ACTIVE_CALL } from "@/lib/display";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const missing = [...missingSupabaseEnv(), ...missingBolnaEnv()];
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Not configured: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  let body: { flightId?: string; passengerIds?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  if (!body.flightId) {
    return NextResponse.json(
      { ok: false, error: "flightId is required" },
      { status: 400 },
    );
  }

  const flight = await fetchFlight(body.flightId);
  if (!flight) {
    return NextResponse.json(
      { ok: false, error: "Flight not found" },
      { status: 404 },
    );
  }
  const cohort = cohortFor(await fetchCohorts(), flight);

  const all = await fetchPassengers(flight.id);
  let targets =
    body.passengerIds && body.passengerIds.length
      ? all.filter((p) => body.passengerIds!.includes(p.id))
      : all.filter((p) => p.boarding_status === "not_boarded");

  // Skip anyone who already has a call in progress (avoids double-dialling).
  const calls = await fetchCalls();
  const busy = new Set(
    calls
      .filter((c) => ACTIVE_CALL.includes(c.call_status))
      .map((c) => c.passenger_id),
  );
  targets = targets.filter((p) => !busy.has(p.id));

  if (!targets.length) {
    return NextResponse.json({ ok: true, started: 0, results: [] });
  }

  const mins = Math.max(0, minutesLeft(flight));
  const gateClose = new Date(flight.gate_close_time).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  // Fire all calls in parallel — the agent reaches multiple passengers at once.
  const results = await Promise.all(
    targets.map(async (p) => {
      const callId = await insertCall(
        p.id,
        flight.id,
        p.name,
        flight.flight_no,
      );

      const r = await startBolnaCall({
        recipientPhone: p.phone,
        userData: {
          passenger_name: p.name,
          airline: flight.airline,
          flight_no: flight.flight_no,
          destination: flight.destination,
          gate: flight.gate,
          seat: p.seat,
          minutes_left: String(mins),
          gate_close_time: gateClose,
          language: cohort.call_language,
        },
      });

      if (r.ok) {
        await updateCall(callId, {
          bolna_execution_id: r.executionId!,
          call_status: "ringing",
        });
        return { id: p.id, name: p.name, ok: true };
      }

      await updateCall(callId, {
        call_status: "failed",
        error_message: r.error ?? "Call failed to start",
      });
      return { id: p.id, name: p.name, ok: false, error: r.error };
    }),
  );

  return NextResponse.json({
    ok: true,
    started: results.filter((r) => r.ok).length,
    results,
  });
}
