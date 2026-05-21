import Link from "next/link";
import type { Call, Cohort, Flight, Passenger } from "@/lib/types";
import { ACTIVE_CALL } from "@/lib/display";
import { latestCall } from "@/lib/logic";

function fmt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** One flight on the departures overview — links through to its detail board. */
export default function FlightSummaryCard({
  flight,
  passengers,
  calls,
  cohort,
  automationOn,
  now,
}: {
  flight: Flight;
  passengers: Passenger[];
  calls: Call[];
  cohort: Cohort | undefined;
  automationOn: boolean;
  now: number;
}) {
  const total = passengers.length;
  const boarded = passengers.filter(
    (p) => p.boarding_status === "boarded",
  ).length;
  const missing = passengers.filter((p) => p.boarding_status !== "boarded");
  const calling = missing.some((p) => {
    const c = latestCall(calls, p.id);
    return c !== null && ACTIVE_CALL.includes(c.call_status);
  });

  const secondsLeft = Math.max(
    0,
    Math.round((new Date(flight.gate_close_time).getTime() - now) / 1000),
  );
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const urgent = secondsLeft <= 300;
  const pct = total ? Math.round((boarded / total) * 100) : 0;

  const armed =
    automationOn &&
    !!cohort &&
    cohort.auto_call_enabled &&
    missing.length > 0 &&
    secondsLeft > 0 &&
    secondsLeft <= cohort.auto_call_window_min * 60;

  return (
    <Link
      href={`/flight/${flight.id}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-600 hover:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{flight.flight_no}</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
              {flight.airline}
            </span>
            {armed && (
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                ⚡ auto
              </span>
            )}
          </div>
          <div className="mt-1 text-sm font-medium text-slate-300">
            {flight.origin} → {flight.destination}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Gate {flight.gate} · departs {fmt(flight.departure_time)}
          </div>
        </div>
        <div className="text-right">
          <div
            className={`font-mono text-xl font-bold tabular-nums ${
              urgent ? "text-rose-300" : "text-white"
            }`}
          >
            {secondsLeft <= 0
              ? "00:00"
              : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            to gate close
          </div>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {boarded}/{total} boarded
        </span>
        {missing.length > 0 ? (
          <span
            className={`font-medium ${
              calling ? "text-sky-300" : "text-amber-300"
            }`}
          >
            {calling ? "calls in progress…" : `${missing.length} not boarded`}
          </span>
        ) : (
          <span className="font-medium text-emerald-300">all boarded</span>
        )}
      </div>

      <div className="mt-2 border-t border-slate-800 pt-2 text-[11px] text-slate-500">
        Cohort: <span className="text-slate-400">{cohort?.name ?? "—"}</span>
      </div>
    </Link>
  );
}
