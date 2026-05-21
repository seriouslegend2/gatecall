// POST /api/auth/login — verify gate-agent credentials and set the session cookie.

import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authConfigured,
  credentialsMatch,
  sessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Login is not configured. Set GATE_USER and GATE_PASSWORD.",
      },
      { status: 400 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  if (!credentialsMatch(body.username ?? "", body.password ?? "")) {
    return NextResponse.json(
      { ok: false, error: "Incorrect username or password." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // one shift
  });
  return res;
}
