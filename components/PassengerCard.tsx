"use client";

import { useState } from "react";
import type { Call, Passenger, Verdict } from "@/lib/types";
import {
  ACTIVE_CALL,
  callStatusLabel,
  locationLabel,
  maskPhone,
  willBoardLabel,
} from "@/lib/display";
import StatusBadge from "./StatusBadge";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/50 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** One missing passenger. Call state comes from the `calls` table — the most
 *  recent call is the current state; earlier calls show as history. */
export default function PassengerCard({
  p,
  calls,
  verdict,
  onCall,
  busy,
}: {
  p: Passenger;
  calls: Call[];
  verdict: Verdict;
  onCall: () => void;
  busy: boolean;
}) {
  const [showTranscript, setShowTranscript] = useState(false);

  // newest call first
  const sorted = [...calls].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const latest = sorted[0] ?? null;
  const active = latest ? ACTIVE_CALL.includes(latest.call_status) : false;
  const completed = latest?.call_status === "completed";
  const hasFacts =
    !!latest &&
    (!!latest.location_status ||
      latest.eta_minutes != null ||
      !!latest.will_board);

  return (
    <article className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{p.name}</h3>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
              Seat {p.seat}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-xs text-slate-500">
            {maskPhone(p.phone)}
          </div>
        </div>
        <StatusBadge verdict={verdict} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${
            active
              ? "animate-pulse bg-sky-400"
              : completed
                ? "bg-emerald-400"
                : "bg-slate-600"
          }`}
        />
        <span className={active ? "text-sky-300" : "text-slate-400"}>
          {latest ? callStatusLabel[latest.call_status] : "Not called yet"}
        </span>
      </div>

      {hasFacts && latest && (
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Fact
            label="Location"
            value={
              latest.location_status
                ? locationLabel[latest.location_status]
                : "—"
            }
          />
          <Fact
            label="ETA to gate"
            value={
              latest.eta_minutes != null ? `${latest.eta_minutes} min` : "—"
            }
          />
          <Fact
            label="Intent"
            value={
              latest.will_board ? willBoardLabel[latest.will_board] : "—"
            }
          />
        </dl>
      )}

      {latest?.error_message && (
        <p className="mt-3 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
          {latest.error_message}
        </p>
      )}

      {latest?.transcript && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            {showTranscript ? "Hide transcript" : "View transcript"}
          </button>
          {showTranscript && (
            <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
              {latest.transcript}
            </pre>
          )}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Call recording{sorted.length > 1 ? `s · ${sorted.length} attempts` : ""}
          </div>
          {sorted.map((call, i) => (
            <div key={call.id}>
              <div className="text-[10px] text-slate-500">
                {sorted.length > 1 ? `Attempt ${sorted.length - i} · ` : ""}
                {fmtTime(call.created_at)}
                {call.call_outcome
                  ? ` · ${call.call_outcome.replace(/_/g, " ")}`
                  : ""}
              </div>
              {call.recording_url ? (
                <audio
                  controls
                  src={call.recording_url}
                  className="mt-1 h-9 w-full"
                />
              ) : (
                <div className="mt-1 text-xs text-slate-500">
                  Recording appears once the call completes…
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onCall}
        disabled={busy || active}
        className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {active
          ? "Call in progress…"
          : latest
            ? "Call again"
            : "Call passenger"}
      </button>
    </article>
  );
}
