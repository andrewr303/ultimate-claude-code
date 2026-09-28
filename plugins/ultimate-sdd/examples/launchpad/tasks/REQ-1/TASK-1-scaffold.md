---
id: TASK-1
req: REQ-1
title: Scaffold Next.js app and env documentation
status: planned
blocked_by: []
blocks: [TASK-2]
ac: [AC-7]
created: 2026-08-16
updated: 2026-08-16
---

# REQ-1 / TASK-1 — Scaffold Next.js app and env documentation

Example task written as if REQ-1 were already specified (see `examples/quality-bar/REQ-1-foundation.specified.md`).

## Goal

App boots locally. `.env.example` documents `LL2_API_KEY` and `LL2_API_BASE_URL`. No secrets committed.

## Context

- Parent: REQ-1 foundation
- Reuse: none (greenfield)
- Do not: list UI, LL2 calls (TASK-2)
- Env: document keys only

## Steps

1. Scaffold Next.js + TypeScript App Router.
2. Add `.env.example` with the two keys and comments. Gitignore `.env.local`.
3. Confirm `next dev` serves `/` without an API key (page may error until TASK-3).

## Acceptance criteria owned

- **AC-7** Given a fresh clone, When a developer opens `.env.example`, Then `LL2_API_KEY` and `LL2_API_BASE_URL` are documented and no secret values are present.

## Verify

- `git check-ignore -v .env.local`
- Open `.env.example` — keys present, no token literals

## Send-back

**Blocker:** —
