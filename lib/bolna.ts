// Thin server-side client for the Bolna Voice AI API.
// Docs: https://www.bolna.ai/docs  ·  base URL: https://api.bolna.ai

const BOLNA_BASE = "https://api.bolna.ai";

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.BOLNA_API_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

export interface StartCallInput {
  recipientPhone: string;
  /** Dynamic variables surfaced to the agent prompt as {variable_name}. */
  userData: Record<string, string | number>;
}

export interface StartCallResult {
  ok: boolean;
  executionId?: string;
  error?: string;
}

/** POST /call — places one outbound call and returns its execution id. */
export async function startBolnaCall({
  recipientPhone,
  userData,
}: StartCallInput): Promise<StartCallResult> {
  const agentId = process.env.BOLNA_AGENT_ID;
  if (!agentId) return { ok: false, error: "BOLNA_AGENT_ID is not set" };

  const body: Record<string, unknown> = {
    agent_id: agentId,
    recipient_phone_number: recipientPhone,
    user_data: userData,
  };
  // Only needed for dedicated/purchased numbers; omit for Bolna's default numbers.
  if (process.env.BOLNA_FROM_NUMBER) {
    body.from_phone_number = process.env.BOLNA_FROM_NUMBER;
  }

  try {
    const res = await fetch(`${BOLNA_BASE}/call`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON body */
    }

    if (!res.ok) {
      const detail =
        (json.detail as string) ||
        (json.message as string) ||
        text ||
        `HTTP ${res.status}`;
      return { ok: false, error: `Bolna /call failed: ${detail}` };
    }

    const executionId =
      (json.execution_id as string) ||
      (json.call_id as string) ||
      (json.id as string);
    if (!executionId) {
      return { ok: false, error: "Bolna /call returned no execution id" };
    }
    return { ok: true, executionId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error calling Bolna",
    };
  }
}

/** Shape of the AgentExecution object returned by GET /executions/{id}. */
export interface BolnaExecution {
  id?: string;
  agent_id?: string;
  status?: string;
  transcript?: unknown;
  extracted_data?: Record<string, unknown> | null;
  answered_by_voice_mail?: boolean;
  error_message?: string | null;
  conversation_duration?: number;
  total_cost?: number;
  telephony_data?: {
    recording_url?: string;
    to_number?: string;
    from_number?: string;
    duration?: string;
  } | null;
  [k: string]: unknown;
}

/** GET /executions/{id} — fetches the latest state of one call. */
export async function getBolnaExecution(
  executionId: string,
): Promise<BolnaExecution | null> {
  try {
    const res = await fetch(`${BOLNA_BASE}/executions/${executionId}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as BolnaExecution;
  } catch {
    return null;
  }
}
