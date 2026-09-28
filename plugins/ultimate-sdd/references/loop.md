# The loop

Frame → Spec → Scope → Load → Verify → (Frame)

The spec persists. Every turn starts from higher ground.
Do not skip Spec. Load requires the runtime gate: parent readiness 4–5, eligible REQ/TASK statuses, and both levels' blockers resolved (`references/model.md`). A graph-derived Next or readiness score alone is not eligibility or authorization.
Do not Verify from memory — walk the written acceptance criteria and current evidence.

Resolve the target repo and plan root first. Fresh authorized artifact creation uses `plan-setup`; existing config-free plans remain legacy until explicit `/ultimate-sdd:setup`. Effective defaults from `sdd.py config` are not proof of opt-in. Read project instructions, validated config, `workflow.md`, and relevant context before planning/building. Unknown/invalid policy fails; stored test argv is a candidate, not permission to run it. Setup and planning do not execute tests.

Planning-only requests stop at the requested artifact (at latest before Load), never automatically Apply or Archive. Pure Explore, Board, Resume, and Revert are read-only and do not scaffold. In auto permission mode, never call AskUserQuestion: use only evidenced authorized decisions, and keep safety-sensitive ambiguity or missing authorization blocked. See `references/routing.md` for dispatch, `references/spec-quality.md` for planning quality, and `references/execution.md` for build/review discipline.

## Stage 1 — Frame

**You:** describe the feature, the app, or the bug the way you would tell a friend. Messy is fine.

**Plugin:** interrogate like a senior engineer. Surface skipped edge cases and unmade decisions. Produce a behavior-only brief; keep modules/endpoints/technical params on the REQ. Ask clarifying questions only outside auto permission mode. Do not write EPICs until the brief is actually aligned or a draft is authorized; mark safe guesses `[assumed]` without inventing agreement.

Feeling: the blank page is gone.

Entry points: raw idea, bug report, "plan this", `/ultimate-sdd:frame`, `/ultimate-sdd:plan`.

## Stage 2 — Spec

**You:** review the requirement and acceptance criteria. Adjust anything that is not what you meant.

**Plugin:** convert the framed idea (or a PRD slice) into an engineering-grade REQ. Goals, context, architecture notes from `platform.md`, positive/negative/edge Given/When/Then, stable FR/AC IDs, and source/decision traceability. Not a wish — a contract. Score readiness 1–5; unresolved build-blockers cap it at 3. No build until the runtime load gate and authorization permit it.

Feeling: one source of truth you can point at.

Entry points: "Specify REQ-n", `/ultimate-sdd:specify`, `/ultimate-sdd:refine`.

Specify → Refine → Start Building is the REQ pipeline. Start Building is Scope + gated Load, not a fourth document type. Optional `/ultimate-sdd:design REQ-n|CHANGE-n` resolves meaningful architecture uncertainty proportionately before implementation. Its no-id sidecar adds neither requirements nor a mandatory graph stage; trivial changes can omit it.

## Stage 3 — Scope

**You:** read the build plan as a short, ordered list instead of one giant prompt.

**Plugin:** decompose the ready REQ into observable vertical TASK outcomes, each independently verifiable across only the necessary layers. Include tests/docs in the slice rather than defaulting to separate layer tasks. Each AC has one active owner, with its full original text copied verbatim. TASK dependency keys use local same-REQ IDs, mutual and acyclic; external handoffs use `REQ-n/TASK-k`. Preserve existing work and name file scope/integration seams. Review the TASK set plus parent REQ as planning artifacts, not implementation proof.

Feeling: you know exactly what is next.

Entry points: `/ultimate-sdd:scope`, "break this down", "create tasks".

## Stage 4 — Load

**You:** do not prompt the agent. You load it.

**Plugin:** first require exit 0 and `ok: true` from `sdd.py gate --task REQ-n/TASK-k --phase load --repo <target> --root <root> --json`. Then write the complete handoff: actual gate result, author identity, owned AC verbatim, strict file scope, project/config/workflow/design context, approved check argv/cwd, and evidence destination. The coordinator sets TASK → `in-progress` and a ready REQ → `in-progress`, then regenerates INDEX. A load-only request stops at that handoff.

For an authorized build, dispatch one implementer (or inline authoring under project policy) using `plan-tdd`: RED → minimum GREEN → REFACTOR assessment with actual results or explicit applicability exceptions. Parallel work needs `parallelism=disjoint`, dependency independence, and disjoint files including tests/config/generated output; otherwise serialize. The worker returns evidence, never marks done or expands scope.

Feeling: the agent builds against a plan, not a hunch.

Entry points: `/ultimate-sdd:load`, `/ultimate-sdd:next`, "start building", "next task". TDD is part of an authorized build, not permission to start one.

## Stage 5 — Verify

**You:** walk the acceptance criteria against evidence; accept demonstrated behavior or send back exact defects.

**Plugin:** require a fresh independent spec reviewer first, then a different independent quality reviewer after the current spec pass. Persist full reports verbatim and record the exact source/evidence/REQ/TASK snapshot through `sdd.py review-record`. Only frontmatter `status`/`updated` bookkeeping is excluded from contract hashes. Code, tests, evidence, scope, or substantive contract edits require fresh ordered reviews. Inline self-check is not independent review; missing host capability stays `PENDING_INDEPENDENT_REVIEW`.

Every owned AC needs passing proof and the runtime `complete` gate immediately before TASK → `done`. Observed defects become `sent-back` with failed AC, expected/actual behavior, files, and reproducible evidence; missing/unrun checks are not passes. The coordinator, not the worker, owns state. Repair/review consumes the same per-TASK `max_review_rounds` budget across resumes; never reset it to get a pass.

After all authorized TASKs, run approved cumulative tests/checks and all-REQ-AC/CHANGE-scenario verification. Recheck complete gates for every TASK on the final combined snapshot; later changes can stale earlier reviews. Require fresh cumulative spec-then-quality review independent of all in-scope authors before REQ `done` or CHANGE closure. Runtime hashes check consistency, not truthful logs, reviewer honesty, omitted scope, or real host independence; TDD and cumulative review remain coordinator/reviewer discipline.

Feeling: closure, then pull.

Entry points: `/ultimate-sdd:verify`, "check the work", "is REQ-n done?".

## Routing

Detect input, then enter the earliest incomplete **authorized** stage. Full dispatch lives in `references/routing.md`.

| Input | Start at |
|---|---|
| Messy idea, no brief | Frame |
| Existing PRD, no EPICs | Project plan (Spec's epic layer), using the PRD as the brief |
| Relevant code, no `platform.md`, authorized artifact creation | Context, then Frame or from-code |
| Aligned brief, no EPICs | Project plan |
| REQ named, readiness < 4 | Spec |
| REQ `ready`, no TASKs | Scope |
| TASK suggested for load | Runtime load gate, then Load if permitted |
| Implementation claimed done | Verify, never accept the claim alone |
| "status" / "board" / "what's next" | Read-only Board and derived Next report |

## Persistence

- Write authorized artifacts to disk in the same turn; regenerate INDEX, validate, and derive Next. Conversation memory is not the plan.
- After Verify, remaining work may make a newly unblocked REQ the next Specify/Load candidate. The core graph decides; this is the loop continuing, not a new project or permission to build.
- Learnings may require an authorized REQ correction, never a weakened AC to fit deficient code. Record substantive changes before collecting fresh reviews; edits to AC, send-back text, or changelog stale previous contract evidence.
- If all CHANGE REQs are `done`, the graph may suggest Archive. It still needs authorization, actual cumulative proof, and configured completion checks. A Published/`done` label is not certification.

## Complementary loop — Explore → Propose → Apply → Archive

OpenSpec's change cycle sits beside Frame/Spec/Scope/Load/Verify. Same plan root. Same REQ/TASK IDs. Details: `references/openspec.md`.

| Stage | Job | Writes |
|---|---|---|
| **Explore** | Think with the codebase; no scaffolding | Nothing |
| **Propose** | One-intent change: why, delta (ADDED/MODIFIED/REMOVED), optional design | `changes/<slug>/` |
| **Apply** | Implement authorized eligible TASKs with TDD and ordered review | Code + actual evidence; coordinator status updates |
| **Verify** | Same evidence contract as the main loop | `verify/REQ-n.md`, per-TASK reviews, cumulative CHANGE review |
| **Archive** | Guarded merge into `truth/` and move to `changes/archive/YYYY-MM-DD-<slug>/` | Truth + archive |

**Enablers, not arbitrary phase gates:** you may skip unnecessary design, or revisit an artifact with authorized corrections. You may not bypass technical load/complete gates, real independent review, or permission. A proposal-only request never automatically applies or archives.

Archive uses `plan.py archive --root <root> --change <slug> --move --dry-run`, then the same authorized command without `--dry-run`; sync-only omits `--move`. Do not bypass it with direct merging or manual moves. Configured failures cannot be waived by confirmation, `--approve`, `--no-gate`, or `skip_specs`; legacy compatibility is not equivalent certification.

### Extra routes

| Input | Start at |
|---|---|
| "setup" / explicit missing-scaffold repair | Setup; preserve existing authored inputs and valid policy |
| "design REQ-n / CHANGE-n" | Proportionate optional Design; no application edits |
| "propose" / brownfield behavior change / existing `truth/` | Propose if authorized; Explore first if intent is fuzzy |
| "apply CHANGE-n" / "implement the change" | Apply within named scope and gates |
| "archive" / "merge the deltas" / "sync specs" | Guarded Archive (or sync-only) |
| Fuzzy worry about existing code, no change yet | Explore; offer Propose, do not auto-write |
| "auto" / whole delivery | Autopilot — ordinary stage approval is not verification or authorization |
| Metric / rubric / research until done | Goal loop — vet the measure first |
| Too big for one diff | Decompose, then authorized child work |
| Session notes / session ending | Authored Handoff: preserve decisions via targeted edits |
| "checkpoint" for an existing TASK | Append machine JSON; no status change or inferred commit ownership |
| Resume after interruption/compact | Read HANDOFF, then read-only live Resume |
| Undo TASK/REQ/CHANGE | Revert preview only; never execute git mutations |

Scripts, not memory, decide Next. Run `python <plugin>/scripts/plan.py next --root <root> --json` from the target repo; it prioritizes the core graph, not setup/review certification or permission. Recovery details and Claude-only config-opt-in hooks are in `references/recovery.md` and `references/handoff.md`.
