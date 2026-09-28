---
name: typescript
description: TypeScript types, tsconfig, generics, inference, Effective TypeScript review, and JS→TS migration. Use when writing or reviewing TypeScript, fighting the compiler, designing types, enabling strict mode, or migrating JavaScript.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: typescript
---

# TypeScript

Load this after the `ult-engineer` router names it. Then open only the reference the task needs.

## Depth

| Ask | Load |
|-----|------|
| Write/review against Effective TypeScript (62 items) | `../effective-typescript/SKILL.md` and [references/effective/practices-catalog.md](references/effective/practices-catalog.md) |
| Compiler errors, inference, monorepo, migration, tooling | `../typescript-expert/SKILL.md` |
| tsconfig strict flags, Bundler/NodeNext, verbatimModuleSyntax | `../typescript-strict/SKILL.md` |
| Generics, conditional/mapped/template types, utilities | [references/advanced-types.md](references/advanced-types.md) and [references/details.md](references/details.md) |
| Playbook with extra examples | [references/implementation-playbook.md](references/implementation-playbook.md) |
| Strict tsconfig snippet / cheatsheet | [references/expert/tsconfig-strict.json](references/expert/tsconfig-strict.json), [references/expert/typescript-cheatsheet.md](references/expert/typescript-cheatsheet.md) |

## Defaults when writing TypeScript

1. `"strict": true`. Prefer `noUncheckedIndexedAccess` and `noImplicitOverride` when adding a tsconfig.
2. Prefer declarations to assertions. Hide unavoidable `as` inside a well-typed wrapper.
3. `unknown` at external boundaries; narrow before use. Never `any` on a public surface.
4. Types represent only valid states — tagged unions, not optional flags that imply each other.
5. Push null to the perimeter.
6. Prefer inference inside functions; explicit types on public APIs.
7. `interface` for object shapes; `type` for unions, mapped types, and aliases.
8. Type-only imports (`import type`) and `verbatimModuleSyntax` when the project is on TS 5+.
9. Do not enable flags that the current `tsc` cannot satisfy without a migration plan.

Run `npx tsc --noEmit` or the project's `typecheck` script before claiming types are correct. For slow `tsc`, see `typescript-expert` diagnostics — do not guess at compiler performance.

## Do not

- Add a new utility-type zoo when `Pick` / `Omit` / a tagged union will do.
- Use object wrapper types (`String`, `Number`, `Boolean`).
- Leave `skipLibCheck` as a substitute for fixing app types.
