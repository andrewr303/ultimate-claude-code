# Routing

Single source of truth for the **orchestrator** — the `orchestrator` skill, the `/ultimate-sdd:go` command, and the `orchestrator` agent all read this file. Do not duplicate this table anywhere else; extend it here.

`references/loop.md` describes the *stages*. This file describes *dispatch*: given one request, which skill runs, in what order, and when to ask instead of guess.

## 0. Ground before routing

Always resolve the **target repo**, installed `<plugin>`, and existing plan `<root>` before routing. Run base `plan.py` commands with the target repo as cwd; put `sdd.py` common flags `--repo`, `--root`, and `--json` **after** its subcommand.

1. Honor an explicitly resolved root; otherwise look for `docs/plan/INDEX.md`, then `.plan/INDEX.md`, and inspect existing partial plan state before treating the project as fresh. Do not replace malformed or incomplete artifacts.
2. Read applicable project instructions and existing `INDEX.md`, `project.md`, `context/platform.md`, `workflow.md`, and `HANDOFF.md` as relevant. Inspect policy with `python <plugin>/scripts/sdd.py config --repo <target> --root <root> --json`; invalid/unknown settings are errors. Effective defaults from a missing config are **not** proof that setup exists or the project opted in.
3. For a **fresh plan**, route through `plan-setup` only when the request authorizes creating planning artifacts. For an **existing plan without config**, preserve legacy behavior until an explicit `/ultimate-sdd:setup`; do not silently add `config.json` or opt it into configured gates while grounding. Report setup gaps separately from malformed state.
4. Pure Explore, Resume, Revert/rollback preview, and Board/status requests are read-only: no scaffolding, context generation, INDEX writes, or repairs. Missing setup is a follow-up offer, not a side effect. For authorized planning writes, use `plan-context` if relevant code exists and the platform map is missing; never specify against imagined architecture.
5. Search for existing PRDs (`docs/prd/**/*.md`, `*prd*.md`) and briefs before writing a new one. Load only relevant context and upstream contracts, following `references/spec-quality.md`.
6. Derive Next with `python <plugin>/scripts/plan.py next --root <root> --json`. It prioritizes the core graph; it does not prove setup, load eligibility, independent review, or authorization. Apply the destination skill's gates before acting.

State the chosen route and any material gaps, not a narration of reconnaissance. Setup/config inspection never executes stored test commands. Recovery boundaries are in `references/recovery.md`; build/review gates are in `references/execution.md`.

## 1. Pick the layer

Five layers. Choosing the wrong one is the most expensive routing error.

| Layer | Owns | Artifacts | Enter when |
|---|---|---|---|
| **Context** | What the codebase and company actually are | `context/platform.md`, `context/*` | Relevant platform map missing for authorized planning, or new source material to ingest |
| **PRD** | Behavior and intent, **no implementation values** | `docs/prd/*.md` | The user wants a product document, not a build plan |
| **Plan** | EPICs → REQs → TASKs, readiness, handoff | `docs/plan/**` | The user wants work specified or built |
| **Change** | Deltas against existing behavior | `docs/plan/changes/<slug>/`, `docs/plan/truth/` | Brownfield: `truth/` exists or behavior is being modified |
| **Pipeline** | Autopilot, goal loops, review cycles, retention | pipeline runs, `HANDOFF.md`, lessons | The user wants the loop driven for them |

PRD layer is behavior-only. Implementation values (schemas, endpoints, thresholds) belong on REQs and TASKs. If a PRD request keeps drifting into implementation, say so once and route to the Plan layer without expanding the authorized work.

## 2. Dispatch table

| Signal in the request | Skill | Equivalent command |
|---|---|---|
| "setup", onboarding, explicitly repair missing scaffolding | `plan-setup` | `/ultimate-sdd:setup` |
| "map the codebase", "add context", platform gap in authorized planning | `plan-context` | `/ultimate-sdd:context` |
| PDF / transcript / website / Confluence to ingest | `plan-context` (ingest mode) | `/ultimate-sdd:context` |
| "think through", "not ready to write", stuck on scope | `prd-explore` | `/ultimate-sdd:explore` |
| "write a PRD", "product spec for X" | `prd-new` | `/ultimate-sdd:new` |
| "deepen / fix / update this PRD" | `prd-improve` | `/ultimate-sdd:improve` |
| "review", "score", "critique this PRD" | `prd-review` | `/ultimate-sdd:review` |
| "PRD for what we already built", legacy docs | `prd-from-code` | `/ultimate-sdd:from-code` |
| Messy idea, no aligned brief | `plan-frame` | `/ultimate-sdd:frame` |
| Aligned brief or a PRD, no EPICs yet | `plan-project` | `/ultimate-sdd:project` |
| **"create EPICs and REQs for X"** | `plan-project` | `/ultimate-sdd:project` |
| REQ-n named, readiness < 4, or "specify" | `req-specify` | `/ultimate-sdd:specify` |
| "refine REQ-n", patch readiness gaps | `req-specify` (refine mode) | `/ultimate-sdd:refine` |
| "design REQ-n / CHANGE-n", meaningful architecture uncertainty | `plan-design` | `/ultimate-sdd:design` |
| REQ `ready`, no TASKs, or "break down" | `req-scope` | `/ultimate-sdd:scope` |
| "load", "next task", "start building" | `task-load` (load-only stops at handoff) | `/ultimate-sdd:load` |
| TDD for an authorized TASK build | `plan-tdd` | `/ultimate-sdd:tdd` |
| "verify", "check the work", "is REQ-n done?" | `task-verify` | `/ultimate-sdd:verify` |
| "board", "status", "spec tree", "what's next?" | `plan-board` (read-only) | `/ultimate-sdd:board` |
| "just do the next thing" | derived Next, subject to scope and gates | `/ultimate-sdd:next` |
| "push to Linear" | `plan-push` | `/ultimate-sdd:push` |
| "propose", brownfield behavior change, `truth/` exists | `plan-propose` | `/ultimate-sdd:propose` |
| "apply the change", "implement CHANGE-n" | `plan-apply` | `/ultimate-sdd:apply` |
| "split this change", change too large for one diff | `plan-decompose` | `/ultimate-sdd:decompose` |
| "archive", "merge deltas" | `plan-archive` | `/ultimate-sdd:archive` |
| "sync specs" without archiving | `plan-archive` (sync-only) | `/ultimate-sdd:sync` |
| "auto", "autopilot", "run the pipeline" | `plan-auto` | `/ultimate-sdd:auto` |
| "drive this metric", "iterate until it passes" | `plan-goal` | `/ultimate-sdd:goal` |
| "review the diff", "review cycle" | `plan-review` | `/ultimate-sdd:review-cycle` |
| "retain", "what did we learn" | `plan-retain` | `/ultimate-sdd:retain` |
| "handoff", authored session notes, session ending | `plan-handoff` | `/ultimate-sdd:handoff` |
| "checkpoint", save machine state for an existing TASK | `plan-checkpoint` | `/ultimate-sdd:checkpoint` |
| "resume", recover after interruption/compact | `plan-resume` (read-only) | `/ultimate-sdd:resume` |
| "revert", undo TASK/REQ/CHANGE, rollback safety | `plan-revert` (preview only) | `/ultimate-sdd:revert` |

### Name collisions to get right

- `/ultimate-sdd:review` reviews a **PRD document** against the 10-dimension rubric. `/ultimate-sdd:review-cycle` reviews an **implemented diff** against a REQ or CHANGE. Resolve "Review this" using disk evidence and the ambiguity policy below.
- `/ultimate-sdd:archive` merges deltas **and** moves the folder through guarded `plan.py archive --move`. `/ultimate-sdd:sync` uses the same command without `--move`. Both require configured verification; confirmation cannot waive it.
- `/ultimate-sdd:next` derives core graph priority, never permission. Board/status displays only; an explicit next-action request acts only within authorized scope and the destination skill's gates.
- `task-load` writes a TASK execution brief. `plan-handoff` preserves authored `HANDOFF.md`; `plan-checkpoint` appends machine records without lifecycle changes; `plan-resume` reads live state; `plan-revert` previews only and never executes git mutations.
- `plan-design` is optional and proportionate: a no-id REQ/CHANGE sidecar before implementation when needed, not a mandatory new graph stage. `plan-tdd` changes behavior only inside an authorized build, never as a planning side effect.

## 3. Recipes

Multi-stage requests proceed only as far as the user's scope and the gates permit. Planning authorization does not imply implementation, test execution, or archive authorization.

**R1 — "create EPICs and REQs for X"** (the common case)
Ground (fresh authorized plan → `plan-setup`; existing legacy plan stays legacy) → `plan-context` if relevant code exists and `platform.md` is missing → `plan-frame` if there is no aligned brief or PRD → `plan-project` → **stop**. Report EPIC/REQ IDs and offer `req-specify` on the first unblocked REQ. Do not auto-specify.

**R2 — "just plan it" / "idea to tasks"**
`plan-frame` → use actual brief alignment (or an authorized draft with `[assumed]` gaps; apply auto-mode ambiguity rules) → `plan-project` → `req-specify` on the first unblocked REQ → optional proportionate `plan-design` → `req-scope` → **stop before Load**. Never code or run TDD on this route.

**R3 — "PRD first, then plan"**
`prd-new` (or `prd-improve` on an existing one) → offer `prd-review` → `plan-project` using the PRD as the brief → continue as R1, preserving the planning-only stop.

**R4 — brownfield behavior change**
Explore only if thinking is requested or intent is fuzzy; exploration writes nothing. For authorized proposal work: `plan-propose` → optional `plan-decompose` / `plan-design` / Specify/Scope as requested → **stop at the requested planning artifact**. Do not automatically Apply or Archive merely because a CHANGE was proposed.

For explicitly authorized implementation, continue via `plan-apply` with load gates, scoped `plan-tdd`, actual tests, independent spec-then-quality review, complete gates, and cumulative verification/review. Apply reports Archive as a next action; `plan-archive` runs only when separately requested or included in an authorized delivery pipeline, using the guarded dry-run then execution in `references/openspec.md`. Retain only within the requested delivery scope.

**R5 — "what's next" / "keep going"**
A state question runs read-only `plan-board` and reports derived Next, gaps, and gates. An explicit "keep going" or `/ultimate-sdd:next` may execute one derived action only within the existing authorization; it cannot turn planning-only work into a build or archive.

**R6 — "run it for me"**
`plan-auto`. Classify or honor an explicit pipeline name and walk authorized stages. `--no-gate` waives only ordinary stage-approval pauses; it never waives technical verification, authorization, or vet gates. Do not skip tests, independent reviews, complete gates, or configured archive checks, including `skip_specs`.

## 4. Ambiguity policy

Route silently when one row clearly wins. Outside auto permission mode, if two or more genuinely tie, ask **one** question with concrete options — never dump the table and wait.

Genuine ties:

- Idea vs existing PRD vs named REQ, when the request names none of them.
- "Review this" with both a PRD and an implemented diff on disk.
- A request that could be a new EPIC or a CHANGE against existing `truth/`.

In auto permission mode, **never call AskUserQuestion**. Reuse evidenced authorized decisions; choose only bounded, safe assumptions and label them. Unresolved security/privacy/data/ownership semantics, scope, or authorization gaps block the affected action rather than becoming invented approval. Report the decision needed without a question tool. Silence, configuration defaults, numeric readiness, and pipeline auto-approval are not user consent.

Otherwise pick the best supported row, state the route in one sentence, and execute within its limits.

## 5. Guardrails

- Artifacts go in the resolved target plan root (or `docs/prd/`), never this plugin. Do not scaffold read-only routes or silently opt in legacy plans.
- IDs are append-only. TASK selectors are `REQ-n/TASK-k`; TASK dependency keys use local same-REQ IDs. Never renumber.
- Before a TASK handoff/status change/build, require a successful runtime load gate: readiness ≥ 4, eligible statuses, and both REQ/TASK blockers. Next is not that gate.
- Do not implement application code or run TDD on Setup / Frame / Propose / Specify / Design / Scope / Board / Project.
- `blocked_by` and `blocks` stay mutual and acyclic. Preserve the existing graph/status vocabulary.
- Only the coordinator changes lifecycle state and INDEX. Regenerate INDEX after authorized artifact/status writes; validate and derive Next from base `plan.py` in the target cwd. Report unrelated/concurrent errors rather than overwriting others' work.
- Require independent spec review before independent quality review, actual all-AC/test evidence, fresh complete gates before done, and cumulative verification/review. Inline self-check or absent capability is not a pass (`references/execution.md`).
- Unknowns are accurately `[assumed]` or unresolved, never invented evidence, metrics, API shapes, reviewer identities, or approval. Runtime hashes cannot prove reviewer honesty, truthful logs, omitted scope, or real host independence.
- Secrets: environment **key names** only, never values.
- Local-first. Do not call BrainGrid SaaS/CLI unless the user asks.
- Do not write `openspec/` or `rasen/`, or call donor CLIs. Historical attribution paths are not executable dependencies.

## 6. Reporting contract

Every orchestrator turn ends with:

1. **Route** — the skill(s) that ran and why.
2. **Written** — artifact paths/IDs, or explicitly no writes for a read-only route.
3. **Readiness / blockers** — scores, setup gaps, actual gates/review state, and missing evidence/capability.
4. **Next** — actual `plan.py next` result, not an invented action or certification claim.
5. **Offer** — the next authorized stage or decision needed; do not auto-skip Spec or the planning-only stop.
