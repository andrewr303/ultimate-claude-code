---
description: Autopilot — classify a task and walk a delivery pipeline, pausing at gates
argument-hint: "[pipeline] <intent>"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-auto/SKILL.md` and `<plugin>/references/execution.md`.

Input: $ARGUMENTS

Ordinary pipeline approval never replaces user authorization, vet gates, independent review, or configured evidence gates. Do not advance failed or blocked stages.
