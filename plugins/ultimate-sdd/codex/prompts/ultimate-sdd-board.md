---
description: Show the Plan / Build / Published board and the single next action
argument-hint: "[SPEC-n or REQ-n]"
---

# ultimate-sdd-board

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-board/SKILL.md`.

Input: $ARGUMENTS

Derive the board from the target repository, not the plugin or remembered state:

```text
python "<plugin>/scripts/plan.py" board --root "<root>" --write
python "<plugin>/scripts/plan.py" next --root "<root>" --json
```

Display graph-derived Next. Rebuilding INDEX is not permission to change lifecycle status, specify, implement, or execute Next.
