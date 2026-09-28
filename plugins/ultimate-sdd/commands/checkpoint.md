---
description: Append recovery state for an existing TASK with optional explicit commit association
argument-hint: "<REQ-n/TASK-k> [--commit <sha> --files <repo-relative-path> ...]"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-checkpoint/SKILL.md` and `<plugin>/references/recovery.md`.

Input: $ARGUMENTS

Checkpoint only an existing qualified TASK; use resume if none exists. Preserve append-only records and authored handoff. Never infer commit association from HEAD or equate a recorded association with proven ownership, completion, or rollback safety. No automatic commit or status transition.
