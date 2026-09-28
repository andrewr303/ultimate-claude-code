---
description: Preserve and update authored session handoff notes
argument-hint: "[session notes or REQ-n/TASK-k]"
---

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-handoff/SKILL.md` and `<plugin>/references/recovery.md`.

Input: $ARGUMENTS

Read the entire existing `<root>/HANDOFF.md` before editing. From the target repository cwd, obtain a read-only draft:

```text
python "<plugin>/scripts/plan.py" handoff --root "<root>"
```

Preserve authored decisions, constraints, open questions, and next-session warnings. Append or make targeted edits only; create a concise handoff if absent. Do not regenerate authored notes with the base command's `--write` flag. Saved Next is historical; use live resume state. No lifecycle advancement, automatic tests, or git mutations.
