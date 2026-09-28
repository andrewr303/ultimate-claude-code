---
description: Recover live graph, review, checkpoint, and handoff state read-only
argument-hint: "[target repository or plan root]"
---

# ultimate-sdd-resume

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-resume/SKILL.md` and `<plugin>/references/recovery.md`.

Target: $ARGUMENTS

Read existing authored HANDOFF notes; report live state and conflicts without editing them. Resume does not repair setup, execute Next/tests, advance status, or mutate git. Saved Next and observed HEAD are historical, not completion or ownership proof.
