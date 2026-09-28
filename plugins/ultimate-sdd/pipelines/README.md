# Pipelines

Rasen-shaped delivery loops as **data**. The LEAD (`/ultimate-sdd:auto`) classifies a task, then walks these stages. Skills named here are this plugin's skills — not `rasen-*`.

| Name | Use when |
|---|---|
| `small-feature` | Default: proportionate proposal/design, per-task TDD, verification and review-cycle. |
| `bug-fix` | Narrow reproduction and regression test, verification and bounded independent review. |
| `full-feature` | Cross-cutting work: discovery, proposal, explicit design, implementation, serial verification/review. |
| `auto-decompose` | Split work into child changes with owned file scopes; each follows small-feature safeguards. |
| `goal-measure` | Drive an approved metric; code changes still need scoped TASKs, tests and independent reviews. |
| `goal-evaluate` | Drive a rubric; a rubric score alone is not implementation verification. |
| `goal-research` | Research-only: answer a brief with evidence; no automatic implementation or archive. |

## Execution contract

These JSON files schedule skills. `plan.py run advance` records stage progress; it does **not** execute a skill, run tests, inspect AC, dispatch reviewers, or certify completion. The coordinator must perform the named skill and inspect its real result before advancing. `--approve` and `--no-gate` affect ordinary scheduling approval only; they never bypass load/complete gates, review requirements, configured archive checks, user authorization, or the `vet` pause.

`full-feature` includes `plan-design` before Apply. For small features and bug fixes, the proposal resolves material technical choices using `plan-design` when needed; a concise existing-pattern rationale is enough for a trivial change. The existing small-feature `propose` → `apply` stage IDs/order remain compatible with saved consumers. Do not infer design approval from a stage ID.

TDD is **inside each TASK's implementation**, not a later bulk test-writing stage. `plan-apply` and `plan-tdd` require the project's actual approved checks. Every implementation path, including goal iterations that change code, needs readiness >=4, the load gate, actual test evidence, spec review first and quality review second, then the complete gate. Measurement-only work should not fabricate TASKs or archive an unrelated change.

Review and verify stages run serially on a stable snapshot. Parallel implementation requires independent dependencies and disjoint complete file scopes; `parallelGroup` is not permission to review files still being edited. Recheck earlier TASK evidence after cumulative changes. Use `references/execution.md` for independent reviewer identities, source/evidence freshness, explicit inline limitations, and final cumulative reviews.

A `loop.maxRounds` value is a scheduling annotation, not a new retry budget. Respect the stricter of its cap and project `max_review_rounds`, plus persisted gate attempts; never reset exhausted history by advancing/restarting a pipeline. A failed or missing check stops delivery visibly.

`origin: composed` pipelines must include a reviewer stage **and** a `review-cycle` loop or `plan.py pipeline show` refuses to load them. Structural validity is not execution proof. Before archiving, invoke `plan.py archive` from the target repository: dry-run first, then the authorized merge (add `--move` only for archive). Do not call the lower-level merger to evade configured evidence checks.
