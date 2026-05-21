import type { Recommendation } from "@/lib/types";

const actionTone: Record<Recommendation["action"], string> = {
  hold: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  close: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  monitor: "border-sky-500/40 bg-sky-500/10 text-sky-200",
};

/** Aggregated recommendation the gate agent acts on. */
export default function DecisionPanel({ rec }: { rec: Recommendation }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Gate decision
      </h2>

      <div
        className={`mt-3 rounded-xl border px-4 py-3 ${actionTone[rec.action]}`}
      >
        <div className="text-2xl font-bold tracking-tight">{rec.headline}</div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{rec.detail}</p>

      {rec.inbound.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Inbound — hold for
          </div>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-300">
            {rec.inbound.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        </div>
      )}

      {rec.offload.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-400">
            Offload checked baggage
          </div>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-300">
            {rec.offload.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
