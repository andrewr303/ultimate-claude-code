---
id: BRIEF-1
title: Launchpad — Rocket Launch Tracker
status: aligned
created: 2026-08-16
updated: 2026-08-16
---

# Launchpad — Rocket Launch Tracker

**One-liner:** A clean, filterable web app that shows upcoming rocket launches powered by the Launch Library 2 API.

**Value Proposition:** Space enthusiasts want a fast, no-noise way to see what's launching soon, from where, and by whom — without digging through cluttered sites.

**Who it's for:** Space fans, hobbyists, and anyone who wants to track upcoming launches at a glance.

**Job to be done:** Quickly see what's launching next, filter by launch site (Vandenberg, Kennedy, Baikonur, etc.) or provider (SpaceX, Rocket Lab, ULA, etc.), and get the key details.

## Key Functionality

- Upcoming launches list — name, date/time, rocket, mission summary
- Filter by launch site (Vandenberg SFB, Kennedy Space Center, Baikonur Cosmodrome, etc.)
- Filter by launch provider (SpaceX, Rocket Lab, ULA, Roscosmos, etc.)
- Launch detail view — pad location, mission description, live stream link (LL2 provides these)
- Powered by Launch Library 2 API (`/launch/upcoming/` with `location__ids` and `lsp__ids` filters)

## Out of Scope (not v1)

- User accounts / saved favorites — no identity in v1
- Push notifications for launch countdowns — needs accounts + a worker
- Past launches history view — LL2 has it; not the v1 job
- Map view of launch sites — extra surface
- Mobile app — web only

## Decisions already made

- Stack: Next.js + TypeScript, deploy on Vercel, no database
- Rate limit: server-side cache so all users share the free-tier quota
- Sequencing: foundation → list → detail

## Open questions

| ID | Question | Default if skipped |
|---|---|---|
| Q-1 | Cache TTL for `/launch/upcoming/` | 10 minutes |

## Alignment

Aligned. Create Project Plan produced EPIC-1 with REQ-1, REQ-2, REQ-3.
