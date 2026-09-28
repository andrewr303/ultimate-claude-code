---
id: EPIC-1
title: Launchpad — Rocket Launch Tracker
status: ready
spec: SPEC-1
brief: BRIEF-1
prd:
reqs: [REQ-1, REQ-2, REQ-3]
effort: high
created: 2026-08-16
updated: 2026-08-16
---

# EPIC-1 — Launchpad — Rocket Launch Tracker

## Outcome

A visitor can see upcoming launches, filter them by site and provider, and open a detail page. No accounts.

## Why this slice

This is the entire v1. One EPIC, three sequential REQs: foundation, list, detail.

## Requirements

| # | ID | Title | Status | Ready | Blocked by |
|---|---|---|---|---|---|
| 1 | REQ-1 | Project foundation & Launch Library 2 API integration | idea | 1/5 | — |
| 2 | REQ-2 | Upcoming launches list with location & provider filters | blocked | 1/5 | REQ-1 |
| 3 | REQ-3 | Launch detail page | blocked | 1/5 | REQ-2 |

## Out of scope for this EPIC

Accounts, push, history, map, native apps (see BRIEF-1).

## Done when

- REQ-1, REQ-2, REQ-3 are `done` with verification records
- Visitor can complete the JTBD without a console error
