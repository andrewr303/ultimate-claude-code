---
id: TASK-2
req: REQ-1
title: Server-side LL2 client with token auth and 10-minute cache
status: blocked
blocked_by: [TASK-1]
blocks: [TASK-3]
ac: [AC-1, AC-2, AC-5, AC-9]
created: 2026-08-16
updated: 2026-08-16
---

# REQ-1 / TASK-2 — Server-side LL2 client with token auth and 10-minute cache

## Goal

`lib/ll2.ts` (or equivalent) wraps `/launch/upcoming/`, sends `Authorization: Token <LL2_API_KEY>`, caches 600s, exports v1 types. Throws before fetch if the key is missing.

## Context

- Parent: REQ-1 FR-1
- Reuse: TASK-1 scaffold
- Do not: UI, filters (`location__ids` is REQ-2)
- Env: `LL2_API_KEY`, `LL2_API_BASE_URL`

## Steps

1. Add typed client using Next.js `fetch` + `{ next: { revalidate: 600 } }`.
2. Fail fast if `LL2_API_KEY` is unset.
3. Export types listed in specified REQ-1.

## Acceptance criteria owned

- **AC-1** Given `LL2_API_KEY` is set, When a Server Component imports the client and requests upcoming launches, Then the request includes `Authorization: Token <LL2_API_KEY>` and returns typed results.
- **AC-2** Given `LL2_API_KEY` is unset, When the client is invoked, Then it throws a descriptive error and does not call LL2.
- **AC-5** Given two requests for the same upcoming query within 10 minutes, When both go through the client, Then LL2 is hit at most once.
- **AC-9** Given the client module, When REQ-2 starts, Then it can import the same module from a Server Component without rewriting auth or cache.

## Verify

- Unit or integration test: missing key does not call fetch
- Inspect request headers in a logged test double

## Send-back

**Blocker:** —
