---
name: test
description: JavaScript/TypeScript testing with Vitest, Jest, and Testing Library — unit, integration, E2E, mocks, and TDD. Use when writing tests, setting up a runner, fixing flakes, or implementing TDD. Pair with code-test-quality to audit existing tests.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: testing
---

# Test

Load this after the `ult-engineer` router names it.

## Depth

| Ask | Load |
|-----|------|
| Jest / Vitest / Testing Library patterns | [references/patterns.md](references/patterns.md) |
| Advanced mocking, fake timers, MSW | [references/advanced-testing-patterns.md](references/advanced-testing-patterns.md) |
| Audit existing tests for smells / empty asserts / flakes | `../code-test-quality/SKILL.md` |

## Defaults

1. Use the runner already in `package.json` (`vitest`, `jest`, `node:test`, `bun test`). Do not add a second one.
2. Test behavior through the public API, not private internals.
3. One behavior per test. Name tests as "it does X when Y".
4. Deterministic: no real network, no wall-clock sleeps. Fake timers / MSW / local fixtures.
5. Assertions must observe something. `expect(true).toBe(true)` is a finding, not a test.
6. Colocate unit tests next to the module if that is the repo convention; otherwise follow `__tests__` / `*.test.ts` already in use.
7. For UI: Testing Library (`getByRole`, user-event) over implementation details.
8. After a bug fix, add a regression test that failed before the fix.

Run the project's test script on the affected files before claiming coverage.
