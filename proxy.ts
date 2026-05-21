// Gate keeper (Next.js "proxy" — formerly "middleware"). Every request, except
// the auth endpoints and static assets, must carry a valid session cookie.
// Unauthenticated page loads are redirected to /login; unauthenticated API
// calls get a 401.
//
// If GATE_USER / GATE_PASSWORD are not set, auth is disabled and the app runs
// open — intended for local development only. Set them before deploying.

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, authConfigured, sessionToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth endpoints always pass through.
  if (pathname === "/api/auth/login" || pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  const authed = authConfigured()
    ? req.cookies.get(SESSION_COOKIE)?.value === (await sessionToken())
    : true;

  if (pathname === "/login") {
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
