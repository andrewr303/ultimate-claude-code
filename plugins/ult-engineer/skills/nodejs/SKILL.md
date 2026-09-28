---
name: nodejs
description: Node.js backend architecture, APIs, auth, jobs, and production operations. Use when building or fixing Express/Fastify/Nest/Hono servers, REST/GraphQL, workers, websockets, or choosing a Node framework. Pair with typescript when types are the hard part.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: nodejs
---

# Node.js

Load this after the `ult-engineer` router names it.

## Depth

| Ask | Load |
|-----|------|
| Framework / runtime / security decisions (think, don't copy) | `../nodejs-best-practices/SKILL.md` and [references/best-practices.md](references/best-practices.md) |
| Backend pattern catalog (middleware, errors, DB, jobs) | [references/details.md](references/details.md), [references/advanced-patterns.md](references/advanced-patterns.md) |
| Implementation playbook | [references/implementation-playbook.md](references/implementation-playbook.md) |
| Condensed original | [references/skill-original.md](references/skill-original.md) |
| Bun / Vite / Vue / modern TS tooling | `../nodejs-development/SKILL.md` |

## Framework pick (only when the repo has no server yet)

| Building | Default |
|----------|---------|
| Edge / serverless (Cloudflare, Vercel) | Hono |
| High-performance API | Fastify |
| Enterprise / DI / structure | NestJS if the team already knows it |
| Legacy / maximum middleware | Express |
| Full-stack with this frontend | The meta-framework's server (Next route handlers, tRPC) |

Do not introduce a second HTTP framework into a repo that already has one.

## Defaults when writing Node

- TypeScript if the repo is TS. Validate input at the boundary (Zod/similar only if already used).
- Custom error classes + a single error-handling middleware. Never swallow `err`.
- Structured logs (pino/winston if present). No `console.log` in request paths on new code.
- Secrets from env, never committed. HTTPS and explicit CORS in production guidance.
- Graceful shutdown: stop accepting, drain, close pools.
- Health check that does not take the DB lock.
- Tests via the `test` specialist; hit the HTTP layer with the project's supertest/undici helper.

## Do not

- Add Redis / a queue / a second ORM "for scale" on a feature that does not need it.
- Use `*` CORS or disable auth in a "temporary" handler that can ship.
