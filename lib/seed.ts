// Demo data — control cohorts, three flights mapped to them, and passengers.
// Times are generated relative to "now" so every gate-close countdown is live.
// Missing passengers are dialled on DEMO_PHONE_1 / DEMO_PHONE_2 so the calls
// reach a phone you can answer.
//
// IndiGo 6E 2614 is the clean demo flight: exactly two missing passengers,
// one on each number — pressing "Call missing passengers" dials both.

import type { Cohort, Flight, Passenger } from "./types";

export interface SeedData {
  cohorts: Cohort[];
  flights: Flight[];
  passengers: Passenger[];
}

export function buildSeed(now: Date = new Date()): SeedData {
  const at = (m: number) => new Date(now.getTime() + m * 60_000).toISOString();
  const ts = now.toISOString();

  const phone1 = process.env.DEMO_PHONE_1 || "+910000000001";
  const phone2 = process.env.DEMO_PHONE_2 || "+910000000002";

  const cohorts: Cohort[] = [
    {
      id: "co-standard",
      name: "Domestic — Standard",
      auto_call_enabled: true,
      auto_call_window_min: 5,
      max_call_attempts: 1,
      gate_hold_buffer_min: 3,
      offload_grace_min: 2,
      call_language: "auto",
      created_at: ts,
    },
    {
      id: "co-tight",
      name: "Tight Turnaround",
      auto_call_enabled: true,
      auto_call_window_min: 8,
      max_call_attempts: 2,
      gate_hold_buffer_min: 1,
      offload_grace_min: 0,
      call_language: "auto",
      created_at: ts,
    },
    {
      id: "co-intl",
      name: "Wide-body / International",
      auto_call_enabled: true,
      auto_call_window_min: 10,
      max_call_attempts: 2,
      gate_hold_buffer_min: 5,
      offload_grace_min: 5,
      call_language: "english",
      created_at: ts,
    },
  ];

  const flights: Flight[] = [
    {
      id: "fl-qp1413",
      airline: "Akasa Air",
      flight_no: "QP 1413",
      origin: "BLR",
      destination: "HYD",
      gate: "8",
      departure_time: at(16),
      gate_close_time: at(6), // closing very soon
      status: "boarding",
      cohort_id: "co-tight",
    },
    {
      id: "fl-6e2614",
      airline: "IndiGo",
      flight_no: "6E 2614",
      origin: "BLR",
      destination: "DEL",
      gate: "23",
      departure_time: at(32),
      gate_close_time: at(18),
      status: "boarding",
      cohort_id: "co-standard",
    },
    {
      id: "fl-ai505",
      airline: "Air India",
      flight_no: "AI 505",
      origin: "BLR",
      destination: "BOM",
      gate: "14",
      departure_time: at(55),
      gate_close_time: at(40),
      status: "boarding",
      cohort_id: "co-intl",
    },
  ];

  let order = 0;
  // A passenger with a `phone` is "not boarded" (callable); without one,
  // they have already boarded.
  const px = (
    flightId: string,
    name: string,
    seat: string,
    phone?: string,
  ): Passenger => ({
    id: `px-${++order}`,
    flight_id: flightId,
    name,
    seat,
    phone: phone ?? "+910000000000",
    boarding_status: phone ? "not_boarded" : "boarded",
    sort_order: order,
  });

  const passengers: Passenger[] = [
    // QP 1413 — BLR→HYD · 1 missing
    px("fl-qp1413", "Neha Kulkarni", "2A"),
    px("fl-qp1413", "Rahul Verma", "7C"),
    px("fl-qp1413", "Sneha Bhat", "10B"),
    px("fl-qp1413", "Dev Patel", "14E"),
    px("fl-qp1413", "Aisha Khan", "19F", phone1),
    // 6E 2614 — BLR→DEL · 2 missing, one per number (the demo flight)
    px("fl-6e2614", "Aarav Mehta", "12A"),
    px("fl-6e2614", "Diya Sharma", "12B"),
    px("fl-6e2614", "Rohan Iyer", "18C"),
    px("fl-6e2614", "Ananya Reddy", "22F"),
    px("fl-6e2614", "Vikram Nair", "9D", phone1),
    px("fl-6e2614", "Priya Menon", "27A", phone2),
    // AI 505 — BLR→BOM · 2 missing
    px("fl-ai505", "Saanvi Joshi", "4A"),
    px("fl-ai505", "Aditya Rao", "4C"),
    px("fl-ai505", "Ishaan Gupta", "16D"),
    px("fl-ai505", "Meera Pillai", "20C"),
    px("fl-ai505", "Arjun Desai", "11F", phone1),
    px("fl-ai505", "Kavya Nair", "25A", phone2),
  ];

  return { cohorts, flights, passengers };
}
