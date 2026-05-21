// /api/cohorts
//   POST  — create a cohort (with sensible defaults; you then edit it)
//   PATCH — update one cohort's controls

import { NextRequest, NextResponse } from "next/server";
import { missingSupabaseEnv } from "@/lib/env";
import { insertCohort, updateCohort } from "@/lib/db";
import type { CallLanguage, Cohort } from "@/lib/types";

export const dynamic = "force-dynamic";

function notConfigured() {
  return NextResponse.json(
    { ok: false, error: "Supabase is not configured" },
    { status: 400 },
  );
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export async function POST(req: NextRequest) {
  if (missingSupabaseEnv().length) return notConfigured();

  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* defaults below */
  }

  const cohort: Cohort = {
    id: `co-${crypto.randomUUID().slice(0, 8)}`,
    name: body.name?.trim() || "New cohort",
    auto_call_enabled: true,
    auto_call_window_min: 5,
    max_call_attempts: 1,
    gate_hold_buffer_min: 3,
    offload_grace_min: 2,
    call_language: "auto",
    created_at: new Date().toISOString(),
  };

  try {
    await insertCohort(cohort);
    return NextResponse.json({ ok: true, cohort });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Create failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (missingSupabaseEnv().length) return notConfigured();

  let body: Partial<Cohort> & { id?: string };
  try {
    body = (await req.json()) as Partial<Cohort> & { id?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }
  if (!body.id) {
    return NextResponse.json(
      { ok: false, error: "Cohort id is required" },
      { status: 400 },
    );
  }

  const patch: Partial<Cohort> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim() || "Cohort";
  if (body.auto_call_enabled !== undefined) {
    patch.auto_call_enabled = Boolean(body.auto_call_enabled);
  }
  if (body.auto_call_window_min !== undefined) {
    patch.auto_call_window_min = clampInt(body.auto_call_window_min, 1, 60);
  }
  if (body.max_call_attempts !== undefined) {
    patch.max_call_attempts = clampInt(body.max_call_attempts, 1, 5);
  }
  if (body.gate_hold_buffer_min !== undefined) {
    patch.gate_hold_buffer_min = clampInt(body.gate_hold_buffer_min, 0, 30);
  }
  if (body.offload_grace_min !== undefined) {
    patch.offload_grace_min = clampInt(body.offload_grace_min, 0, 30);
  }
  if (body.call_language !== undefined) {
    patch.call_language = (["auto", "english", "hindi"].includes(
      body.call_language as string,
    )
      ? body.call_language
      : "auto") as CallLanguage;
  }

  try {
    await updateCohort(body.id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}
