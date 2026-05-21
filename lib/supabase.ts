import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client. It uses the service-role key, which bypasses
// Row Level Security — so it must never be imported into a client component.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
