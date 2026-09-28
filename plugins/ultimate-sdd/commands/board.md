---
description: Show the Plan / Build / Published board and the single next action
argument-hint: "[SPEC-n or REQ-n]"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-board/SKILL.md` and the read-only Board/status boundary in `<plugin>/references/routing.md`.

Input: $ARGUMENTS

Derive the board from the target repository without writing, not from the plugin or remembered state:

```text
python "<plugin>/scripts/plan.py" board --root "<root>"
python "<plugin>/scripts/plan.py" next --root "<root>" --json
```

Display graph-derived Next only. No scaffolding, context generation, INDEX writes, lifecycle changes, repairs, specification, implementation, or executing Next. Do not pass the board command's `--write` flag, even if older skill guidance requests it; report that conflict instead.
