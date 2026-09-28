---
description: Design an existing REQ or CHANGE without implementing or expanding its contract
argument-hint: "<REQ-n or CHANGE-n or existing change slug>"
---

# ultimate-sdd-design

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-design/SKILL.md`.

Target: $ARGUMENTS

Resolve an existing target before writing its design sidecar. Preserve upstream requirements, decisions, readiness blockers, and planning-artifact review. Do not add graph IDs, install dependencies, or implement.
