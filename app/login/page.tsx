"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (d.ok) {
        window.location.href = "/";
        return;
      }
      setError(d.error ?? "Login failed");
    } catch {
      setError("Could not reach the server");
    }
    setBusy(false);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-xl">
            📞
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-white">
              GateCall
            </div>
            <div className="text-xs text-slate-500">
              Boarding reconciliation console
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
        >
          <h1 className="text-sm font-semibold text-slate-200">
            Gate agent sign in
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Restricted to airline ground staff.
          </p>

          <label className="mt-5 block text-xs font-medium text-slate-400">
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </label>

          <label className="mt-3 block text-xs font-medium text-slate-400">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
