# TDD for one TASK

Default `tdd=required` means red → minimum green → refactor assessment for one behavior at a time. Load the target project's conventions, the TASK's owned AC, allowed file scope, and approved test commands before changing behavior. Follow `references/execution.md` for command trust, review order, and completion gates.

## Applicability before the loop

Map every owned AC and its positive, negative, and edge scenarios to a test or an explicit alternative proof. Record applicability before implementation; do not retroactively claim a red run.

- **Executable behavior with a harness:** use the loop below. Bug fixes start with a regression test demonstrating the bug.
- **Documentation-only:** record `TDD_NOT_APPLICABLE: docs`, affected AC, why there is no executable behavior, and the actual link/content/example checks. If documentation defines executable prompt contracts, add focused contract checks where a harness exists.
- **Configuration-only:** record `TDD_NOT_APPLICABLE: config` only when it changes no executable behavior. Run available schema/parse/dry-run checks. Runtime configuration behavior still needs a behavior test.
- **No test harness:** record `TDD_BLOCKED: no test harness`, missing capability, and the decision needed. Do not install a framework or guess commands. A user-authorized, repeatable alternative check can be an explicit applicability exception; record who authorized it, what it proves, and residual risk. Otherwise required verification remains blocked.
- **Existing passing behavior:** inspect whether the requested behavior already exists and whether the test exercises it. Record characterization evidence; do not delete working code merely to manufacture a red run. New/changed behavior still follows the loop.
- **Configured `tdd=off`:** record the project policy and why red-first was not required. It does not turn off tests, AC evidence, independent reviews, or complete gates.

Reviewers judge exceptions against the actual scope and project policy. An exception is not a blanket exemption for a whole TASK, and a missing check is never recorded as passed. Never mutate configuration to bypass a failure.

## Per-behavior loop

Finish one behavior before beginning the next. Listing a test plan is fine; batch-writing unrelated failing tests and then a broad implementation is not this workflow.

1. **Choose.** Name the AC/scenario, observable behavior, and focused test. Reuse the project's framework and fixtures. Add unit/edge/error tests where they reveal real risks; don't create arbitrary coverage quotas.
2. **RED.** Write one focused test before its production change. Run the approved command; save exact argv, cwd, exit code, and the relevant output. Confirm the failure is the expected missing/wrong behavior, not a syntax error, unavailable dependency, broken fixture, or unrelated baseline failure. Unexpected pass → investigate existing behavior/test validity. Broken setup → fix setup before claiming RED.
3. **GREEN.** Make the smallest scoped production change that satisfies that behavior. Run the focused test and affected regressions. Save the actual passing output. A failure remains a failure; diagnose rather than weakening the assertion.
4. **REFACTOR ASSESSMENT.** Record either `no change — <reason>` or a specific behavior-preserving improvement within the allowed files. Re-run affected tests after any refactor. Match local idioms; avoid speculative abstractions or adjacent cleanup. If a refactor fails, repair only your edits without automatic git reset/revert or destructive rewinds.
5. **NEXT.** Only after green and the assessment is recorded, take the next behavior. When all owned scenarios are covered, run the TASK's approved integration/static checks and hand off for independent review.

## Evidence row (one per behavior)

| AC / scenario | Test / check | RED: argv, exit, expected failure, log | GREEN: argv, exit, log | Refactor assessment + rerun | Exception / limitation |
|---|---|---|---|---|---|
| AC-n / scenario name | test path + name | actual observation, not a prediction | actual observation | action or no-change reason | none, or explicit applicability record |

Keep full logs or sufficient exact output in the target plan's `verify/` evidence files. Link them from the implementation and independent review reports; never include secret values. Distinguish `run`, `inspected`, and `not run`. A reviewer reading a log did not personally execute the test.

## Failure policy

Do not skip, comment out, delete, or rewrite a failing test merely to pass. If a test genuinely contradicts the agreed contract, stop, record the discrepancy, obtain the contract correction through Specify, then update the test transparently and collect new evidence. Do not change product requirements inside an implementation loop.

Pre-existing failures and missing environments are explicit blockers for affected required checks, not failures to silently absorb into unrelated cleanup. Keep the TASK incomplete and report the smallest next action. No non-project coverage percentage is imposed. Existing project quality thresholds remain in force.

Code written before its test has a provenance gap: disclose it, add honest regression/characterization coverage, and have the reviewer assess the recorded exception. Do not fabricate a historical failure or delete unrelated work to pretend the sequence was followed.

The review loop remains bounded by the project's `max_review_rounds`; changing or disabling TDD is not a way around a failed review. Completion still requires current spec review, then quality review, then the deterministic complete gate.

## Attribution

Adapted from OpenSpec Plus (MIT) red/green/refactor ideas, with explicit applicability, project-owned checks, no forced coverage quota, and non-destructive recovery.
