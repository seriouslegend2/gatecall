// POST /api/calls/adhoc
// Place a one-off call to any phone number, in the context of a flight.
// Body: { flightId: string, phone: string, name?: string }
// The call appears in the call history (no passenger row backing it).

import { NextRequest, NextResponse } from "next/server";
import { missingBolnaEnv, missingSupabaseEnv } from "@/lib/env";
import { fetchCohorts, fetchFlight, insertAdhocCall, updateCall } from "@/lib/db";
import { startBolnaCall } from "@/lib/bolna";
import { cohortFor, minutesLeft } from "@/lib/logic";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const missing = [...missingSupabaseEnv(), ...missingBolnaEnv()];
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Not configured: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  let body: { flightId?: string; phone?: string; name?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  if (!body.flightId || !body.phone?.trim()) {
    return NextResponse.json(
      { ok: false, error: "flightId and phone are required" },
      { status: 400 },
    );
  }
  const phone = body.phone.trim();
  if (!/^\+\d{8,15}$/.test(phone)) {
    return NextResponse.json(
      { ok: false, error: "Phone must be in E.164 format (e.g. +9198XXXXXXXX)" },
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
  const name = body.name?.trim() || "Ad-hoc caller";

  const callId = await insertAdhocCall(flight.id, flight.flight_no, name);

  const mins = Math.max(0, minutesLeft(flight));
  const gateClose = new Date(flight.gate_close_time).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const r = await startBolnaCall({
    recipientPhone: phone,
    userData: {
      passenger_name: name,
      airline: flight.airline,
      flight_no: flight.flight_no,
      destination: flight.destination,
      gate: flight.gate,
      seat: "—",
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
    return NextResponse.json({ ok: true, callId });
  }

  await updateCall(callId, {
    call_status: "failed",
    error_message: r.error ?? "Call failed to start",
  });
  return NextResponse.json(
    { ok: false, error: r.error ?? "Call failed to start" },
    { status: 500 },
  );
}
