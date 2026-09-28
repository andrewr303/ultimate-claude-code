# Review — <REQ-n/TASK-k or cumulative REQ/CHANGE>

- Stage: spec / quality
- Scope: task / cumulative
- Task(s): <exact selectors>
- Author(s): <TASK → actual implementer identity>
- Reviewer: <actual fresh independent session identity; not any in-scope author>
- Round / max_review_rounds: <current recorded attempt / validated per-TASK cap>
- Reviewed files: <complete repo-relative code/test/config/doc inventory>
- Evidence destination: <repo-relative path in target repo; nonempty report>
- Spec prerequisite (quality only): <task: current passing spec report + recording result; cumulative: passing cumulative spec report + current per-TASK gates; otherwise BLOCKED>

Reviewers use read-only tools and return this completed report. For task scope, the coordinator writes it verbatim before calling `review-record`, using actual `--author`/`--reviewer`, `--evidence`, and the same `--files` scope for spec then quality. Keep previous round evidence; never hand-edit `verify/REQ-n-TASK-k.reviews.json`. For cumulative scope, the coordinator persists the report verbatim alongside the per-TASK author map and current gate results, without an aggregate `review-record` call.

## Contract and evidence

| AC / scenario / project rule | Expected | Actual code / test / observation | Verdict | Evidence |
|---|---|---|---|---|
| <verbatim AC and scenario, or cited project rule> | <required behavior> | <file:line / test name> | pass / fail / blocked | <actual report/log path and result> |

List every owned AC for spec review; quality review lists applicable quality/project checks and any AC it affects. Cumulative scope includes cross-TASK interactions and every relevant REQ/CHANGE criterion.

## Checks and applicability

- Checks run by coordinator/author: <exact argv, cwd, exit, relevant output, log paths>
- Evidence independently inspected: <files/tests/logs actually read by this reviewer>
- Checks not run / required missing evidence: <none, or named blockers>
- TDD cycles / refactor assessments / explicit exceptions: <evidence, applicability, authority and limitations>
- Independence and freshness limits: <actual known boundaries; do not claim a log proves who ran it>

## Findings

| ID | Severity | Where | Expected / actual and impact | Violates | Bounded fix / owner |
|---|---|---|---|---|---|
| F-1 | Blocker / Major / Minor | <file:line or test> | <observed mismatch> | <AC/scenario/project rule> | <fix by author, not reviewer> |

Write `none` when there are no findings. Blocker/Major prevents PASS. Minor may remain only with a reason it does not mask required behavior and a follow-up disposition. Do not invent findings to fill the table.

## Verdict

PASS / FAIL / BLOCKED — <evidence-backed reason and next action>

PASS requires current sufficient proof and no unresolved Blocker/Major. Missing inputs, unrun required checks, unavailable independent review, or a missing/stale spec prerequisite is BLOCKED, never PASS. A real task report maps PASS → `--status pass`; FAIL/BLOCKED → `--status fail`. No reviewer response means pending, not a fabricated record.

If the runtime reports `max_review_rounds` exhausted with required fixes unresolved, report `REVIEW_LIMIT_REACHED` and the decision needed. A passing final permitted round is not exhaustion. Do not change configuration, claim TASK done without its complete gate, or approve ordinary pipeline gates as a substitute for technical verification.
