---
description: Merge CHANGE deltas through configured evidence gates without moving the folder
argument-hint: "[CHANGE-n or slug]"
---

# ultimate-sdd-sync

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read `<plugin>/skills/plan-archive/SKILL.md` in sync-only mode and `<plugin>/references/execution.md`, subject to the evidence-safe command boundary below.

Target: $ARGUMENTS

Resolve one active CHANGE selector from disk. From the target repository cwd, preview:

```text
python "<plugin>/scripts/plan.py" archive --root "<root>" --change "<selector>" --dry-run
```

Only after a successful preview, current configured evidence gates, and user/host authorization, run the same command without `--dry-run`:

```text
python "<plugin>/scripts/plan.py" archive --root "<root>" --change "<selector>"
```

Sync never passes `--move` and never moves the folder or manually marks it archived. Never bypass the base archive entry point with direct `merge_deltas.py`. Missing or failing required evidence is a blocker, not a warn-and-confirm waiver, including for `skip_specs`. If older skill guidance conflicts, retain these gates and report the conflict.
