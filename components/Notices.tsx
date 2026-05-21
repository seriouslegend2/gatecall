import type { ToastMsg } from "@/lib/types";

/** Shown when required environment variables are missing. */
export function SetupCard({ missing }: { missing: string[] }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
      <h2 className="text-lg font-semibold text-amber-200">Finish setup</h2>
      <p className="mt-1 text-sm text-slate-300">
        Add the following to{" "}
        <code className="rounded bg-slate-800 px-1 py-0.5">.env.local</code>,
        then restart the dev server:
      </p>
      <ul className="mt-3 space-y-1">
        {missing.map((k) => (
          <li key={k} className="font-mono text-sm text-amber-300">
            {k}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-400">
        See <code className="rounded bg-slate-800 px-1 py-0.5">README.md</code>{" "}
        for where to obtain each value.
      </p>
    </div>
  );
}

/** Shown when the backend returns an error (often: schema not applied yet). */
export function ErrorCard({ error }: { error: string }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6">
      <h2 className="text-lg font-semibold text-rose-200">Backend error</h2>
      <p className="mt-1 break-words text-sm text-slate-300">{error}</p>
      <p className="mt-2 text-sm text-slate-400">
        If this mentions a missing table or relation, run the migration in{" "}
        <code className="rounded bg-slate-800 px-1 py-0.5">
          supabase/migrations/
        </code>{" "}
        in the Supabase SQL editor.
      </p>
    </div>
  );
}

export function CenterNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function Toast({ toast }: { toast: ToastMsg }) {
  return (
    <div
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2.5 text-sm shadow-lg ${
        toast.kind === "ok"
          ? "border-emerald-500/40 bg-emerald-950 text-emerald-200"
          : "border-rose-500/40 bg-rose-950 text-rose-200"
      }`}
    >
      {toast.msg}
    </div>
  );
}
