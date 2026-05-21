// POST /api/webhooks/bolna
//
// Optional production push path. Configure this URL in the Bolna dashboard
// (Analytics → "Push all execution data to webhook"). Bolna then POSTs each
// execution update here, matched to its call row by execution id.
//
// The dashboard's polling loop already keeps state fresh, so this endpoint is
// a bonus — the demo works whether or not the webhook is configured.

import { NextRequest, NextResponse } from "next/server";
import { missingSupabaseEnv } from "@/lib/env";
import { findCallByExecution, updateCall } from "@/lib/db";
import { mapBolnaStatus, normalizeTranscript, parseExtraction } from "@/lib/logic";
import type { BolnaExecution } from "@/lib/bolna";
import type { Call } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (missingSupabaseEnv().length) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 400 },
    );
  }

  let exec: BolnaExecution;
  try {
    exec = (await req.json()) as BolnaExecution;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!exec.id) {
    return NextResponse.json({ ok: true, matched: false });
  }

  const call = await findCallByExecution(exec.id);
  if (!call) return NextResponse.json({ ok: true, matched: false });

  const ext = parseExtraction(exec);
  const patch: Partial<Call> = {
    call_status: mapBolnaStatus(exec.status),
    transcript: normalizeTranscript(exec.transcript) ?? call.transcript,
    recording_url: exec.telephony_data?.recording_url ?? call.recording_url,
    location_status: ext.location_status ?? call.location_status,
    eta_minutes: ext.eta_minutes ?? call.eta_minutes,
    will_board: ext.will_board ?? call.will_board,
    call_outcome: ext.call_outcome ?? call.call_outcome,
    error_message: exec.error_message
      ? String(exec.error_message)
      : call.error_message,
  };

  try {
    await updateCall(call.id, patch);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, matched: true });
}
