---
description: Review-cycle — independent spec review, quality review, and bounded repairs
argument-hint: "[CHANGE-n or REQ-n]"
---

# ultimate-sdd-review-cycle

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-review/SKILL.md` and `<plugin>/references/execution.md`.

Target: $ARGUMENTS

Preserve spec-before-quality ordering, genuine reviewer independence, complete file scope, snapshot freshness, and the existing per-TASK retry budget. Missing required evidence or Blocker/Major findings cannot be waived for completion or archive.
