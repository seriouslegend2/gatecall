// Lightweight shared-credentials auth for the gate console.
//
// The gate agent signs in with GATE_USER / GATE_PASSWORD (set as env vars).
// The session cookie holds a SHA-256 token derived from those credentials, so
// the raw password is never stored in the cookie and middleware can verify a
// request with no database lookup. Runs in both the Edge (middleware) and
// Node (route handler) runtimes — both expose Web Crypto as `crypto`.

export const SESSION_COOKIE = "gc_session";

/** True when login credentials are configured on the server. */
export function authConfigured(): boolean {
  return Boolean(process.env.GATE_USER && process.env.GATE_PASSWORD);
}

/** Deterministic session token for the configured credentials. */
export async function sessionToken(): Promise<string> {
  const raw = `gatecall:${process.env.GATE_USER ?? ""}:${process.env.GATE_PASSWORD ?? ""}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Check submitted credentials against the configured ones. */
export function credentialsMatch(username: string, password: string): boolean {
  return (
    username === process.env.GATE_USER &&
    password === process.env.GATE_PASSWORD
  );
}
