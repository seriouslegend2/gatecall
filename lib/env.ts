// Reports which environment variables are present so the UI can guide setup
// instead of crashing when the app is run before `.env.local` is filled in.

const REQUIRED_SUPABASE = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const REQUIRED_BOLNA = ["BOLNA_API_KEY", "BOLNA_AGENT_ID"] as const;

export function missingSupabaseEnv(): string[] {
  return REQUIRED_SUPABASE.filter((k) => !process.env[k]);
}

export function missingBolnaEnv(): string[] {
  return REQUIRED_BOLNA.filter((k) => !process.env[k]);
}

export function isSupabaseConfigured(): boolean {
  return missingSupabaseEnv().length === 0;
}

export function isBolnaConfigured(): boolean {
  return missingBolnaEnv().length === 0;
}
