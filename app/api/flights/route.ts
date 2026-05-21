// /api/flights
//   POST  — create a new flight (+ passengers), mapped to a cohort
//   PATCH — map a flight to a different cohort

import { NextRequest, NextResponse } from "next/server";
import { missingSupabaseEnv } from "@/lib/env";
import { insertFlight, updateFlight } from "@/lib/db";
import type { Flight, Passenger } from "@/lib/types";

export const dynamic = "force-dynamic";

interface NewPassenger {
  name: string;
  seat: string;
  phone: string;
  boarded: boolean;
}

interface NewFlightBody {
  airline: string;
  flight_no: string;
  origin: string;
  destination: string;
  gate: string;
  departInMin: number;
  gateCloseInMin: number;
  cohort_id: string | null;
  passengers: NewPassenger[];
}

export async function POST(req: NextRequest) {
  const missing = missingSupabaseEnv();
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Not configured: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  let body: NewFlightBody;
  try {
    body = (await req.json()) as NewFlightBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  if (
    !body.airline?.trim() ||
    !body.flight_no?.trim() ||
    !body.origin?.trim() ||
    !body.destination?.trim() ||
    !body.gate?.trim()
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Fill in airline, flight number, origin, destination and gate.",
      },
      { status: 400 },
    );
  }

  const pax = (body.passengers ?? []).filter((p) => p.name?.trim());
  if (pax.some((p) => !p.boarded && !p.phone?.trim())) {
    return NextResponse.json(
      { ok: false, error: "Every not-boarded passenger needs a phone number." },
      { status: 400 },
    );
  }

  const now = Date.now();
  const id = `fl-${crypto.randomUUID().slice(0, 8)}`;
  const flight: Flight = {
    id,
    airline: body.airline.trim(),
    flight_no: body.flight_no.trim(),
    origin: body.origin.trim().toUpperCase().slice(0, 4),
    destination: body.destination.trim().toUpperCase().slice(0, 4),
    gate: body.gate.trim(),
    departure_time: new Date(
      now + (Number(body.departInMin) || 30) * 60_000,
    ).toISOString(),
    gate_close_time: new Date(
      now + (Number(body.gateCloseInMin) || 18) * 60_000,
    ).toISOString(),
    status: "boarding",
    cohort_id: body.cohort_id || null,
  };

  const passengers: Passenger[] = pax.map((p, i) => ({
    id: `px-${crypto.randomUUID().slice(0, 8)}`,
    flight_id: id,
    name: p.name.trim(),
    seat: p.seat?.trim() || "—",
    phone: p.phone?.trim() || "+910000000000",
    boarding_status: p.boarded ? "boarded" : "not_boarded",
    sort_order: i + 1,
  }));

  try {
    await insertFlight(flight, passengers);
    return NextResponse.json({ ok: true, flightId: id });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Could not create flight",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (missingSupabaseEnv().length) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured" },
      { status: 400 },
    );
  }

  let body: { flightId?: string; cohort_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }
  if (!body.flightId) {
    return NextResponse.json(
      { ok: false, error: "flightId is required" },
      { status: 400 },
    );
  }

  try {
    await updateFlight(body.flightId, { cohort_id: body.cohort_id || null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}
