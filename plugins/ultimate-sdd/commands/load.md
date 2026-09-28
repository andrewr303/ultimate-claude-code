---
description: Load an eligible TASK through the runtime gate as a complete agent brief
argument-hint: "[REQ-n or REQ-n/TASK-k]"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/task-load/SKILL.md` and `<plugin>/references/execution.md`.

Target: $ARGUMENTS

Require the runtime load gate before handoff, status changes, or implementation. Load-only stops at the handoff; build only within user-authorized scope. Missing capability/evidence is a blocker, not permission to weaken eligibility or independent review.
