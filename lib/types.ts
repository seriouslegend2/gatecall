// Shared domain types for GateCall.

export type BoardingStatus = "not_boarded" | "boarded";

/** Lifecycle of an outbound voice call, mapped down from Bolna's statuses. */
export type CallStatus =
  | "calling" // request accepted by Bolna, call not yet connected
  | "ringing"
  | "in_progress"
  | "completed"
  | "no_answer"
  | "failed";

/** Where the passenger is, extracted from the call. */
export type LocationStatus =
  | "at_gate"
  | "past_security"
  | "in_terminal"
  | "outside_airport"
  | "unknown";

export type WillBoard = "yes" | "no" | "unsure";

export type CallOutcome = "reached" | "wrong_person" | "voicemail" | "no_answer";

export type CallLanguage = "auto" | "english" | "hindi";

/** A reusable control profile. Flights are mapped to a cohort and follow its
 *  controls. */
export interface Cohort {
  id: string;
  name: string;
  auto_call_enabled: boolean;
  auto_call_window_min: number;
  max_call_attempts: number;
  gate_hold_buffer_min: number;
  offload_grace_min: number;
  call_language: CallLanguage;
  created_at: string;
}

export interface Flight {
  id: string;
  airline: string;
  flight_no: string;
  origin: string;
  destination: string;
  gate: string;
  departure_time: string; // ISO
  gate_close_time: string; // ISO
  status: string;
  cohort_id: string | null; // the cohort this flight is mapped to
}

/** A passenger's identity. Call state lives in `Call`, not here. */
export interface Passenger {
  id: string;
  flight_id: string;
  name: string;
  seat: string;
  phone: string;
  boarding_status: BoardingStatus;
  sort_order: number;
}

/** One outbound voice call. A passenger may have several (re-calls); the most
 *  recent is their current call state. */
export interface Call {
  id: string;
  passenger_id: string;
  flight_id: string;
  bolna_execution_id: string | null;
  call_status: CallStatus;
  location_status: LocationStatus | null;
  eta_minutes: number | null;
  will_board: WillBoard | null;
  call_outcome: CallOutcome | null;
  transcript: string | null;
  recording_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** The gate agent's at-a-glance read on one passenger. */
export type Verdict =
  | "will_make_it"
  | "at_risk"
  | "coming_unknown_eta"
  | "wont_board"
  | "unreachable"
  | "pending";

export interface Recommendation {
  headline: string;
  action: "hold" | "close" | "monitor";
  detail: string;
  offload: string[]; // passengers whose checked bags must be pulled
  inbound: string[]; // passengers expected to reach the gate
}

/** The whole board — every cohort, flight, passenger, and call. */
export interface StateResponse {
  configured: boolean;
  missingEnv: string[];
  cohorts: Cohort[];
  flights: Flight[];
  passengers: Passenger[];
  calls: Call[];
  generatedAt: string;
  error?: string;
}

export type ToastMsg = { kind: "ok" | "error"; msg: string };
