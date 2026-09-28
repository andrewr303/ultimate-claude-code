---
description: Implement an active CHANGE through gated TASK execution and independent review
argument-hint: "[CHANGE-n or slug]"
---

# ultimate-sdd-apply

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-apply/SKILL.md` and `<plugin>/references/execution.md`.

Target: $ARGUMENTS

Preserve the load gate, authorized TASK scope, TDD policy, independent spec-before-quality reviews, bounded repairs, complete gates, and cumulative verification. Missing capability or evidence blocks completion; an implementer report is not a done transition. Do not automatically archive.
