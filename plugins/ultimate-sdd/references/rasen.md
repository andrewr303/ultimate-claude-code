# Rasen fold-in

Absorbs Rasen's **outer loop** — pipelines as data, classify, autopilot, goal iteration, review-cycle, retain, handoff — without a second workspace or the Rasen CLI.

Historical source pointers: `rasen/README.md`, `rasen/docs/autopilot.md`, `rasen/pipelines/`, `rasen/docs/review-cycle-workflow-design.md`, `rasen/skills/workflows/rasen-retain/`. These are **unshipped historical sources**, not executable dependencies or installed-plugin paths. This plugin does **not** require `rasen` or write a `rasen/` folder.

## What maps

| Rasen | Here |
|---|---|
| `rasen/` workspace | `docs/plan/` |
| `/rasen-auto` LEAD | `/ultimate-sdd:auto` + `scripts/plan.py run` |
| `/rasen-goal` | `/ultimate-sdd:goal` + `goal-*` pipelines |
| `rasen pipeline classify` | `plan.py classify` |
| pipeline YAML | `pipelines/*.json` (stdlib JSON) |
| review-cycle | `/ultimate-sdd:review-cycle` (`plan-review`) |
| retain / learned skills | `/ultimate-sdd:retain` → `docs/plan/lessons/` |
| authored session handoff | `/ultimate-sdd:handoff` → `docs/plan/HANDOFF.md` |
| compact recovery | `/ultimate-sdd:resume` reads live state; `/ultimate-sdd:checkpoint` appends task observations |
| auto-decompose | `/ultimate-sdd:decompose` + `auto-decompose` pipeline |
| office-hours | `prd-explore` as the first full-feature stage |

Roles stay labels on stages (`planner` / `implementer` / `reviewer` / `fixer` / `shipper`). They are not a new ID type or proof of independent host sessions.

## Pipelines are data

`scripts/plan.py pipeline list|show` loads `pipelines/*.json`. Adding a task type is adding one JSON file.

Classification is a **keyword heuristic**. `basis` is `keyword` or `default`. No fake confidence number.

Default pipeline is `small-feature`. Explicit `--pipeline` always wins. A pipeline does not expand the user's request: planning-only stages stop before implementation, and a proposal alone does not authorize Apply or Archive. Use optional, proportionate `plan-design` before implementation when architecture is unresolved; use `plan-tdd` only within an authorized build.

Run base `plan.py` from the target repo with the resolved plan root. Extension commands use `sdd.py <subcommand> --repo <target> --root <root> --json`. Validate project config and read `workflow.md`; missing-file defaults are not setup opt-in. Existing config-free plans remain legacy until explicit `/ultimate-sdd:setup`. Policy and compatibility details are in `references/model.md`.

## Autopilot policy

Automatic selection and ordinary gate approval default OFF:

| Axis | Default | Flag |
|---|---|---|
| Gates | `on` (pause at `gate: true`) | `--no-gate` auto-approves ordinary stage gates only |
| Selection | `manual` | `--auto-select` adopts classify |
| Vet gates | always pause | `gate: "vet"` on `define-goal` — never auto-approved |

Every auto-approval is recorded on `docs/plan/runs/current.json`. Stage approval is not implementation verification or authorization: `--approve`, `--no-gate`, and user confirmation cannot waive readiness, blockers, approved test execution, independent reviews, freshness, or configured archive completion checks, including `skip_specs`.

Composed pipelines (`origin: composed`) must include a reviewer stage **and** a review-cycle loop or they will not load. A stage's presence or a successful `run advance` is not evidence that it ran successfully. Require the actual deliverable and checks before advancing.

In auto permission mode, never call AskUserQuestion. Reuse evidenced authorized decisions; unresolved safety-sensitive scope or permission gaps block the relevant stage rather than becoming invented approval. Stored test argv is a candidate, not authorization; setup/config and recovery never run it automatically.

## Review-cycle

Follow `references/execution.md`: load gate → one TASK implementer and actual AC/test/TDD evidence → fresh independent spec review → different independent quality review after the current spec pass → complete gate before TASK `done`. Only the coordinator updates lifecycle state; the author cannot declare a pass.

Record full reviewer reports verbatim and call `sdd.py review-record` with actual author/reviewer identities, evidence, and the entire explicit source scope. The runtime owns `verify/REQ-n-TASK-k.reviews.json`; do not hand-edit history. Freshness binds exact source files, nonempty evidence, and REQ/TASK hashes, ignoring only frontmatter `status` and `updated` bookkeeping. Changes to contracts, code, tests, scope, or evidence require fresh spec-then-quality review; re-review can focus on the repair while reconciling all owned AC and full scope.

Triage → authorized author repair → actual checks → ordered independent re-review continues only within validated `max_review_rounds` (default 3, range 1–5) **per TASK across resumes**, honoring runtime accounting. A pipeline's `maxRounds` never grants a new per-TASK budget. Stop on Blocker/Major findings, missing evidence/capability, stale gates, or exhaustion. Inline mode permits authoring, not self-certification; missing independent host capability stays `PENDING_INDEPENDENT_REVIEW`.

After the authorized TASKs, require actual cumulative tests/all-AC evidence, fresh complete gates for every TASK, and fresh cumulative spec-then-quality reviews independent of every in-scope author. Record REQ evidence at `verify/REQ-n.md` and CHANGE cumulative review at `changes/<slug>/review.md`. Do not invent an aggregate review-record stage. Keep CHANGE `verifying` until this is established; report Archive as the next explicit action unless an authorized delivery pipeline includes it.

Runtime checks establish declared identity inequality, order, and snapshot consistency, not reviewer honesty, truthful logs, omitted source scope, or genuine host independence. TDD and cumulative review are prompt/coordinator discipline, not runtime-enforced test execution. Configured archive failures are blockers, not warn-and-confirm decisions; use the guarded `plan.py archive` flow in `references/openspec.md`. Legacy archive compatibility is not equivalent certification.

## Retain

Six gates: durable, reusable, actionable, evidenced, novel, bounded.
Zero accepted lessons is success. Never copy source text into a lesson. Never emit a script as a lesson.

## Handoff and recovery

Read the entire existing `<root>/HANDOFF.md` before updating authored session notes. From the target cwd, `python <plugin>/scripts/plan.py handoff --root <root>` returns a read-only draft of Next, open REQs, active CHANGEs, and the current run. Do not use unconditional `--write`: it overwrites authored notes. Append or make targeted edits preserving decisions, constraints, open questions, and warnings.

`plan-checkpoint` appends JSON under `runs/checkpoints/` for an existing `REQ-n/TASK-k` without changing status or HANDOFF. HEAD is observation, not ownership. Explicit `--commit` and exact `--files` plus matching review/source/commit evidence are needed for rollback safety; see `references/recovery.md`. Never infer association from timestamps, messages, or completion.

After compact or interruption, read HANDOFF and use read-only `plan-resume`; derive fresh Next and gate results rather than blindly following saved state. `plan-revert` is read-only preview, never git mutation. Refused rollback emits no commands and does not reconcile statuses as though it happened.

Claude SessionStart/PreCompact hook autoload requires project config opt-in at `docs/plan` or `.plan` and `hooks.enabled: true`. PreCompact writes machine `runs/session-recovery.json`, not HANDOFF. Custom roots use explicit CLI recovery; no Codex hook parity is claimed.

## Scripts are the source of Next

Do not re-derive Next from memory. Run from the target repo, substituting the resolved root:

```
python <plugin>/scripts/plan.py next --root docs/plan --json
python <plugin>/scripts/plan.py board --root docs/plan
python <plugin>/scripts/plan.py validate --root docs/plan
```

Next is core graph prioritization, not setup, load/review certification, or permission to proceed. After authorized artifact/status writes, regenerate INDEX with `board --write`; pure status/recovery routes do not write or scaffold.

## Attribution

Concepts adapted from Rasen (MIT), DumoeDss / rasen. Re-implemented on `docs/plan/` so this plugin stays local-first, stdlib-only, and single-vocabulary.
