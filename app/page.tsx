"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useBoard } from "@/lib/useBoard";
import { resetBoard, startCalls } from "@/lib/actions";
import { latestCall } from "@/lib/logic";
import type { ToastMsg } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { SetupCard, ErrorCard, CenterNote, Toast } from "@/components/Notices";
import FlightSummaryCard from "@/components/FlightSummaryCard";

const AUTO_KEY = "gatecall:automation";

/** Departures overview — every flight as a live card, plus cohort-driven auto-call. */
export default function OverviewPage() {
  const { state, now, realtime, reload } = useBoard();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [automation, setAutomation] = useState(false);
  // keyed `passengerId#attemptCount` so the 1-second loop never double-calls
  const autoFired = useRef<Set<string>>(new Set());

  useEffect(() => {
    setAutomation(localStorage.getItem(AUTO_KEY) === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem(AUTO_KEY, automation ? "1" : "0");
  }, [automation]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Automation: each flight's cohort decides when to auto-dial ----------
  useEffect(() => {
    if (!automation || !state || !state.configured || state.error) return;

    for (const f of state.flights) {
      const cohort = state.cohorts.find((c) => c.id === f.cohort_id);
      if (!cohort || !cohort.auto_call_enabled) continue;

      const secs = Math.round(
        (new Date(f.gate_close_time).getTime() - now) / 1000,
      );
      if (secs <= 0 || secs > cohort.auto_call_window_min * 60) continue;

      const toCall: string[] = [];
      const missing = state.passengers.filter(
        (p) => p.flight_id === f.id && p.boarding_status !== "boarded",
      );
      for (const p of missing) {
        const pCalls = state.calls.filter((c) => c.passenger_id === p.id);
        if (pCalls.length >= cohort.max_call_attempts) continue;
        const latest = latestCall(state.calls, p.id);
        const needs =
          pCalls.length === 0 ||
          (latest != null &&
            (latest.call_status === "no_answer" ||
              latest.call_status === "failed"));
        if (!needs) continue;

        const key = `${p.id}#${pCalls.length}`;
        if (autoFired.current.has(key)) continue;
        autoFired.current.add(key);
        toCall.push(p.id);
      }

      if (toCall.length) {
        setToast({
          kind: "ok",
          msg: `Auto-calling ${toCall.length} passenger(s) on ${f.flight_no}`,
        });
        startCalls(f.id, toCall).then(() => reload());
      }
    }
  }, [automation, state, now, reload]);

  async function onReset() {
    setBusy(true);
    autoFired.current.clear();
    const d = await resetBoard();
    setToast(
      d.ok
        ? { kind: "ok", msg: "Demo reset to fresh flights." }
        : { kind: "error", msg: d.error ?? "Reset failed" },
    );
    await reload();
    setBusy(false);
  }

  if (!state) return <CenterNote>Loading gate console…</CenterNote>;

  const missingTotal = state.passengers.filter(
    (p) => p.boarding_status !== "boarded",
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <TopBar realtime={realtime} />

      {!state.configured ? (
        <SetupCard missing={state.missingEnv} />
      ) : state.error ? (
        <ErrorCard error={state.error} />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">Departures</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                {state.flights.length} flight
                {state.flights.length !== 1 ? "s" : ""} boarding · {missingTotal}{" "}
                passenger{missingTotal !== 1 ? "s" : ""} not yet boarded
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AutoToggle on={automation} onChange={setAutomation} />
              <Link
                href="/calls"
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Past calls
              </Link>
              <button
                type="button"
                onClick={onReset}
                disabled={busy}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? "Resetting…" : "Reset demo"}
              </button>
              <Link
                href="/flight/new"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                + Add flight
              </Link>
            </div>
          </div>

          {automation && (
            <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">
              ⚡ Automation on — each flight is auto-dialled when it enters its{" "}
              <Link href="/cohorts" className="underline hover:text-sky-100">
                cohort
              </Link>
              &apos;s auto-call window before gate close.
            </div>
          )}

          {state.flights.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              No flights yet.{" "}
              <Link
                href="/flight/new"
                className="text-sky-400 hover:text-sky-300"
              >
                Add a flight
              </Link>{" "}
              to get started.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.flights.map((f) => (
                <FlightSummaryCard
                  key={f.id}
                  flight={f}
                  passengers={state.passengers.filter(
                    (p) => p.flight_id === f.id,
                  )}
                  calls={state.calls.filter((c) => c.flight_id === f.id)}
                  cohort={state.cohorts.find((c) => c.id === f.cohort_id)}
                  automationOn={automation}
                  now={now}
                />
              ))}
            </div>
          )}
        </>
      )}

      {toast && <Toast toast={toast} />}
    </main>
  );
}

function AutoToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      title="Automatically call missing passengers inside each flight's cohort window"
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
        on
          ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
          : "border-slate-700 text-slate-400 hover:bg-slate-800"
      }`}
    >
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          on ? "bg-sky-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            on ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      Automation
    </button>
  );
}
