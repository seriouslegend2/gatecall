# Enterprise Use Case — Missing-Passenger Reconciliation at Boarding

> Source material for Objective 1 of the assignment (the deck).

## The problem

Airports are going **"silent."** To cut noise, major airports have stopped
routine boarding and final-call announcements. Passengers in lounges, at food
courts, or absorbed in their phones no longer hear that their flight is
closing — and miss it.

At the gate this lands on the airline as a scramble. When boarding closes and
a passenger is missing, the gate agent does not know the one thing that
decides everything: **is this passenger 90 seconds away, or not coming at
all?** Today they find out by:

- making a few manual phone calls (one agent, one call at a time), or
- waiting and guessing, then closing the gate.

A confirmed no-show is not just an empty seat. For security, a checked bag
**cannot fly without its owner** — so the bag must be located in the hold and
offloaded. Baggage offload is one of the largest causes of last-minute
departure delays, and the delay grows the later the decision is made.

## Who feels it

- **Gate agents** — minutes lost per flight on manual calling and guessing.
- **The airline** — delayed departures, missed slots, knock-on schedule cost.
- **Other passengers** — a full aircraft held for one unaccounted person.
- **The missing passenger** — no nudge, no information, a missed flight.

## The workflow GateCall introduces

```
Boarding closes
      │
      ▼
Gate agent opens GateCall ──▶ sees every passenger not yet boarded
      │
      ▼
"Call missing passengers"  ──▶  Bolna voice agent dials them all in parallel
      │
      ▼
Each call: confirm identity → state gate + minutes left
           → capture location, ETA, intent → guide them to the gate
      │
      ▼
Bolna transcribes + extracts structured status
      │
      ▼
Dashboard updates live ──▶ one recommendation:  HOLD n MIN  |  CLOSE + OFFLOAD
      │
      ▼
Gate agent makes one informed decision
```

A voice agent is the right tool because it does what a human gate agent
physically cannot: **call every missing passenger at the same time** and hand
back a structured status, not just a voicemail.

## Outcome metrics

| Metric | Today | With GateCall |
|---|---|---|
| **Time-to-resolve a missing passenger** (flagged → status known) | Often never — you simply don't know | One parallel call, ≈ 1–2 minutes |
| On-time departure (D-15) | Eroded by blind waiting | Decision made on facts, earlier |
| Bag-offload events | Decided late, maximal delay | No-shows confirmed early, bag pulled sooner |
| Gate-agent effort | Manual calls, one at a time | One click, calls run in parallel |

**Headline metric: time-to-resolve a missing passenger.** It is the lever
every other number moves with — and it is what the demo makes visible.

## Why it fits Bolna

It is a real, repeatable, enterprise voice workflow: high call volume
(every flight, every day), vernacular passengers, a hard time constraint, and
a measurable operational outcome — exactly the kind of production voice use
case Bolna is built for.
