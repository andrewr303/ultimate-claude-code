# REQ specify question bank

Ask 3–6 per Specify session. Skip anything `platform.md` or the brief already answered.
Shape: multiple choice + Recommended + "Not sure, use best practice".

## Integration & quotas

1. Shared third-party quota: server-side cache for all users, client-direct, or not sure?
2. On limit hit mid-request: hard block, degrade, or queue?
3. Cache TTL: 5 min, 10 min, request-time only?
4. Missing API key at boot: fail startup, or serve a static error page?

## Persistence

5. New state: none, existing table, or new table + migration?
6. Idempotency: natural key, client token, or none?

## Auth & tenancy

7. Auth scheme: reuse platform default, new scheme (justify), or public?
8. Tenant isolation: none, row-level, or separate resources?

## Product behavior

9. Empty state: exact string A, exact string B, or hide the section?
10. Filters: API query params, client-only, or both (who wins)?
11. Reset windows (quotas, alerts): calendar month, billing date, never?

## Failure

12. Upstream 429/5xx: show cached last-good, typed error string, or retry-once then error?
13. Partial failure (one of N calls): fail the page, or render what succeeded plus an error line?

## UI (skip if infrastructure-only)

14. Surfaces this REQ owns: one route, multiple routes, or no UI?
15. Navigation chrome: none at this stage, reuse existing shell, or new nav?

Pair with `references/questions.md` for the interaction rules and defaults.
