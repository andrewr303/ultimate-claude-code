---
description: Main orchestrator — route any planning request to the right skill and run it
argument-hint: "[idea, PRD path, REQ-n, or next action]"
---

# ultimate-sdd-go

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/orchestrator/SKILL.md` and `<plugin>/references/routing.md`.

Target: $ARGUMENTS

When deriving Next, use the live graph through `<plugin>/commands/next.md`, not a saved INDEX instruction. Route without a menu when unambiguous; preserve user authorization and all configured gates. Planning alone is not build permission.
