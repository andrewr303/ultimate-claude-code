---
description: Load an eligible TASK through the runtime gate as a complete agent brief
argument-hint: "[REQ-n or REQ-n/TASK-k]"
---

# ultimate-sdd-load — Hand the next TASK to the coding agent

Target: $ARGUMENTS

Load the named TASK, else the first unblocked ready TASK. Refuse if parent REQ readiness < 4.

Emit exactly:

```
Loaded REQ-m/TASK-n: <title>
context ✓   implementation steps ✓   acceptance criteria ✓
```

then Goal, Context (REQ excerpt + platform excerpt + files), Steps, owned AC verbatim, Out of scope, Verify, Send-back protocol.

Write `TASK-n.handoff.md`. Mark TASK (and REQ if needed) `in-progress`. Implement only this TASK if they also said build.
