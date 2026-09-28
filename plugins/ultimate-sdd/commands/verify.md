---
description: Verify written AC, ordered independent reviews, and current completion gates
argument-hint: "[REQ-n or REQ-n/TASK-k]"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/task-verify/SKILL.md` and `<plugin>/references/execution.md`.

Target: $ARGUMENTS

Require actual AC evidence, independent spec-before-quality review, and a fresh complete gate before `done`; verify cumulative REQ/CHANGE behavior as required. Missing capability/evidence stays pending, observed failures go back with context, and contract edits require fresh review. Never rewrite AC to make a deficient implementation pass.
