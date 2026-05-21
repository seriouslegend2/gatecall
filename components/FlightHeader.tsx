import type { Flight } from "@/lib/types";

function fmt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Flight identity card with a live gate-close countdown and boarding bar. */
export default function FlightHeader({
  flight,
  secondsLeft,
  boarded,
  total,
}: {
  flight: Flight;
  secondsLeft: number;
  boarded: number;
  total: number;
}) {
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const urgent = secondsLeft <= 300;
  const closed = secondsLeft <= 0;
  const pct = total ? Math.round((boarded / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold tracking-tight text-white">
              {flight.flight_no}
            </span>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
              {flight.airline}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-lg text-slate-300">
            <span className="font-semibold text-white">{flight.origin}</span>
            <span className="text-slate-600">─── ✈ ───</span>
            <span className="font-semibold text-white">{flight.destination}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
            <span>
              Gate <span className="font-semibold text-slate-200">{flight.gate}</span>
            </span>
            <span>
              Departs{" "}
              <span className="font-semibold text-slate-200">
                {fmt(flight.departure_time)}
              </span>
            </span>
            <span>
              Gate closes{" "}
              <span className="font-semibold text-slate-200">
                {fmt(flight.gate_close_time)}
              </span>
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl border px-5 py-3 text-right ${
            urgent
              ? "border-rose-500/40 bg-rose-500/10"
              : "border-slate-700 bg-slate-800/50"
          }`}
        >
          <div
            className={`text-xs font-medium uppercase tracking-wide ${
              urgent ? "text-rose-300" : "text-slate-400"
            }`}
          >
            {closed ? "Gate closed" : "Gate closes in"}
          </div>
          <div
            className={`mt-0.5 font-mono text-4xl font-bold tabular-nums ${
              urgent ? "text-rose-300" : "text-white"
            }`}
          >
            {closed
              ? "00:00"
              : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Boarding progress</span>
          <span>
            {boarded} of {total} boarded
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
