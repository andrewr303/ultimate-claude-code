# CLAUDE.md

Plugin: **ult-engineer**. Default skill and slash command: `ult-engineer`.

## Skills

| Skill | Path | Triggers |
|-------|------|----------|
| ult-engineer | `skills/ult-engineer/` | mixed engineering request, write/fix/improve |
| write | `skills/write/` | new feature, implement, scaffold |
| debug | `skills/debug/` | bug, crash, why is this broken |
| refactor | `skills/refactor/` | cleanup, DRY, extract, SOLID |
| review | `skills/review/` | PR review, is this safe |
| health | `skills/health/` | repo audit, scorecard |
| typescript | `skills/typescript/` | types, tsconfig, any, migrate |
| react | `skills/react/` | components, hooks, react-doctor |
| nodejs | `skills/nodejs/` | APIs, workers, Express/Fastify |
| javascript | `skills/javascript/` | ES6+, promises, modernize JS |
| test | `skills/test/` | Vitest, Jest, Testing Library |
| debt | `skills/debt/` | tech debt, CVEs, upgrades |
| code-polish | `skills/code-polish/` | comments only, no logic |

Debugging engine (AVR Debug): `debug-agent`, `debugging-code`, `debugging-methodology`, `typescript-debugging`, `web-performance`.

## Hard rules

- Hypotheses + runtime evidence before a bug fix
- Preserve behavior on refactors
- Match the repo's stack; do not invent numbers
