# Design — Show a live countdown to net on each launch row

## Context

`net` is already on each list row from the LL2 client. No new endpoint.

## Goals / Non-Goals

**Goals:**

- Live countdown on every upcoming row
- Stop or switch label at T-0

**Non-Goals:**

- Server-sent ticks
- Timezone picker

## Decisions

### Decision: Client timer from `net`
- Why: the timestamp is already on the row; a 1s interval is enough
- Alternatives considered: server-rendered remaining time (stale on a long tab)

## Risks / Trade-offs

- Background tabs throttle timers — accept; recalculate from `net` on each tick so drift stays small

## File changes

- `app/launches/LaunchRow.tsx` (modified) — render countdown
- `lib/countdown.ts` (new) — format `T-HH:MM:SS` / `T+…`
