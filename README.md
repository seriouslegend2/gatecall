# GateCall — Boarding Reconciliation Console

A Voice-AI workflow for airline gate operations. When boarding closes and
passengers are missing, GateCall has a **Bolna voice agent call them all in
parallel**, asks where they are and whether they will make the flight,
extracts a structured status from each call, and shows gate staff a live board
with one clear recommendation: **hold the gate**, or **close it and offload
bags**.

Built for the Bolna Full-Stack assignment.

- **Problem & metrics:** [`docs/use-case.md`](docs/use-case.md)
- **Voice agent setup:** [`docs/bolna-agent-setup.md`](docs/bolna-agent-setup.md)

---

## Why this exists

Airports have cut routine boarding announcements ("silent airports"), so
passengers miss flights — and gate agents are left guessing whether a missing
passenger is 90 seconds away or a no-show. A no-show forces a checked-bag
offload, a top cause of departure delays. A human agent can only call one
passenger at a time; a voice agent calls every missing passenger at once and
hands back a structured status. See [`docs/use-case.md`](docs/use-case.md).

## The full flow

```
Gate agent ─▶ Web app ─▶ Bolna voice agent ─▶ Backend logic ─▶ Live dashboard
  (user)     "Call all"   parallel outbound    extract status   hold / close +
                            calls              → verdict        offload bags
```

1. The gate agent opens the **departures overview** — every boarding flight,
   live, each with its missing-passenger count.
2. They open a flight; one click triggers parallel outbound calls via the
   Bolna API.
3. Each call captures location, ETA, and boarding intent.
4. The backend maps each call to a **verdict** and aggregates a **gate
   recommendation**.
5. The board updates live — status chips, transcript, call recording — and the
   overview card reflects it too.

The console handles **multiple flights**; new flights can be added from the UI.

## Architecture — event-driven

The UI never polls for *data*; it **subscribes** to the database. Call results
enter Postgres two ways, and either path pushes to every open dashboard
instantly:

```
                        ┌─ Bolna webhook ───────────┐  (push — primary)
 Bolna call completes ──┤                            ├──▶ Supabase Postgres
                        └─ reconciliation poll ──────┘  (pull — backstop)         │
                                                                                  │ Realtime
 Gate dashboard  ◀──────────  Supabase Realtime (Postgres change feed)  ◀─────────┘
```

- **Push:** Bolna posts each execution update to `/api/webhooks/bolna`.
- **Backstop:** a 6-second server-side reconciliation poll syncs Bolna call
  state into Postgres — so the app works locally with no public webhook URL.
- **Realtime:** the dashboard subscribes via Supabase Realtime, so the board
  reacts the instant a row changes (open two tabs — they move in lockstep).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | React 19 + Tailwind CSS 4 |
| Backend | Next.js Route Handlers (`app/api/*`) + Edge proxy (auth) |
| Database | Supabase (Postgres) |
| Live updates | Supabase Realtime — Postgres change subscriptions |
| Voice AI | Bolna — `POST /call`, `GET /executions/{id}`, webhook |
| Hosting | Vercel (app + API) + Supabase (DB) — both free tier |

## Project structure

```
proxy.ts                    session gate for every page + API route
app/
  page.tsx                  departures overview — every flight, live
  flight/[id]/page.tsx      one flight's board — call controls + live cards
  flight/new/page.tsx       add-flight form
  login/page.tsx            gate-agent sign-in
  api/state/route.ts          GET  — reconcile live calls, return the board
  api/calls/start/route.ts    POST — parallel outbound Bolna calls for a flight
  api/flights/route.ts        POST — create a flight + passengers
  api/reset/route.ts          POST — re-seed the demo flights
  api/webhooks/bolna/route.ts POST — Bolna push updates (primary ingest path)
  api/auth/[login|logout]     POST — session cookie
components/                 TopBar · FlightSummaryCard · FlightHeader ·
                            PassengerCard · StatusBadge · DecisionPanel · Notices
lib/
  useBoard.ts               shared hook: fetch + poll + Realtime + clock
  actions.ts                client-side API wrappers
  bolna.ts                  Bolna API client
  supabase.ts / db.ts       server Supabase client (service role) + data access
  supabase-browser.ts       browser Supabase client (anon key) for Realtime
  auth.ts                   session token helpers
  logic.ts                  status mapping, extraction parsing, decision logic
  seed.ts                   demo flight data
  display.ts / types.ts     UI labels + shared types
prompt.py                   the voice agent's welcome message + system prompt
supabase/migrations/        database migrations (tables, RLS, Realtime publication)
docs/
  bolna-agent-setup.md      full agent setup (voice, LLM, extractions)
  use-case.md               problem, workflow, and outcome metrics
```

## Setup

### 1. Database — Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Apply the migration in [`supabase/migrations/`](supabase/migrations) — open
   **SQL Editor**, paste the migration file, and run it (or `supabase db push`
   with the CLI). It creates the tables and enables Row Level Security plus the
   Realtime publication the dashboard subscribes to.
3. From **Project Settings → API**, copy the **Project URL**, the
   **`service_role`** key (server), and the **`anon`** key (browser Realtime).

### 2. Voice agent — Bolna

Create the agent following
[`docs/bolna-agent-setup.md`](docs/bolna-agent-setup.md) (structured prompt +
extractions). Note the **agent id**, and get an **API key** from the Bolna
dashboard.

### 3. Environment

Fill in `.env.local` (already present; see `.env.example` for guidance):

```
SUPABASE_URL=...                  # server (service-role)
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...       # browser (Realtime) — same URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # anon key — safe in the browser
BOLNA_API_KEY=...
BOLNA_AGENT_ID=...
DEMO_PHONE_1=+91...      # a phone you can answer, to role-play a passenger
DEMO_PHONE_2=+91...
DEMO_PHONE_3=+91...
GATE_USER=gate-agent    # gate-console login (pick any values)
GATE_PASSWORD=...
```

### 4. Run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The three demo flights seed themselves on first
load. If any variable is missing the dashboard shows exactly what to add.

## Deploy (Vercel — free)

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add the same environment variables in **Project → Settings → Environment
   Variables**.
4. Deploy. The app and its API run together as one Vercel project.
5. *(Optional)* In the Bolna dashboard, set the webhook URL to
   `https://YOUR-APP.vercel.app/api/webhooks/bolna` for push updates.

## Demo script

1. On the **Departures** overview, click **Reset demo** for three fresh flights.
2. Open a flight — its not-yet-boarded passengers are listed.
3. Click **Call missing passengers** — calls dial in parallel.
4. Answer on your demo phone and role-play, e.g.:
   - *"I'm past security, about 5 minutes from the gate, yes I'm coming."*
   - *"I'm stuck in traffic, I won't make it."*
   - Leave one unanswered to show the **Unreachable** path.
5. Cards update live with location, ETA, intent, transcript, and the call
   recording. The **Gate decision** panel resolves to a hold/close call.
6. Go back to the overview — that flight's card reflects the new status live.
   Try **+ Add flight** to create your own flight and passengers.

> Tip: open the dashboard in two browser windows side by side — Supabase
> Realtime keeps them in lockstep, which makes the live updates obvious on the
> recording.

## Authentication

The console is gated behind a sign-in (`/login`). The gate agent authenticates
with `GATE_USER` / `GATE_PASSWORD`; a session middleware protects every page
and API route, so the deployed URL — and your Bolna credits — can't be used by
strangers. If both variables are left blank the app runs open, which is only
appropriate for local development.

## Notes

- All secrets stay server-side; the browser only ever holds the Supabase anon
  key, which is read-only by RLS and designed to be public.
- The board is push-driven (Supabase Realtime); the reconciliation poll is the
  backstop, and the Bolna webhook is the primary ingest path once deployed.
- Bolna allows 10 concurrent calls by default — ample for a flight's missing
  passengers.
- A Supabase free project pauses after ~7 days idle; reopen it in the
  Supabase dashboard to resume.
