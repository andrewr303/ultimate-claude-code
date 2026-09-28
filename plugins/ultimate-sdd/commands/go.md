---
description: Main orchestrator — route any planning request to the right skill and run it
argument-hint: "[idea, PRD path, REQ-n, or next action]"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/orchestrator/SKILL.md` and `<plugin>/references/routing.md`.

Input: $ARGUMENTS

When deriving Next, use the live graph through `<plugin>/commands/next.md`, not a saved INDEX instruction. Route without a menu when unambiguous; preserve user authorization and all configured gates. Planning alone is not build permission.
