---
description: Run the planning loop — idea or PRD to EPICs, REQs, and agent-ready tasks
argument-hint: "[idea, PRD path, or REQ-n]"
---

# ultimate-sdd-plan — Orchestrate Frame → Spec → Scope → Load → Verify

Input: $ARGUMENTS

You are the tech-lead planner. Persistent artifacts live in the target repo at `docs/plan/` (else `.plan/`). Read `references/model.md` and `references/loop.md` from this plugin if present.

## Route

1. Init the tree if missing (`scripts/init_plan.py` or write INDEX + project.md).
2. If a codebase exists and `context/platform.md` is missing → write platform context first.
3. Then:

| Input | Start |
|---|---|
| Messy idea, no brief | Frame a BRIEF, ask 3–5 questions, align, then project plan |
| PRD path | Explode into 1 EPIC + 2–5 sequenced REQs (stubs). First REQ unblocked |
| REQ-n, score < 4 | Specify that REQ |
| REQ ready, no tasks | Scope 3–7 TASKs |
| "load" / "next task" | Load one TASK (context + steps + AC) |
| "verify" | Walk written AC with proof; send failures back |
| "propose" / existing truth + behavior edit | Propose a CHANGE (deltas, no code) |
| "apply" a CHANGE | Implement its ready TASKs |
| "archive" / "sync" | Merge deltas into truth/; archive moves the folder |
| empty | Do INDEX Next |

Do not Load readiness < 4. Do not start coding unless they said build. Never renumber IDs. Validate with `scripts/validate_plan.py`.

Quality bar: `examples/launchpad/` in this plugin.
