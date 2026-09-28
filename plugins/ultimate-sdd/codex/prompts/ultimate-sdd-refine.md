---
description: Refine a specified REQ — patch readiness gaps, accept or reject suggestions
argument-hint: "<REQ-n>"
---

# ultimate-sdd-refine

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/req-specify/SKILL.md` in refinement mode. Preserve accepted intent, review changes, and re-score actual readiness; do not implement or weaken the build gate.

Target: $ARGUMENTS
