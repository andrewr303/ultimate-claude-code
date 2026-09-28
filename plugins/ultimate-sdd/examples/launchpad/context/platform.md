---
id: PLATFORM
title: Platform context
updated: 2026-08-16
commit: greenfield
---

# Platform context

Greenfield. No application repo yet. Constraints below are from the brief and the public Launch Library 2 API, labeled `[assumed]` where not fetched this session.

## Product

- Name: Launchpad
- What it does: list and filter upcoming rocket launches
- Who uses it: anonymous web visitors
- Surfaces: web

## Stack

- Language / runtime: TypeScript / Node [assumed — brief]
- Framework: Next.js App Router [assumed — brief]
- Data store: none
- Auth: none (server uses `LL2_API_KEY` toward LL2 only)
- Deploy: Vercel [assumed — brief]
- Test runner: unspecified

## Architecture

- Entry points: `app/page.tsx` (landing/list later), `app/launch/[id]/page.tsx` (detail)
- Layers: Server Components call `lib/ll2.ts`; no client fetch to LL2
- Request path: browser → Next.js server → cached fetch → `https://ll.thespacedevs.com/2.2.0/launch/upcoming/`

## Data model

No local tables. LL2 launch object fields used in v1: `id`, `name`, `net`, `status`, `rocket`, `launch_service_provider`, `pad`/`location`, `mission`, `vidURLs`.

## APIs & integrations

| Surface | Path / client | Auth | Limits | Notes |
|---|---|---|---|---|
| LL2 upcoming | `GET /2.2.0/launch/upcoming/` | `Authorization: Token <LL2_API_KEY>` | free tier 15 req/h `[assumed]` | filters: `location__ids`, `lsp__ids` |

## Conventions

- File layout: `lib/` for server clients, `app/` for routes, `app/globals.css` for tokens
- Errors: typed error string on the page; no unauthenticated retry if key missing
- Feature flags: none

## Env keys (names only)

| Key | Purpose |
|---|---|
| `LL2_API_KEY` | LL2 token auth |
| `LL2_API_BASE_URL` | override base; default official 2.2.0 host |

## Do not reinvent

- Do not add a database for v1
- Do not call LL2 from the browser (burns the shared quota)

## Constraints

- Shared free-tier quota → server cache, `revalidate` ~600s
- Fail at startup / first request with a descriptive error if `LL2_API_KEY` is unset

## Coverage

- Examined: brief + public LL2 param names
- Skipped: live LL2 schema fetch this session — confirm field names when specifying REQ-1
