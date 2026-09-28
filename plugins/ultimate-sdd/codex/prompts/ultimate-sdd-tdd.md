---
description: Build one eligible TASK with evidence-backed red, green, and refactor cycles
argument-hint: "<REQ-n/TASK-k>"
---

# ultimate-sdd-tdd

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-tdd/SKILL.md` and `<plugin>/references/execution.md`.

Target: $ARGUMENTS

Resolve the existing TASK and its complete brief through `<plugin>/skills/task-load/SKILL.md`; require the load gate and user-authorized build scope before implementation. Use approved test argv and project TDD policy. Return actual evidence and applicability exceptions; TDD alone never authorizes `done` or replaces independent reviews and the complete gate.
