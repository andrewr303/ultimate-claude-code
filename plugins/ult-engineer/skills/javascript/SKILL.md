---
name: javascript
description: Modern JavaScript (ES6+) patterns — async/await, modules, immutability, iterators, and cleanup of legacy callbacks. Use when writing or modernizing JS, debugging promises/event-loop issues, or refactoring JS without a TypeScript migration.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: javascript
---

# JavaScript

Load this after the `ult-engineer` router names it.

## Depth

| Ask | Load |
|-----|------|
| Pattern catalog and when-to-use | [references/details.md](references/details.md) |
| Pitfalls (`this`, promise anti-patterns, leaks) | [references/advanced-patterns.md](references/advanced-patterns.md) |
| Original condensed skill | [references/skill-original.md](references/skill-original.md) |
| Behavior-preserving cleanup of JS | `../refactor/SKILL.md` |

## Defaults

- `const` by default; `let` only when reassignment is required. Never `var`.
- `async`/`await` over raw Promise chains; handle rejection at a real boundary.
- Optional chaining and nullish coalescing instead of long `&&` / `||` default chains.
- Do not mutate arguments. Prefer spread / `map` / `filter`.
- ESM when the package is `"type": "module"` or the bundler expects it; do not mix CJS `require` into an ESM graph without a plan.
- Keep functions small and named for their effect.

If the file is `.ts` / `.tsx`, prefer the `typescript` specialist and keep JS-level style consistent with neighbors.
