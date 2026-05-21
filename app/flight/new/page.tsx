"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFlight } from "@/lib/actions";
import type { Cohort } from "@/lib/types";
import TopBar from "@/components/TopBar";

interface PaxRow {
  name: string;
  seat: string;
  phone: string;
  boarded: boolean;
}

const blankPax = (): PaxRow => ({
  name: "",
  seat: "",
  phone: "",
  boarded: false,
});

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500";
const labelCls = "block text-xs font-medium text-slate-400";

/** Form to create a new flight, mapped to a cohort, with its passengers. */
export default function NewFlightPage() {
  const router = useRouter();
  const [airline, setAirline] = useState("");
  const [flightNo, setFlightNo] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [gate, setGate] = useState("");
  const [gateCloseInMin, setGateCloseInMin] = useState("18");
  const [departInMin, setDepartInMin] = useState("30");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [pax, setPax] = useState<PaxRow[]>([blankPax(), blankPax(), blankPax()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { cohorts?: Cohort[] }) => {
        const cs = d.cohorts ?? [];
        setCohorts(cs);
        if (cs.length) setCohortId(cs[0].id);
      })
      .catch(() => {});
  }, []);

  function setRow(i: number, patch: Partial<PaxRow>) {
    setPax((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const d = await createFlight({
      airline,
      flight_no: flightNo,
      origin,
      destination,
      gate,
      departInMin: Number(departInMin),
      gateCloseInMin: Number(gateCloseInMin),
      cohort_id: cohortId || null,
      passengers: pax.filter((p) => p.name.trim()),
    });
    if (d.ok && d.flightId) {
      router.push(`/flight/${d.flightId}`);
      return;
    }
    setError(d.error ?? "Could not create flight");
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <TopBar />
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-slate-400 transition hover:text-slate-200"
      >
        ← All flights
      </Link>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Add a flight</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Create a flight, map it to a cohort, and add its passengers.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Flight details
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>
              Airline
              <input
                className={`mt-1 ${inputCls}`}
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="IndiGo"
                required
              />
            </label>
            <label className={labelCls}>
              Flight number
              <input
                className={`mt-1 ${inputCls}`}
                value={flightNo}
                onChange={(e) => setFlightNo(e.target.value)}
                placeholder="6E 2614"
                required
              />
            </label>
            <label className={labelCls}>
              Origin
              <input
                className={`mt-1 ${inputCls}`}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="BLR"
                required
              />
            </label>
            <label className={labelCls}>
              Destination
              <input
                className={`mt-1 ${inputCls}`}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="DEL"
                required
              />
            </label>
            <label className={labelCls}>
              Gate
              <input
                className={`mt-1 ${inputCls}`}
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                placeholder="23"
                required
              />
            </label>
            <label className={labelCls}>
              Cohort (control profile)
              <select
                className={`mt-1 ${inputCls}`}
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
              >
                {cohorts.length === 0 && <option value="">No cohorts</option>}
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>
                Gate closes in (min)
                <input
                  type="number"
                  min={1}
                  className={`mt-1 ${inputCls}`}
                  value={gateCloseInMin}
                  onChange={(e) => setGateCloseInMin(e.target.value)}
                />
              </label>
              <label className={labelCls}>
                Departs in (min)
                <input
                  type="number"
                  min={1}
                  className={`mt-1 ${inputCls}`}
                  value={departInMin}
                  onChange={(e) => setDepartInMin(e.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Passengers
            </h2>
            <button
              type="button"
              onClick={() => setPax((r) => [...r, blankPax()])}
              className="text-xs font-medium text-sky-400 hover:text-sky-300"
            >
              + Add passenger
            </button>
          </div>

          <div className="mt-3 grid grid-cols-12 gap-2 px-1 text-[10px] uppercase tracking-wide text-slate-500">
            <span className="col-span-4">Name</span>
            <span className="col-span-2">Seat</span>
            <span className="col-span-4">Phone</span>
            <span className="col-span-1 text-center">On</span>
            <span className="col-span-1" />
          </div>

          <div className="mt-1 space-y-2">
            {pax.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  className={`col-span-4 ${inputCls}`}
                  value={p.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  placeholder="Passenger name"
                />
                <input
                  className={`col-span-2 ${inputCls}`}
                  value={p.seat}
                  onChange={(e) => setRow(i, { seat: e.target.value })}
                  placeholder="12A"
                />
                <input
                  className={`col-span-4 ${inputCls}`}
                  value={p.phone}
                  onChange={(e) => setRow(i, { phone: e.target.value })}
                  placeholder="+9198XXXXXXXX"
                />
                <label
                  className="col-span-1 flex items-center justify-center"
                  title="Already boarded"
                >
                  <input
                    type="checkbox"
                    checked={p.boarded}
                    onChange={(e) => setRow(i, { boarded: e.target.checked })}
                    className="h-4 w-4 accent-sky-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setPax((r) => r.filter((_, idx) => idx !== i))
                  }
                  className="col-span-1 text-slate-500 transition hover:text-rose-400"
                  aria-label="Remove passenger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            Tick <span className="text-slate-400">On</span> if the passenger has
            already boarded. Not-boarded passengers need a phone number in E.164
            format (e.g. +9198XXXXXXXX) — that is the number the agent dials.
          </p>
        </section>

        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create flight"}
          </button>
          <Link
            href="/"
            className="text-sm text-slate-400 transition hover:text-slate-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
