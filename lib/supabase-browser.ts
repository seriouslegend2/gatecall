// Browser-side Supabase client — used only to subscribe to Realtime row
// changes. It uses the public anon key (safe to ship to the browser; the
// tables expose a read-only RLS policy). All writes still go through the
// server with the service-role key.
//
// If the NEXT_PUBLIC_* vars are not set, this returns null and the dashboard
// falls back to its reconciliation poll — Realtime is a progressive upgrade,
// never a hard dependency.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
