"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions";

/** App header — logo, nav, the live-connection indicator, and log out. */
export default function TopBar({ realtime }: { realtime?: boolean }) {
  const pathname = usePathname();

  const navCls = (active: boolean) =>
    `rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
      active
        ? "bg-slate-800 text-slate-100"
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    }`;

  return (
    <header className="mb-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/15 text-lg">
            📞
          </div>
          <div>
            <div className="font-semibold tracking-tight text-white">
              GateCall
            </div>
            <div className="text-[11px] text-slate-500">
              Boarding reconciliation console
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <Link href="/" className={navCls(pathname === "/")}>
            Departures
          </Link>
          <Link href="/cohorts" className={navCls(pathname === "/cohorts")}>
            Cohorts
          </Link>
          <Link href="/calls" className={navCls(pathname === "/calls")}>
            Calls
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {realtime !== undefined && (
          <span
            className="flex items-center gap-1.5 text-xs text-slate-400"
            title={
              realtime
                ? "Connected to Supabase Realtime — the board updates on every database change"
                : "Realtime not connected — running on the reconciliation poll"
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                realtime ? "animate-pulse bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {realtime ? "Realtime" : "Polling"}
          </span>
        )}
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
