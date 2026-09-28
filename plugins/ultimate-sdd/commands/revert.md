---
description: Preview a conservative rollback plan without executing git mutations
argument-hint: "<REQ-n/TASK-k or REQ-n or CHANGE-n>"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-revert/SKILL.md` and `<plugin>/references/recovery.md`.

Target: $ARGUMENTS

This is a read-only `revert-plan` preview, never rollback execution. Require explicit proven task-to-commit associations; on refusal show reasons and no rollback commands. Do not mutate git, application files, status, truth, context, or HANDOFF to simulate a rollback.
