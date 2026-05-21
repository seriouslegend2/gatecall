"use client";

// Shared board state for every page: fetches /api/state, keeps a slow
// reconciliation poll running, subscribes to Supabase Realtime for instant
// updates, and ticks a 1-second clock for the gate-close countdowns.

import { useCallback, useEffect, useState } from "react";
import type { StateResponse } from "./types";
import { getBrowserSupabase } from "./supabase-browser";

const POLL_MS = 6000;
const REALTIME_TABLES = ["cohorts", "flights", "passengers", "calls"];

export interface Board {
  state: StateResponse | null;
  now: number;
  realtime: boolean;
  reload: () => Promise<void>;
}

export function useBoard(): Board {
  const [state, setState] = useState<StateResponse | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [realtime, setRealtime] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      setState((await res.json()) as StateResponse);
    } catch {
      /* transient — keep the last good board; the next poll retries */
    }
  }, []);

  // Reconciliation poll — also backstops Realtime if an event is missed.
  useEffect(() => {
    reload();
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, [reload]);

  // 1-second clock for the countdowns.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime — refresh the instant any row changes.
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        reload();
      }, 250);
    };

    const channel = sb.channel("gatecall-board");
    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        refresh,
      );
    }
    channel.subscribe((status) => setRealtime(status === "SUBSCRIBED"));

    return () => {
      if (debounce) clearTimeout(debounce);
      setRealtime(false);
      sb.removeChannel(channel);
    };
  }, [reload]);

  return { state, now, realtime, reload };
}
