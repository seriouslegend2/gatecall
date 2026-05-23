"use client";

import { useState } from "react";
import Link from "next/link";
import { useBoard } from "@/lib/useBoard";
import type { Call, CallStatus } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { SetupCard, ErrorCard, CenterNote } from "@/components/Notices";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const statusTone: Record<CallStatus, string> = {
  calling: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  ringing: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  in_progress: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  completed: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  no_answer: "text-orange-300 bg-orange-500/10 border-orange-500/30",
  failed: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

/** Permanent call history — every call ever placed, surviving demo resets. */
export default function CallHistoryPage() {
  const { state, realtime } = useBoard();

  let body: React.ReactNode;
  if (!state) {
    body = <CenterNote>Loading call history…</CenterNote>;
  } else if (!state.configured) {
    body = <SetupCard missing={state.missingEnv} />;
  } else if (state.error) {
    body = <ErrorCard error={state.error} />;
  } else {
    const calls = [...state.calls].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    body = (
      <>
        <div>
          <h1 className="text-xl font-semibold text-white">Call history</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {calls.length} call{calls.length !== 1 ? "s" : ""} — preserved
            across demo resets.
          </p>
        </div>

        {calls.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            No calls yet — place a call from a flight, and it&apos;ll show up
            here.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {calls.map((c) => (
              <CallRow key={c.id} call={c} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <TopBar realtime={realtime} />
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-slate-400 transition hover:text-slate-200"
      >
        ← Departures
      </Link>
      {body}
    </main>
  );
}

function CallRow({ call }: { call: Call }) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">
            {call.passenger_name ?? "Unknown passenger"}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            <span className="text-slate-400">
              {call.flight_no ?? "—"}
            </span>{" "}
            · {fmtTime(call.created_at)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
              statusTone[call.call_status] ??
              "text-slate-300 bg-slate-500/10 border-slate-600/40"
            }`}
          >
            {call.call_status.replace(/_/g, " ")}
          </span>
          {call.call_outcome && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 capitalize">
              {call.call_outcome.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {call.recording_url ? (
        <audio
          controls
          src={call.recording_url}
          className="mt-3 h-9 w-full"
        />
      ) : (
        <div className="mt-3 text-[11px] text-slate-600">
          {call.call_status === "completed"
            ? "no recording available"
            : "recording appears once the call completes"}
        </div>
      )}

      {call.transcript && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            {showTranscript ? "Hide transcript" : "View transcript"}
          </button>
          {showTranscript && (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
              {call.transcript}
            </pre>
          )}
        </div>
      )}

      {call.error_message && (
        <p className="mt-3 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
          {call.error_message}
        </p>
      )}
    </article>
  );
}
