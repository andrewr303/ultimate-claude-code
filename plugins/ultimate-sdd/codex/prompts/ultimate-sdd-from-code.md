---
description: Reverse-engineer a PRD from existing code
argument-hint: "<feature, module path, or scope>"
---

# ultimate-sdd-from-code

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/prd-from-code/SKILL.md`. Preserve the bounded scope and verified/inferred/assumed evidence distinctions.

Scope: $ARGUMENTS
