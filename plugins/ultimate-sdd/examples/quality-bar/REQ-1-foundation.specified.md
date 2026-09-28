---
id: REQ-1
title: Project foundation & Launch Library 2 API integration
epic: EPIC-1
status: ready
readiness: 5
readiness_gaps: []
blocked_by: []
blocks: [REQ-2]
priority: P0
source: BRIEF-1
stack: Next.js, TypeScript, Vercel
created: 2026-08-16
updated: 2026-08-16
---

# REQ-1 — Project foundation & Launch Library 2 API integration

This is the **specified** form of REQ-1 (the quality bar). The live stub is `REQ-1-foundation.md`.

## Overview

Bootstrap the Launchpad web app: a Next.js + TypeScript project deployed on Vercel with a working Launch Library 2 API client, dark space-themed global styles, and a hello-world landing page confirming the full stack is operational. No database.

## Problem Statement

No project exists. Downstream requirements (upcoming launches list, launch detail page) cannot be built until the foundation — framework, API client, styles, and deployment — is in place.

## Solution

Scaffold a Next.js app with TypeScript, wire a server-side LL2 API client with 10-minute cache revalidation via Next.js `fetch`, apply dark space-themed global styles, and deploy to Vercel with all environment variables documented.

## UI Layout

Infrastructure-first landing. Single centered region. Headline is the app name ("Launchpad") and stack status. Below it, one secondary line: `Upcoming launches loaded: N` where N is the count returned by LL2. No navigation, no sidebar, no footer at this stage.

Infrastructure-only beyond that line — no list UI.

## Functional Requirements

### FR-1: LL2 API Client

The system SHALL expose a server-side module that wraps `GET {LL2_API_BASE_URL}/launch/upcoming/`.

- All requests MUST include `Authorization: Token <LL2_API_KEY>` (LL2 token auth).
- If `LL2_API_KEY` is unset, the client MUST throw a descriptive error at first call rather than making unauthenticated requests.
- Cache responses for 10 minutes using Next.js `fetch` `{ next: { revalidate: 600 } }`. No extra cache layer.
- Export typed interfaces matching the LL2 shape used in v1: launch `id`, `name`, `net`, `status`, `rocket`, `launch_service_provider`, `pad`/`location`, `mission`, `vidURLs`.
- The module MUST be importable from any Server Component or Route Handler.

- **Scenario: happy**
  - WHEN a Server Component calls the client with a valid key
  - THEN it receives a typed list and does not call LL2 again within 600s for the same query
- **Scenario: missing key**
  - WHEN `LL2_API_KEY` is unset
  - THEN no network request is made and the caller can render the exact error string in FR-2

### FR-2: Hello World Landing Page

The system SHALL render `/` as a Server Component that calls the LL2 client and displays:

- App name: `Launchpad`
- Confirmation string: `Upcoming launches loaded: N` where N is the count returned
- If the API call fails: `Unable to load launches – check API key and connectivity`

No client-side JavaScript is required for this page.

- **Scenario: success**
  - WHEN `/` loads and the client returns 12 launches
  - THEN the page contains the exact text `Upcoming launches loaded: 12`
- **Scenario: failure**
  - WHEN the client throws
  - THEN the page contains `Unable to load launches – check API key and connectivity` and does not crash the request

### FR-3: Global Styles

The system SHALL apply a dark space theme via CSS custom properties on `:root` in the global stylesheet:

- `--color-bg: #12141a`
- `--color-surface: #1c1f27`
- `--color-text-primary: #f4f6f8`
- `--color-text-secondary: #9aa3b2`
- `--color-accent: #3dd68c`

Headings use a loaded geometric sans via `next/font/google` (Inter). Body uses the same family at 16px / 1.5.

## Constraints from platform

- Auth: `Authorization: Token <LL2_API_KEY>`; fail before fetch if missing
- API: `/launch/upcoming/`; product site/provider filters map later to `location__ids` and `lsp__ids` (REQ-2)
- Cache: `revalidate: 600`
- Do not call LL2 from the browser

## Env & config

| Key | Required | Where documented | Notes |
|---|---|---|---|
| `LL2_API_KEY` | yes | `.env.example` | never commit the value |
| `LL2_API_BASE_URL` | no | `.env.example` | default official 2.2.0 host |

`.env.example` is committed; `.env.local` is gitignored.

## Out of scope

- List UI, filters (REQ-2)
- Detail route (REQ-3)
- Database, user accounts

## Acceptance Criteria

- **AC-1** Given `LL2_API_KEY` is set, When a Server Component imports the client and requests upcoming launches, Then the request includes `Authorization: Token <LL2_API_KEY>` and returns typed results.
- **AC-2** Given `LL2_API_KEY` is unset, When the client is invoked, Then it throws a descriptive error and does not call LL2.
- **AC-3** Given a successful fetch, When `/` renders, Then the document contains `Upcoming launches loaded: N` with N equal to the result count.
- **AC-4** Given a failed fetch, When `/` renders, Then the document contains `Unable to load launches – check API key and connectivity`.
- **AC-5** Given two requests for the same upcoming query within 10 minutes, When both go through the client, Then LL2 is hit at most once (Next.js fetch cache / `revalidate: 600`).
- **AC-6** Given the global stylesheet, When any page renders, Then `--color-bg`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`, and `--color-accent` are defined with the values above.
- **AC-7** Given a fresh clone, When a developer opens `.env.example`, Then `LL2_API_KEY` and `LL2_API_BASE_URL` are documented and no secret values are present.
- **AC-8** Given the landing page, When it loads, Then it is a Server Component (no client JS required) and shows no nav, sidebar, or footer.
- **AC-9** Given the client module, When REQ-2 starts, Then it can import the same module from a Server Component without rewriting auth or cache.

## Readiness

| Dimension | Pass? | Gap |
|---|---|---|
| Problem & goal | yes | |
| Behavior contract | yes | |
| Acceptance criteria | yes | |
| Context & constraints | yes | |
| Buildability | yes | |

**Score: 5/5**

## Changelog

| Date | Change |
|---|---|
| 2026-08-16 | Specified; patched tokens, auth header, exact copy |
