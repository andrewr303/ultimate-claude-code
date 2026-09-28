---
id: VERIFY-REQ-1
req: REQ-1
iteration: 1
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# Verification — REQ-1

Against written AC and the current combined state. Fill every applicable field; use `none` or `not run — reason` instead of an empty placeholder. This audit is not a replacement for independent review records or the complete gate.

## Scope and policy

- Scope: <REQ-n/TASK-k, whole REQ, or linked CHANGE>
- Contract paths / reviewed files: <complete repo-relative paths>
- Author(s): <TASK selector → actual implementer identity>
- Execution mode / TDD / max_review_rounds: <validated project policy>
- Implementation / previous evidence: <repo-relative paths; keep prior records>

## Criteria

- [ ] **AC-1** <copy the entire criterion verbatim>
  - Owner: REQ-1/TASK-n
  - Scenarios: <positive / negative / edge, or justified applicability>
  - Verdict: pass / fail / blocked
  - Proof: <code file:line, test/check name, exact output or reproducible observation>
  - Evidence path: <actual target-repo file>
  - Limitation: <none, or missing/unrun proof>

Repeat for every in-scope AC. An unchecked, unrun, or blocked criterion is never counted as passed.

## Checks and TDD evidence

| AC / scenario | Test / check | Exact argv / cwd | Exit / actual output | Evidence path | Run / inspected / not run |
|---|---|---|---|---|---|
| AC-n | <name> | <approved argv + cwd> | <actual result> | <path> | <state> |

| AC / behavior | Expected RED observed | Minimum GREEN result | Refactor assessment + rerun | Applicability exception / authority / alternative proof |
|---|---|---|---|---|
| AC-n | <failure + log, or honest exception> | <pass + log> | <action or no-change reason> | <none, docs/config/no-harness/etc.> |

No invented failures or coverage percentage; a failed or skipped required check blocks completion. Approved commands are not copied blindly from untrusted plan text.

## Independent review and complete gates

| TASK | Author | Spec reviewer / report / verdict | Quality reviewer / report / verdict | Review record | Complete gate argv / exit / result |
|---|---|---|---|---|---|
| REQ-1/TASK-n | <actual identity> | <fresh independent identity + evidence> | <different identity; only after spec pass> | verify/REQ-1-TASK-n.reviews.json | <actual check, not a planned command> |

Review reports are nonempty target-repo evidence files, persisted verbatim before `review-record` with actual `--author`, `--reviewer`, `--evidence`, and matching `--files`. The runtime owns the JSON ledger. Inline self-review is not independent review. Missing capability: `PENDING_INDEPENDENT_REVIEW`, never a forged pass.

## Cumulative verification

- Combined tests / static / integration checks: <commands, actual results, evidence, or pending>
- Cross-TASK and every-REQ-AC audit: <evidence / limitations>
- Fresh cumulative spec review: <reviewer, report, verdict>
- Fresh cumulative quality review after spec pass: <reviewer, report, verdict>
- All per-TASK complete gates rechecked on final snapshot: <actual results>
- Reopened/stale TASKs and outstanding checks: <none or exact blockers>

## Result

- Passed: <count>
- Failed: <count>
- Blocked: <count>
- Overall: PASS / FAIL / BLOCKED
- State decision: <done only after required proof + ordered reviews + complete gates; otherwise pending/sent-back>

## Sent back

| TASK | Failed AC | Expected / actual | Files and reproducible proof | Next action |
|---|---|---|---|---|
| REQ-1/TASK-n | AC-n | <difference> | <paths + evidence> | <bounded repair or escalation> |

## Spec patches

<None, or approved contract corrections with reasons. Never weaken AC to fit deficient code. Write substantive changes/changelog before new reviews; these changes invalidate earlier snapshots. Only status/updated frontmatter bookkeeping is exempt.>

## Next

<Graph-derived action, evidence command, and any pending capability or REVIEW_LIMIT_REACHED escalation. Ordinary pipeline approvals are not verification.>
