"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useBoard } from "@/lib/useBoard";
import { setFlightCohort, startCalls } from "@/lib/actions";
import {
  buildRecommendation,
  cohortFor,
  latestCall,
  passengerVerdict,
} from "@/lib/logic";
import { ACTIVE_CALL } from "@/lib/display";
import type { Call, Cohort, Flight, Passenger, ToastMsg } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { SetupCard, ErrorCard, CenterNote, Toast } from "@/components/Notices";
import FlightHeader from "@/components/FlightHeader";
import PassengerCard from "@/components/PassengerCard";
import DecisionPanel from "@/components/DecisionPanel";

/** One flight's full board — its cohort, call controls, live cards, decision. */
export default function FlightDetailPage() {
  const params = useParams();
  const flightId = String(params.id ?? "");
  const { state, now, realtime, reload } = useBoard();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  async function callAll() {
    setBusy("all");
    const d = await startCalls(flightId);
    setToast(
      d.ok
        ? { kind: "ok", msg: `Dialling ${d.started ?? 0} passenger(s)…` }
        : { kind: "error", msg: d.error ?? "Could not start calls" },
    );
    await reload();
    setBusy(null);
  }

  async function callOne(id: string) {
    setBusy(id);
    const d = await startCalls(flightId, [id]);
    if (!d.ok) setToast({ kind: "error", msg: d.error ?? "Call failed" });
    await reload();
    setBusy(null);
  }

  async function changeCohort(cohortId: string) {
    const d = await setFlightCohort(flightId, cohortId);
    setToast(
      d.ok
        ? { kind: "ok", msg: "Flight mapped to the new cohort." }
        : { kind: "error", msg: d.error ?? "Could not change cohort" },
    );
    await reload();
  }

  let body: React.ReactNode;
  if (!state) {
    body = <CenterNote>Loading flight…</CenterNote>;
  } else if (!state.configured) {
    body = <SetupCard missing={state.missingEnv} />;
  } else if (state.error) {
    body = <ErrorCard error={state.error} />;
  } else {
    const flight = state.flights.find((f) => f.id === flightId);
    if (!flight) {
      body = (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          That flight could not be found — it may have been reset.{" "}
          <Link href="/" className="text-sky-400 hover:text-sky-300">
            Back to all flights
          </Link>
          .
        </div>
      );
    } else {
      body = (
        <FlightBoard
          flight={flight}
          passengers={state.passengers.filter((p) => p.flight_id === flight.id)}
          calls={state.calls.filter((c) => c.flight_id === flight.id)}
          cohorts={state.cohorts}
          now={now}
          busy={busy}
          onCallAll={callAll}
          onCallOne={callOne}
          onSetCohort={changeCohort}
        />
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <TopBar realtime={realtime} />
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-slate-400 transition hover:text-slate-200"
      >
        ← All flights
      </Link>
      {body}
      {toast && <Toast toast={toast} />}
    </main>
  );
}

function FlightBoard({
  flight,
  passengers,
  calls,
  cohorts,
  now,
  busy,
  onCallAll,
  onCallOne,
  onSetCohort,
}: {
  flight: Flight;
  passengers: Passenger[];
  calls: Call[];
  cohorts: Cohort[];
  now: number;
  busy: string | null;
  onCallAll: () => void;
  onCallOne: (id: string) => void;
  onSetCohort: (cohortId: string) => void;
}) {
  const missing = passengers.filter((p) => p.boarding_status !== "boarded");
  const boarded = passengers.filter((p) => p.boarding_status === "boarded");
  const cohort = cohortFor(cohorts, flight);
  const holdBuffer = cohort.gate_hold_buffer_min;

  const secondsLeft = Math.max(
    0,
    Math.round((new Date(flight.gate_close_time).getTime() - now) / 1000),
  );
  const minsLeft = Math.floor(secondsLeft / 60);
  const rec = buildRecommendation(passengers, calls, minsLeft, holdBuffer);
  const anyActive = missing.some((p) => {
    const c = latestCall(calls, p.id);
    return c !== null && ACTIVE_CALL.includes(c.call_status);
  });

  return (
    <div className="space-y-5">
      <FlightHeader
        flight={flight}
        secondsLeft={secondsLeft}
        boarded={boarded.length}
        total={passengers.length}
      />

      {/* cohort mapping + the controls in effect for this flight */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs">
        <label className="flex items-center gap-2">
          <span className="text-slate-500">Cohort</span>
          <select
            value={flight.cohort_id ?? ""}
            onChange={(e) => onSetCohort(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="">— none —</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Control label="auto-call" value={`${cohort.auto_call_window_min}m`} />
        <Control label="hold buffer" value={`${cohort.gate_hold_buffer_min}m`} />
        <Control label="max attempts" value={`${cohort.max_call_attempts}`} />
        <Control label="offload grace" value={`${cohort.offload_grace_min}m`} />
        <Control label="language" value={cohort.call_language} />
        <Link
          href="/cohorts"
          className="ml-auto text-sky-400 hover:text-sky-300"
        >
          Edit cohorts →
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <div className="font-semibold text-white">
                {missing.length} passenger{missing.length !== 1 ? "s" : ""} not
                yet boarded
              </div>
              <div className="text-xs text-slate-400">
                The voice agent calls them in parallel and reports each status
                here live.
              </div>
            </div>
            <button
              type="button"
              onClick={onCallAll}
              disabled={busy !== null || anyActive || missing.length === 0}
              className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "all"
                ? "Starting calls…"
                : anyActive
                  ? "Calls in progress…"
                  : `Call ${missing.length} missing passenger${
                      missing.length !== 1 ? "s" : ""
                    }`}
            </button>
          </div>

          {missing.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {missing.map((p) => (
                <PassengerCard
                  key={p.id}
                  p={p}
                  calls={calls.filter((c) => c.passenger_id === p.id)}
                  verdict={passengerVerdict(
                    p,
                    latestCall(calls, p.id),
                    minsLeft,
                    holdBuffer,
                  )}
                  onCall={() => onCallOne(p.id)}
                  busy={busy !== null}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-200">
              Every passenger has boarded. Cleared to close the gate.
            </div>
          )}

          {boarded.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                ✓ {boarded.length} boarded
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {boarded.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400"
                  >
                    {p.name} · {p.seat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-6">
            <DecisionPanel rec={rec} />
            <p className="px-1 text-[11px] leading-relaxed text-slate-600">
              Verdicts use the {cohort.name} cohort&apos;s {holdBuffer}-minute
              gate-hold buffer · the board updates live via Supabase Realtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Control({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-slate-500">
      {label} <span className="font-medium text-slate-300">{value}</span>
    </span>
  );
}
