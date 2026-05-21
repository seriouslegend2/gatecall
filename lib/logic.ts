// Pure domain logic — safe to import from both server routes and client
// components (it only uses `import type` for Bolna, so there is no runtime
// dependency on the network client).

import type { BolnaExecution } from "./bolna";
import type {
  Call,
  CallStatus,
  CallOutcome,
  Cohort,
  Flight,
  LocationStatus,
  Passenger,
  Recommendation,
  Verdict,
  WillBoard,
} from "./types";

// --- Bolna call status → our CallStatus ----------------------------------

export function mapBolnaStatus(raw: string | undefined): CallStatus {
  switch ((raw ?? "").toLowerCase()) {
    case "completed":
      return "completed";
    case "in-progress":
    case "call-disconnected":
      return "in_progress";
    case "scheduled":
    case "queued":
    case "initiated":
    case "ringing":
      return "ringing";
    case "no-answer":
    case "busy":
      return "no_answer";
    case "balance-low":
    case "failed":
    case "error":
    case "stopped":
    case "canceled":
      return "failed";
    default:
      return "calling";
  }
}

// --- Extraction parsing --------------------------------------------------

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/** Look up a value in extracted_data, tolerant of key casing/spacing. */
function pick(
  data: Record<string, unknown>,
  aliases: string[],
): string | null {
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) flat[norm(k)] = v;
  for (const a of aliases) {
    const v = flat[norm(a)];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return null;
}

function normalizeLocation(v: string | null): LocationStatus | null {
  if (!v) return null;
  const s = v.toLowerCase().trim();
  if (["at_gate", "past_security", "in_terminal", "outside_airport", "unknown"].includes(s)) {
    return s as LocationStatus;
  }
  if (/gate|boarding/.test(s)) return "at_gate";
  if (/security|immigration|checkpoint/.test(s)) return "past_security";
  if (/outside|traffic|road|on the way|home|hotel|cab|taxi|not at|en route/.test(s)) {
    return "outside_airport";
  }
  if (/terminal|airport|inside|lounge|check.?in|food|shop/.test(s)) return "in_terminal";
  return "unknown";
}

function normalizeWillBoard(v: string | null): WillBoard | null {
  if (!v) return null;
  const s = v.toLowerCase().trim();
  if (["yes", "no", "unsure"].includes(s)) return s as WillBoard;
  if (/\b(no|not coming|won'?t|cannot|can't|cancel|miss)/.test(s)) return "no";
  if (/\b(yes|yeah|yep|coming|will board|on my way|boarding)/.test(s)) return "yes";
  return "unsure";
}

function normalizeOutcome(v: string | null): CallOutcome | null {
  if (!v) return null;
  const s = v.toLowerCase().trim();
  if (["reached", "wrong_person", "voicemail", "no_answer"].includes(s)) {
    return s as CallOutcome;
  }
  if (/wrong|not the passenger|someone else/.test(s)) return "wrong_person";
  if (/voice ?mail|answering machine/.test(s)) return "voicemail";
  if (/no.?answer|unanswered|did not answer/.test(s)) return "no_answer";
  return "reached";
}

export interface ParsedExtraction {
  location_status: LocationStatus | null;
  eta_minutes: number | null;
  will_board: WillBoard | null;
  call_outcome: CallOutcome | null;
}

export function parseExtraction(exec: BolnaExecution): ParsedExtraction {
  const data = (exec.extracted_data ?? {}) as Record<string, unknown>;

  const location_status = normalizeLocation(
    pick(data, ["location_status", "location", "passenger_location"]),
  );

  const etaRaw = pick(data, ["eta_minutes", "eta", "minutes_away", "time_to_gate"]);
  const etaNum = etaRaw ? parseInt(etaRaw.replace(/[^0-9]/g, ""), 10) : NaN;
  const eta_minutes = Number.isFinite(etaNum) ? etaNum : null;

  const will_board = normalizeWillBoard(
    pick(data, ["will_board", "will_fly", "intends_to_board", "boarding_intent"]),
  );

  let call_outcome = normalizeOutcome(
    pick(data, ["call_outcome", "outcome", "disposition"]),
  );
  if (!call_outcome && exec.answered_by_voice_mail) call_outcome = "voicemail";

  return { location_status, eta_minutes, will_board, call_outcome };
}

/** Bolna's transcript may be a string or an array of turns. */
export function normalizeTranscript(t: unknown): string | null {
  if (!t) return null;
  if (typeof t === "string") return t.trim() || null;
  if (Array.isArray(t)) {
    const lines = t.map((turn) => {
      if (typeof turn === "string") return turn;
      const o = turn as Record<string, unknown>;
      const role = (o.role || o.speaker || "") as string;
      const content = (o.content || o.text || o.message || "") as string;
      return role ? `${role}: ${content}` : content;
    });
    return lines.join("\n").trim() || null;
  }
  return String(t);
}

// --- Cohorts -------------------------------------------------------------

/** Control values used when a flight is not mapped to any cohort. */
export const DEFAULT_COHORT: Cohort = {
  id: "default",
  name: "No cohort",
  auto_call_enabled: true,
  auto_call_window_min: 5,
  max_call_attempts: 1,
  gate_hold_buffer_min: 0,
  offload_grace_min: 0,
  call_language: "auto",
  created_at: "",
};

/** The cohort governing a flight — its mapped one, or sensible defaults. */
export function cohortFor(cohorts: Cohort[], flight: Flight): Cohort {
  return cohorts.find((c) => c.id === flight.cohort_id) ?? DEFAULT_COHORT;
}

// --- Decision logic ------------------------------------------------------

export function minutesLeft(flight: Flight, now: number = Date.now()): number {
  return Math.floor(
    (new Date(flight.gate_close_time).getTime() - now) / 60000,
  );
}

/** The most recent call for a passenger — their current call state. */
export function latestCall(calls: Call[], passengerId: string): Call | null {
  let latest: Call | null = null;
  for (const c of calls) {
    if (c.passenger_id !== passengerId) continue;
    if (!latest || c.created_at > latest.created_at) latest = c;
  }
  return latest;
}

/**
 * The gate agent's at-a-glance read on one passenger. `holdBuffer` is the
 * cohort's gate-hold allowance: a passenger still "makes it" if their ETA is
 * within (minutes left + buffer).
 */
export function passengerVerdict(
  p: Passenger,
  call: Call | null,
  minsLeft: number,
  holdBuffer: number = 0,
): Verdict {
  if (p.boarding_status === "boarded") return "will_make_it";
  if (!call) return "pending"; // not called yet

  if (
    call.call_status === "no_answer" ||
    call.call_status === "failed" ||
    call.call_outcome === "no_answer" ||
    call.call_outcome === "voicemail" ||
    call.call_outcome === "wrong_person"
  ) {
    return "unreachable";
  }

  if (call.call_status !== "completed") return "pending"; // call in progress

  if (call.will_board === "no") return "wont_board";
  if (call.eta_minutes != null) {
    return call.eta_minutes <= minsLeft + holdBuffer ? "will_make_it" : "at_risk";
  }
  return "coming_unknown_eta";
}

/** Aggregate every missing passenger into one recommendation for the gate. */
export function buildRecommendation(
  passengers: Passenger[],
  calls: Call[],
  minsLeft: number,
  holdBuffer: number = 0,
): Recommendation {
  const missing = passengers.filter((p) => p.boarding_status !== "boarded");
  const rows = missing.map((p) => {
    const c = latestCall(calls, p.id);
    return { p, c, v: passengerVerdict(p, c, minsLeft, holdBuffer) };
  });

  const offload = rows
    .filter((r) => r.v === "wont_board" || r.v === "unreachable")
    .map((r) => r.p.name);
  const inbound = rows
    .filter(
      (r) =>
        r.v === "will_make_it" ||
        r.v === "at_risk" ||
        r.v === "coming_unknown_eta",
    )
    .map((r) => r.p.name);
  const notCalled = rows.filter((r) => !r.c);
  const inProgress = rows.filter((r) => r.c && r.v === "pending");

  if (rows.length === 0) {
    return {
      headline: "ALL BOARDED",
      action: "close",
      detail: "Every passenger is on board. Cleared to close the gate.",
      offload: [],
      inbound: [],
    };
  }

  if (inProgress.length > 0) {
    return {
      headline: "CALLS IN PROGRESS",
      action: "monitor",
      detail: `Reaching ${inProgress.length} passenger${
        inProgress.length > 1 ? "s" : ""
      }… each card updates the moment its call completes.`,
      offload,
      inbound,
    };
  }

  if (notCalled.length > 0) {
    return {
      headline: "AWAITING CALLS",
      action: "monitor",
      detail: `${notCalled.length} passenger${
        notCalled.length > 1 ? "s have" : " has"
      } not been called yet. Start the calls to get their status.`,
      offload,
      inbound,
    };
  }

  if (inbound.length > 0) {
    const etas = rows
      .filter((r) => r.v === "will_make_it" || r.v === "at_risk")
      .map((r) => r.c?.eta_minutes ?? 0);
    const hold = Math.max(0, ...etas) - minsLeft;
    return {
      headline: hold > 0 ? `HOLD ${hold} MIN` : "HOLD GATE — INBOUND",
      action: "hold",
      detail: offload.length
        ? `${inbound.length} passenger(s) inbound. Offload checked bags for ${offload.join(
            ", ",
          )} now so the delay isn't compounded.`
        : `${inbound.length} passenger(s) inbound and expected to reach the gate.`,
      offload,
      inbound,
    };
  }

  return {
    headline: "CLOSE GATE",
    action: "close",
    detail: offload.length
      ? `No remaining passenger is coming. Offload checked bags for ${offload.join(
          ", ",
        )} and close.`
      : "No missing passengers reachable. Cleared to close.",
    offload,
    inbound,
  };
}
