---
id: TASK-3
req: REQ-1
title: Landing page confirmation string and global style tokens
status: blocked
blocked_by: [TASK-2]
blocks: []
ac: [AC-3, AC-4, AC-6, AC-8]
created: 2026-08-16
updated: 2026-08-16
---

# REQ-1 / TASK-3 — Landing page confirmation string and global style tokens

## Goal

`/` is a Server Component that prints `Upcoming launches loaded: N` or the exact error string. Global CSS tokens match the specified REQ.

## Context

- Parent: REQ-1 FR-2, FR-3
- Reuse: TASK-2 client
- Do not: list UI, filters

## Steps

1. Render `/` from the LL2 client.
2. Exact success/error copy from the REQ.
3. Define the five CSS custom properties and load Inter.

## Acceptance criteria owned

- **AC-3** success copy with count
- **AC-4** exact error string
- **AC-6** five tokens
- **AC-8** Server Component, no nav/sidebar/footer

## Verify

- Render `/` with a stubbed client returning 12 items — page contains `Upcoming launches loaded: 12`
- Render with a throwing client — exact error string

## Send-back

**Blocker:** —
