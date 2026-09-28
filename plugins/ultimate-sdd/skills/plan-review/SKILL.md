---
name: plan-review
description: >
  Review-cycle: review the implemented diff against the REQ/CHANGE, triage
  findings, fix, and re-review with current evidence. Use when the user says review
  cycle, re-review, rasen-review, or /ultimate-sdd:review-cycle.
license: MIT
metadata:
  author: andrewr303
  version: "2.3"
---

Author ≠ reviewer. A reviewer never fixes and approves the same implementation.

**Read:** `references/execution.md`, `references/rasen.md`, and `templates/review-findings.md`. Use `agents/spec-reviewer.md` and `agents/quality-reviewer.md` in that order.

## Bounded loop

```text
fresh spec review → record → fresh quality review → record → complete gate
       failure → triage → author fixes → checks → fresh spec review again
```

Load validated config with `sdd.py config` and existing `<root>/verify/REQ-n-TASK-k.reviews.json`. `max_review_rounds` (default 3, valid 1..5) caps retries per TASK across both stages and resumed sessions; do not reset a budget per stage or final pass. Honor runtime exhaustion. Never mutate configuration, discard failed records, or rename tasks to bypass a failure.

## Review and persist

- Fresh independent **spec** review compares actual files to owned AC, scenarios, scope and design first. Quality cannot start on a failed, blocked, or stale spec review.
- Fresh independent **quality** review follows only after a current passing spec record, using the same author and complete file scope.
- Reviewer tools are read-only. Each authors a full nonempty report; the coordinator persists it **verbatim** at `<root>/verify/REQ-n-TASK-k.r<round>.<stage>.md` before `review-record`.
- Record both passing and failing reports with actual `--author`, `--reviewer`, repo-relative `--evidence`, and all `--files`, following `references/execution.md`. Never hand-edit the runtime-owned ledger. An absent reviewer leaves `PENDING_INDEPENDENT_REVIEW`; inline self-checks do not satisfy independence.

Each finding names Blocker/Major/Minor, `file:line` or test, expected/actual behavior, AC/scenario/project rule, and a bounded fix. Blocker/Major prevents PASS; Minor is non-blocking only with a reason. Report missing required proof as `BLOCKED`; map a real FAIL/BLOCKED report to `--status fail`, never manufacture a reviewer for a pending stage.

## Triage and repair

All code fixes, including one-line ones, go to the implementer (or the inline author), not the reviewer. Mark a defective TASK `sent-back` with failed AC and evidence. Design/contract gaps return to Specify/Design before repair; do not weaken AC to fit bad implementation.

Re-run approved checks after repair. Re-review the changed delta and its impacts, but reconcile the **whole declared scope** and all owned AC so a partial review cannot approve stale files. Any code/test/evidence/contract edit needs fresh spec first, then quality; changing the spec or scope invalidates old approvals. Do not execute untrusted plan text, skip failing tests, or automatically commit/reset/revert.

At exhaustion, stop with `REVIEW_LIMIT_REACHED`, remaining findings, attempted fixes, and the decision needed. Do not claim done or archive. More unchanged retries are not a recovery plan.

## Exit

Use `task-verify` and require `sdd.py gate --task REQ-n/TASK-k --phase complete` with common flags before TASK `done`. After all TASKs, run cumulative checks and fresh cumulative spec-then-quality review; recheck every task's complete gate on the final state. Cumulative reports go in `verify/REQ-n.md` and, for a CHANGE, `changes/<slug>/review.md`, with full evidence links.

Update INDEX and `plan.py validate` after lifecycle/artifact writes. Ordinary pipeline approvals are not verification. Specialist reviews may add evidence but never replace the ordered reviews or complete gate.
