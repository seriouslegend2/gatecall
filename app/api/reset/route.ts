// POST /api/reset
// Wipes every flight and re-seeds the demo set with fresh times. Lets you
// re-run (and re-record) the demo cleanly from a known starting state.

import { NextResponse } from "next/server";
import { missingSupabaseEnv } from "@/lib/env";
import { resetDemo } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const missing = missingSupabaseEnv();
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Not configured: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    await resetDemo();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Reset failed" },
      { status: 500 },
    );
  }
}
