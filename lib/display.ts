// Label and colour maps for the UI. Pure data — safe in client components.

import type { CallStatus, LocationStatus, Verdict, WillBoard } from "./types";

export const verdictMeta: Record<
  Verdict,
  { label: string; tone: string; dot: string }
> = {
  will_make_it: {
    label: "Will make it",
    tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  at_risk: {
    label: "Cutting it close",
    tone: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    dot: "bg-amber-400",
  },
  coming_unknown_eta: {
    label: "Coming · ETA unclear",
    tone: "text-sky-300 bg-sky-500/10 border-sky-500/30",
    dot: "bg-sky-400",
  },
  wont_board: {
    label: "Not boarding",
    tone: "text-rose-300 bg-rose-500/10 border-rose-500/30",
    dot: "bg-rose-400",
  },
  unreachable: {
    label: "Unreachable",
    tone: "text-orange-300 bg-orange-500/10 border-orange-500/30",
    dot: "bg-orange-400",
  },
  pending: {
    label: "Awaiting status",
    tone: "text-slate-300 bg-slate-500/10 border-slate-600/40",
    dot: "bg-slate-400",
  },
};

export const callStatusLabel: Record<CallStatus, string> = {
  calling: "Connecting…",
  ringing: "Ringing…",
  in_progress: "On call now…",
  completed: "Call completed",
  no_answer: "No answer",
  failed: "Call failed",
};

/** Call statuses where the call is still live and worth polling. */
export const ACTIVE_CALL: CallStatus[] = ["calling", "ringing", "in_progress"];

export const locationLabel: Record<LocationStatus, string> = {
  at_gate: "At the gate",
  past_security: "Past security",
  in_terminal: "Inside terminal",
  outside_airport: "Outside airport",
  unknown: "Location unclear",
};

export const willBoardLabel: Record<WillBoard, string> = {
  yes: "Intends to board",
  no: "Will not board",
  unsure: "Undecided",
};

/** Mask the middle of a phone number for the operations display. */
export function maskPhone(p: string): string {
  if (!p || p.length < 6) return p;
  return `${p.slice(0, 3)} ••• ${p.slice(-3)}`;
}
