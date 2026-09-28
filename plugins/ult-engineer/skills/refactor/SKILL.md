---
name: refactor
description: Behavior-preserving refactoring for TypeScript, React, and Node.js. Use when asked to clean up, extract, DRY, simplify, reduce complexity, apply SOLID, or restructure without changing what the code does.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: refactoring
---

# Refactor

Improve structure without changing behavior. Load this after the `ult-engineer` router names it.

## Choose a lane

| Ask | Load | Notes |
|-----|------|-------|
| Pure functions, immutability, push I/O to the edge | `../code-refactor/SKILL.md` | Functional refactor in place |
| Duplicated logic across files | `../dry-consolidation/SKILL.md` | Extract a shared, tested abstraction |
| Hotspot methods, deep nesting, god files | `../code-complexity/SKILL.md` | Measure first, then slice |
| Comments / whitespace only, no logic | `../code-polish/SKILL.md` | Non-semantic by contract |
| Legacy JS → modern syntax, same behavior | `../javascript/SKILL.md` | Pair with this file's safety rules |
| React component split / hooks extraction | `../react/SKILL.md` | Keep render behavior identical |
| Large cleanup / SOLID pass | [references/clean-playbook.md](references/clean-playbook.md) | Incremental slices |
| Repo-wide cleanup plan | [references/cleanup-playbook.md](references/cleanup-playbook.md) | Plan, then small PRs |

Do not mix a refactor with a feature or a speculative rewrite.

## Safety loop

1. **Characterize.** Identify the current behavior (tests, a repro script, or a written characterization of inputs → outputs). If there are no tests around the hotspot, add characterization tests before moving code.
2. **Plan slices.** One smell per slice: extract function, invert conditional, replace loop, remove duplication. Keep each diff reviewable.
3. **Move code, then run tests.** After every slice: project test script + typecheck. If red, revert the slice, do not pile on.
4. **Preserve the external contract.** Exported names, types, and HTTP/CLI shapes stay unless the user asked to change them.
5. **Stop at the ask.** Do not "while I'm here" rename public APIs or restyle the file.

## Smell → move

| Smell | Move |
|-------|------|
| Side effects mixed into computation | Extract a pure function; leave I/O at the caller |
| Mutation of params / shared state | Return new data (`map`, spread); keep mutation at the boundary |
| Copy-paste blocks | `dry-consolidation` — one abstraction with tests |
| Deep nesting | Guard clauses / early return |
| Long method | Extract until each function has one reason to change |
| Feature envy | Move the function next to the data it uses |
| God module | Split by responsibility, update imports, keep a thin façade if needed |

Full pattern catalog: [references/clean-playbook.md](references/clean-playbook.md).

## Output

- Target and invariant (what must not change)
- Slice list
- Diff summary per slice
- Tests / typecheck run
