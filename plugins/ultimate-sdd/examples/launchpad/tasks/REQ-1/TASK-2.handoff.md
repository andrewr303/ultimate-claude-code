# Loaded REQ-1/TASK-2: Server-side LL2 client with token auth and 10-minute cache

context ✓   implementation steps ✓   acceptance criteria ✓

## Goal

Implement the server-side Launch Library 2 client only. Auth header, fail-fast without a key, 10-minute Next.js fetch cache, exported types. No list UI.

## Context

### From REQ-1

Foundation REQ. Shared quota. Browser must not call LL2. Filters (`location__ids`, `lsp__ids`) are REQ-2.

### From platform

- Greenfield Next.js App Router
- Endpoint: `GET {LL2_API_BASE_URL}/launch/upcoming/`
- Header: `Authorization: Token <LL2_API_KEY>`
- Cache: `{ next: { revalidate: 600 } }`

### Files

- Touch: `lib/ll2.ts` (create), tests beside it
- Reuse: TASK-1 env wiring
- Do not touch: list UI, detail route, `app/globals.css` tokens (TASK-3)

## Steps

1. Add typed client using Next.js `fetch` + `revalidate: 600`.
2. Throw a descriptive error before fetch if `LL2_API_KEY` is unset.
3. Export the v1 fields: `id`, `name`, `net`, `status`, `rocket`, `launch_service_provider`, `pad`/`location`, `mission`, `vidURLs`.

## Acceptance criteria owned

- **AC-1** Given `LL2_API_KEY` is set, When a Server Component imports the client and requests upcoming launches, Then the request includes `Authorization: Token <LL2_API_KEY>` and returns typed results.
- **AC-2** Given `LL2_API_KEY` is unset, When the client is invoked, Then it throws a descriptive error and does not call LL2.
- **AC-5** Given two requests for the same upcoming query within 10 minutes, When both go through the client, Then LL2 is hit at most once.
- **AC-9** Given the client module, When REQ-2 starts, Then it can import the same module from a Server Component without rewriting auth or cache.

## Out of scope

- Landing copy and CSS tokens
- Filters and detail page

## Verify

- Missing-key test does not call fetch
- Header assertion on the mocked request

## Send-back

If you cannot satisfy an AC without expanding scope, stop and write the blocker on the TASK. Do not invent a new requirement.
