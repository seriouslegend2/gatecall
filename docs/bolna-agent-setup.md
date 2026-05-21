# Bolna Voice AI Agent — Setup

This is the agent the web app dials. Create it once in the Bolna dashboard,
then put its id in `BOLNA_AGENT_ID`.

The agent has one job per call: reach a passenger who has not yet boarded,
find out **where they are and whether they will make the flight**, give them
what they need to get to the gate fast, and let Bolna extract a structured
status that the web app turns into a gate decision.

---

## 1. Agent identity

| Field | Value |
|---|---|
| Agent name | `GateCall — Boarding Reconciliation` |
| Language | English (add Hindi if your voice/transcriber supports it) |
| LLM | `gpt-4.1-mini` (or similar) · temperature `0.3` |
| Transcriber | Deepgram `nova-3` |
| Voice | any natural Indian-English voice |
| Max call duration | ~120 seconds |

## 2. Welcome message + system prompt

The agent's spoken **welcome message** and full **system prompt** live in their
own editable file: **[`prompt.py`](../prompt.py)** (in the repo root).

Open that file, copy the two blocks into the Bolna dashboard (the agent's
*Welcome message* and *Prompt* fields), and edit the wording there whenever you
want to tweak how the agent talks. Run `python prompt.py` to print both blocks
ready to copy. It also lists the `{variables}` the web app supplies on every
call.

## 3. Extractions (post-call structured data)

Add these under **Extractions / Post-call analysis**. The web app reads them
from `extracted_data` on the execution, so the **disposition names and the
option values must match exactly**.

Category: **Boarding Reconciliation**

| Disposition (exact name) | Question | Type | Options (value → condition) |
|---|---|---|---|
| `location_status` | Where is the passenger right now? | Pre-defined | `at_gate` → at/near the boarding gate · `past_security` → cleared security, not yet at gate · `in_terminal` → inside the airport, not past security · `outside_airport` → not yet inside the airport · `unknown` → could not be determined |
| `eta_minutes` | How many minutes did the passenger estimate to reach the gate? Answer with a number only. | Free text (numeric) | — |
| `will_board` | Does the passenger still intend to board this flight? | Pre-defined | `yes` → heading to the gate · `no` → will not / cannot board · `unsure` → did not say clearly |
| `call_outcome` | What was the outcome of this call? | Pre-defined | `reached` → spoke with the passenger · `wrong_person` → reached someone else · `voicemail` → reached a machine · `no_answer` → not answered |

> The parser in `lib/logic.ts` is tolerant of casing and spacing and falls
> back to keyword matching, but matching these values exactly keeps the
> dashboard accurate.

## 4. Webhook (optional)

The web app keeps itself fresh by polling `GET /executions/{id}`, so a webhook
is **not required**. For production push-updates, set the webhook URL in the
Bolna dashboard (Analytics → "Push all execution data to webhook") to:

```
https://YOUR-DEPLOYED-APP.vercel.app/api/webhooks/bolna
```

## 5. Finish

Copy the agent id into `.env.local`:

```
BOLNA_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
