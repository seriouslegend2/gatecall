"use client";

import { useEffect, useState } from "react";
import { useBoard } from "@/lib/useBoard";
import { createCohort, saveCohort } from "@/lib/actions";
import type { CallLanguage, Cohort, ToastMsg } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { SetupCard, ErrorCard, CenterNote, Toast } from "@/components/Notices";

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500";

/** Cohorts — manage the reusable control profiles flights are mapped to. */
export default function CohortsPage() {
  const { state, realtime, reload } = useBoard();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function onAdd() {
    setBusy(true);
    const d = await createCohort();
    setToast(
      d.ok
        ? { kind: "ok", msg: "Cohort created — edit its controls below." }
        : { kind: "error", msg: d.error ?? "Could not create cohort" },
    );
    await reload();
    setBusy(false);
  }

  let body: React.ReactNode;
  if (!state) {
    body = <CenterNote>Loading cohorts…</CenterNote>;
  } else if (!state.configured) {
    body = <SetupCard missing={state.missingEnv} />;
  } else if (state.error) {
    body = <ErrorCard error={state.error} />;
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Control cohorts
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Reusable control profiles. Map a flight to a cohort and it follows
              that cohort&apos;s controls.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={busy}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            + Add cohort
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {state.cohorts.map((c) => (
            <CohortCard
              key={c.id}
              cohort={c}
              flightCount={
                state.flights.filter((f) => f.cohort_id === c.id).length
              }
              onSaved={async (msg) => {
                setToast(msg);
                await reload();
              }}
            />
          ))}
          {state.cohorts.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
              No cohorts yet. Add one, or click <strong>Reset demo</strong> on
              the Departures page to seed the defaults.
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <TopBar realtime={realtime} />
      {body}
      {toast && <Toast toast={toast} />}
    </main>
  );
}

function CohortCard({
  cohort,
  flightCount,
  onSaved,
}: {
  cohort: Cohort;
  flightCount: number;
  onSaved: (msg: ToastMsg) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Cohort>(cohort);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(cohort);

  function set<K extends keyof Cohort>(key: K, value: Cohort[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setBusy(true);
    const d = await saveCohort(draft);
    await onSaved(
      d.ok
        ? { kind: "ok", msg: `Saved "${draft.name}".` }
        : { kind: "error", msg: d.error ?? "Save failed" },
    );
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-base font-semibold text-white outline-none hover:border-slate-700 focus:border-sky-500"
        />
        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
          {flightCount} flight{flightCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Toggle
          label="Auto-call"
          on={draft.auto_call_enabled}
          onChange={(v) => set("auto_call_enabled", v)}
        />
        <NumberField
          label="Auto-call window (min)"
          hint="dial inside this many min of gate close"
          value={draft.auto_call_window_min}
          min={1}
          max={60}
          onChange={(v) => set("auto_call_window_min", v)}
        />
        <NumberField
          label="Max call attempts"
          hint="auto-retry an unreachable passenger"
          value={draft.max_call_attempts}
          min={1}
          max={5}
          onChange={(v) => set("max_call_attempts", v)}
        />
        <NumberField
          label="Gate hold buffer (min)"
          hint="how long the gate may hold for inbound pax"
          value={draft.gate_hold_buffer_min}
          min={0}
          max={30}
          onChange={(v) => set("gate_hold_buffer_min", v)}
        />
        <NumberField
          label="Bag offload grace (min)"
          hint="grace after gate close before offload"
          value={draft.offload_grace_min}
          min={0}
          max={30}
          onChange={(v) => set("offload_grace_min", v)}
        />
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Call language
          </div>
          <select
            value={draft.call_language}
            onChange={(e) =>
              set("call_language", e.target.value as CallLanguage)
            }
            className={`mt-1 ${inputCls}`}
          >
            <option value="auto">Auto</option>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
          </select>
          <div className="mt-0.5 text-[10px] text-slate-600">
            language the voice agent uses
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        {dirty && !busy && (
          <span className="text-xs text-amber-300">unsaved changes</span>
        )}
      </div>
    </section>
  );
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-1 ${inputCls}`}
      />
      <div className="mt-0.5 text-[10px] text-slate-600">{hint}</div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`mt-1 flex h-[34px] w-full items-center gap-2 rounded-lg border px-2.5 text-sm font-medium transition ${
          on
            ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
            : "border-slate-700 bg-slate-950 text-slate-400"
        }`}
      >
        <span
          className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
            on ? "bg-sky-500" : "bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
              on ? "left-3.5" : "left-0.5"
            }`}
          />
        </span>
        {on ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}
