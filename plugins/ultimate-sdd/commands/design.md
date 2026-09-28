---
description: Design an existing REQ or CHANGE without implementing or expanding its contract
argument-hint: "<REQ-n or CHANGE-n or existing change slug>"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-design/SKILL.md`.

Target: $ARGUMENTS

Resolve an existing target before writing its design sidecar. Preserve upstream requirements, decisions, readiness blockers, and planning-artifact review. Do not add graph IDs, install dependencies, or implement.
