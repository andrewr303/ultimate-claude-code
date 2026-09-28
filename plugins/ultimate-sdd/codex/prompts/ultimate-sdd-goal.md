---
description: Goal loop — iterate until a measure, rubric, or research brief passes
argument-hint: "<metric, rubric, or question>"
---

# ultimate-sdd-goal

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-goal/SKILL.md`. Preserve vet gates, approved command scope, and the iteration cap; never approve your own measure or lower the threshold silently.

Input: $ARGUMENTS
