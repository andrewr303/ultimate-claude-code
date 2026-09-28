---
id: PLATFORM
title: Platform context
updated: YYYY-MM-DD
commit: <short sha or unknown>
---

# Platform context

Persistent map of the codebase. Skills read this before specifying or loading.
Code is truth. Label `[inferred]` when guessing. Never put secrets here — keys only.

## Product

- Name:
- What it does:
- Who uses it:
- Surfaces: <web / api / cli / jobs>

## Stack

- Language / runtime:
- Framework:
- Data store:
- Auth:
- Deploy:
- Test runner:

## Architecture

- Entry points: <routes, handlers, CLIs>
- Layers: <where UI, domain, data live>
- Request path (one paragraph):
- Jobs / queues:

```
<ascii or mermaid of the main runtime path>
```

## Data model

| Entity | Where defined | Owns | Notes |
|---|---|---|---|
| | | | |

## APIs & integrations

| Surface | Path / client | Auth | Limits | Notes |
|---|---|---|---|---|
| | | | | |

## Conventions

- File layout:
- Naming:
- Errors / HTTP mapping:
- Logging:
- Feature flags:

## Env keys (names only)

| Key | Purpose |
|---|---|
| | |

## Do not reinvent

Existing modules an agent must extend instead of rewriting:

- `<path>` — <why>

## Constraints

- Rate limits, tenancy, offline, i18n, a11y, browser targets:

## Coverage

- Examined:
- Skipped (and why):
