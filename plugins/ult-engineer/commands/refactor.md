---
description: Behavior-preserving refactor — characterize, slice one smell at a time, keep the external contract.
argument-hint: <file, directory, or describe the smell>
---

Refactor without changing behavior: $ARGUMENTS

Load `skills/refactor/SKILL.md`. Choose a lane (`code-refactor`, `dry-consolidation`, `code-complexity`, `code-polish`). Add characterization tests if the hotspot has none. One smell per slice; run the project's tests and typecheck after each slice. Do not mix in features.
