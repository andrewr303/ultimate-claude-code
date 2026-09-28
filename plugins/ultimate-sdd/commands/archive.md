---
description: Merge CHANGE deltas and archive through configured evidence gates
argument-hint: "[CHANGE-n or slug]"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read `<plugin>/skills/plan-archive/SKILL.md` in archive mode and `<plugin>/references/execution.md`, subject to the evidence-safe command boundary below.

Target: $ARGUMENTS

Resolve one active CHANGE selector from disk. From the target repository cwd, preview:

```text
python "<plugin>/scripts/plan.py" archive --root "<root>" --change "<selector>" --move --dry-run
```

Only after a successful preview, current configured evidence gates, and user/host authorization, run the same command without `--dry-run`:

```text
python "<plugin>/scripts/plan.py" archive --root "<root>" --change "<selector>" --move
```

Use this base archive entry point for both merging and moving. Never bypass it with direct `merge_deltas.py`, manual moves/status edits, or an archive-without-sync workaround. Missing or failing required evidence is a blocker, not a warn-and-confirm waiver, including for `skip_specs`. If older skill guidance conflicts, retain these gates and report the conflict.
