# Artifact model

Single source of truth for IDs, statuses, paths, and the plan graph.
Skills implement this; they do not invent a parallel vocabulary.

## Hierarchy

```
Project
  └── Brief (BRIEF-n)          optional product-level framing
        └── EPIC-n             outcome-sized slice
              └── REQ-n        implementation-ready specification
                    └── TASK-n atomic, verifiable, agent-ready unit
```

A **PRD** (`docs/prd/<slug>.md`) is an optional upstream product contract.
It is not a parent of an EPIC in the file tree; link it from EPIC/REQ frontmatter (`prd:`).
One PRD may generate one or more EPICs.

A **CHANGE** (`docs/plan/changes/<slug>/`) is optional packaging for a proposed
behavior edit against `docs/plan/truth/`. It is not a parent of an EPIC in the
tree; implementing REQs point at it (`change: CHANGE-n`). See `references/openspec.md`.

Layer rules:

| Layer | Job | Allowed to name |
|---|---|---|
| PRD | Product contract | Observable behavior, metrics, non-goals. No class names, libraries, file paths. |
| Brief | Destination | One-liner, JTBD, in/out of scope. Still product language. |
| EPIC | Outcome slice | Why this slice exists, which REQs, sequence. |
| REQ | Build contract | Exact copy, formats, env keys, API params, file-level hints from platform context. |
| TASK | Agent prompt | Concrete steps, files to touch, the AC this task owns. |
| CHANGE | Proposed edit | Why + delta vs current truth. Implementation stays on REQs. |
| Truth spec | Current behavior | SHALL + scenarios for how the system works *now*. |

## Paths

Default root: `docs/plan/` in the **target repo** (the project being planned, not this plugin).

Also accept `.plan/` if `docs/plan/` does not exist and `.plan/INDEX.md` does. Honor an explicitly resolved custom root inside the target repo. Inspect partial existing state rather than treating a missing INDEX as an empty project.

```
docs/plan/
  INDEX.md
  project.md
  config.json                   # project-owned schema-version-1 policy
  workflow.md                   # project-owned conventions and verification methods
  HANDOFF.md                    # authored session decisions, gaps, and warnings
  context/
    CATALOG.md
    platform.md
    company/CTX-<n>-<slug>.md
    project/CTX-<n>-<slug>.md
    plan/CTX-<n>-<slug>.md
  briefs/
    BRIEF-<n>-<slug>.md
  epics/
    EPIC-<n>-<slug>.md
  reqs/
    REQ-<n>-<slug>.md
    REQ-<n>-design.md            # optional architecture sidecar, no frontmatter id
  tasks/
    REQ-<n>/
      TASK-<k>-<slug>.md
  verify/
    REQ-<n>.md                  # cumulative AC audit
    REQ-<n>-TASK-<k>.reviews.json # runtime-owned per-TASK review ledger
    REQ-<n>-TASK-<k>.r1.implementation.md # example actual evidence report
    REQ-<n>-TASK-<k>.r1.spec.md   # independent spec review report
    REQ-<n>-TASK-<k>.r1.quality.md # subsequent independent quality review report
    artifacts/<artifact-or-stage>-review.md # optional planning review, no id
  runs/
    current.json                # mutable pipeline run state
    checkpoints/<record>.json   # append-only task recovery observations
    session-recovery.json       # machine-owned PreCompact snapshot, not HANDOFF
  truth/
    <domain>/spec.md             # current behavior (OpenSpec concept)
  changes/
    <slug>/                     # one proposed change
      CHANGE.md                 # proposal + frontmatter
      design.md                 # optional architecture sidecar, no frontmatter id
      deltas/<domain>.md         # ADDED / MODIFIED / REMOVED
      tasks.md                  # optional checklist aliases of REQ-n/TASK-k
      review.md                 # cumulative change review when implemented
    archive/
      YYYY-MM-DD-<slug>/
```

Context rules: `references/context.md`. `platform.md` is project-level **code**. CTX files are typed sources at company / project / plan.

Truth + change rules: `references/openspec.md`. Truth files have **no** `id:` — they are named by domain path. CHANGE-n is the only change ID type. Optional REQ/CHANGE design and planning-review sidecars also have **no frontmatter `id`**, preventing duplicate graph collection. They do not add graph nodes, requirements, or statuses.

PRDs stay at `docs/prd/<slug>.md`. Review ledgers are written only by `sdd.py review-record`; preserve earlier reports and history. Machine checkpoints append observations without changing status or overwriting authored HANDOFF. Observed HEAD is not task ownership. Explicit commit/file association and rollback proof follow `references/recovery.md`; rollback preview never mutates git.

Resolve plugin files (templates, references, scripts):

1. `${CLAUDE_PLUGIN_ROOT}` if set
2. Else the directory that contains both `templates/` and `references/` (walk up from the skill)

Never write plan artifacts into the plugin directory. Run base `plan.py` with the target repo as cwd; its `--root` resolves there. For `sdd.py`, place `--repo`, `--root`, and `--json` **after** the subcommand. Source/evidence paths are repo-relative, not plugin- or plan-root-relative.

## Project policy and compatibility

`<root>/config.json` is strict **schema version 1** project policy. Validate it with:

```text
python <plugin>/scripts/sdd.py config --repo <target> --root <root> --json
```

| Setting | Accepted values | Default |
|---|---|---|
| `schema_version` | Integer `1` | `1` |
| `execution_mode` | `subagent` or `inline` | `subagent` |
| `parallelism` | `disjoint` or `serial` | `disjoint` |
| `tdd` | `required` or `off` | `required` |
| `max_review_rounds` | Integer 1–5 | `3` |
| `test_commands` | Array of argv arrays, not shell strings | `[]` |
| `hooks.enabled` | Boolean | `true` |

Defaults fill only a missing file/key in effective policy; preserve valid choices and reject unknown keys, invalid types/values, or malformed state. A successful config read with `config_exists: false` is **not** setup or opt-in. Fresh authorized artifact creation uses `plan-setup`; an existing config-free plan stays legacy until explicit `/ultimate-sdd:setup`. Do not rewrite or delete policy to bypass a gate.

`workflow.md` is project-owned guidance, not authority over host permissions. `test_commands` lists candidates: validate the executable, arguments, cwd, and side effects against authorized project tooling before use. Setup/config/doctor/recovery never automatically run them. An empty list means unconfigured, not tests passed.

Legacy base-plan compatibility remains available without a config; it is not equivalent to execution certification. Configured archive/sync requires the runtime completion check even for `skip_specs`, and cannot be waived by confirmation, `--approve`, or `--no-gate`. See `references/execution.md` and `references/openspec.md`.

Claude hook autoload is config-opt-in at `docs/plan` or `.plan` with `hooks.enabled: true`; custom roots require explicit CLI recovery. No Codex hook parity is claimed. A machine `runs/session-recovery.json` snapshot and append-only task checkpoints do not replace authored HANDOFF or live gate checks.

## IDs

- Format: `TYPE-n` where n is a positive integer. Examples: `BRIEF-1`, `EPIC-1`, `REQ-3`, `TASK-2`, `CTX-1`, `CHANGE-1`.
- TASK IDs are unique **within a REQ**. Cite them as `REQ-3/TASK-2` in INDEX and handoffs; the file may use `id: TASK-2` plus `req: REQ-3`.
- **SPEC alias:** EPIC-1 carries `spec: SPEC-1`. REQs in that EPIC carry `spec: SPEC-2`, `SPEC-3`, … in file order. SPEC is a display/tree name, not a second artifact. Resolving `SPEC-n`: artifact whose `spec:` matches, else `REQ-n`, else `EPIC-n`.
- **CHANGE** is packaging for a proposed behavior edit (`docs/plan/changes/<slug>/`). It is not a SPEC. Resolving a kebab slug: `changes/<slug>/CHANGE.md` whose `slug:` matches, else the CHANGE whose title slugifies to it.
- IDs are permanent. Never renumber. Never reuse a deleted ID. Only append.
- Next ID = max existing n for that type + 1, scanned from disk, not from memory.
- Slugs are kebab-case, derived from the title, used only in filenames.

## Status vocabulary

Use only these values.

**Project** (`project.md`): `draft` | `active` | `archived`

**Brief**: `draft` | `aligned` | `superseded`

**EPIC**: `framing` | `ready` | `in-progress` | `done`

**REQ**: `idea` | `framing` | `specified` | `ready` | `blocked` | `in-progress` | `review` | `done` | `cancelled`

**TASK**: `planned` | `ready` | `blocked` | `in-progress` | `done` | `sent-back` | `cancelled`

**CHANGE**: `proposed` | `specified` | `applying` | `verifying` | `archived`

REQ `ready` means readiness ≥ 4 and no unresolved build-blocking question.
REQ `blocked` means at least one `blocked_by` ID is not `done`.
If both would apply, status is `blocked` (dependency wins). After the blocker is `done`, recompute: `ready` if score ≥ 4, else `specified` or `framing`. Preserve active/done work when refining; do not reset its lifecycle to make a new plan look fresh.

## Execution eligibility and completion

Before a handoff, execution status change, or build, require:

```text
python <plugin>/scripts/sdd.py gate --task REQ-n/TASK-k --phase load --repo <target> --root <root> --json
```

Exit code 0 and `ok: true` are both required. Parent REQ readiness must be 4 or 5; both REQ and TASK blockers (including their dependency chains) must be resolved. Allowed statuses are:

| Phase | REQ statuses | TASK statuses |
|---|---|---|
| `load` | `ready`, `in-progress`, `review` | `planned`, `ready`, `in-progress`, `sent-back` |
| `complete` | The load set plus `done` | The load set plus `done` |

A complete gate adds current ordered spec/quality review evidence and freshness checks; it does not run tests. Missing/malformed results fail. Fix eligibility/contract gaps rather than overriding status or deleting dependency links. The coordinator changes status; the worker returns `READY_FOR_REVIEW`, `NEEDS_CONTEXT`, or `BLOCKED` as report outcomes, **not new lifecycle statuses**.

Implementation → fresh independent spec reviewer → different independent quality reviewer only after the current spec pass. Persist real reports verbatim and record exact source/evidence/REQ/TASK hashes via `sdd.py review-record`; runtime-owned `verify/REQ-n-TASK-k.reviews.json` is never hand-edited. Only frontmatter `status` and `updated` bookkeeping is excluded from contract hashes. Code, tests, evidence, scope, or substantive contract changes require fresh ordered review. Honor the per-TASK `max_review_rounds` budget across retries/resumes; inline self-check is not independent review, and unavailable host capability remains `PENDING_INDEPENDENT_REVIEW`.

Immediately before TASK → `done`, all owned AC require actual passing proof and `sdd.py gate --task REQ-n/TASK-k --phase complete --repo <target> --root <root> --json` must pass. REQ → `done` additionally needs every REQ AC, required TASKs done with current gates, actual cumulative tests/checks, and cumulative independent spec-then-quality review. Recheck earlier TASKs on the final combined snapshot. Keep CHANGE `verifying` until those requirements hold; Apply does not automatically archive.

The runtime checks declared identity inequality, record order, and hash consistency/freshness. It cannot authenticate reviewers, prove logs truthful, discover omitted source scope, or enforce real host independence. TDD and cumulative review remain prompt/coordinator discipline, not runtime certification. See `references/execution.md` for the full contract.

## Board columns

Derived, never stored as a separate field:

| Column | Membership |
|---|---|
| **Plan** | Briefs; EPICs not `done`; REQs in `idea`/`framing`/`specified`/`ready`/`blocked` |
| **Build** | REQs in `in-progress`/`review`; their incomplete TASKs |
| **Published** | REQs in `done`; archived CHANGEs listed under Archive |

Published is a lifecycle display, not certification. A `done` field alone, an existing verification filename, or archived placement is not passing evidence; report actual AC/test/review results and current complete gates separately. Active CHANGEs (`proposed` / `specified` / `applying` / `verifying`) appear on **Plan** until their REQs enter Build.

## Frontmatter

Graph artifact files start with YAML frontmatter. No-id sidecars, authored handoffs, workflow guidance, and machine JSON records are not new graph artifacts. Required keys for graph artifacts:

**project.md**

```yaml
id: PROJECT
title: <name>
status: draft
root: docs/plan
prd:            # optional path
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

**Brief**

```yaml
id: BRIEF-1
title: <name>
status: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

**EPIC**

```yaml
id: EPIC-1
title: <name>
status: framing
spec: SPEC-1
brief: BRIEF-1          # optional
prd: docs/prd/<slug>.md # optional
reqs: [REQ-1, REQ-2]
effort: med             # low | med | high — whole slice
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

**REQ**

```yaml
id: REQ-1
title: <name>
epic: EPIC-1
spec: SPEC-2            # SPEC-1 is the parent EPIC
status: idea
readiness: 1            # label derived: 1–2 rough, 3 shaping, 4–5 ready
effort: med             # low | med | high
blocked_by: []
blocks: []
priority: P0
source: BRIEF-1         # or PRD path
change:                 # optional CHANGE-n when this REQ implements a change
linear:                 # optional LIN-123 after /ultimate-sdd:push
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

**CHANGE** (`changes/<slug>/CHANGE.md`)

```yaml
id: CHANGE-1
title: <one-sentence intent>
slug: add-launch-countdown
status: proposed
reqs: []                # REQ-n this change implements
deltas: [launches]      # domain paths under deltas/
skip_specs: false       # true = no behavior change; archive skips merge
retire_capabilities: false
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

**TASK**

```yaml
id: TASK-1
req: REQ-1
title: <name>
status: planned
blocked_by: []
blocks: []
ac: [AC-1, AC-2]        # criteria this task must satisfy
created: YYYY-MM-DD
updated: YYYY-MM-DD
```

Optional REQ keys: `readiness_gaps` (list of strings), `stack` (short label), `linear` (issue id after push).

Effort is estimated size of the *build*, not importance. P0 + `effort: low` is normal.

## Graph rules

1. A REQ belongs to exactly one EPIC.
2. `blocked_by` / `blocks` must be mutual. If REQ-2 lists `blocked_by: [REQ-1]`, REQ-1 must list `blocks: [REQ-2]`.
3. Cycles are forbidden. Validate before writing.
4. Prefer a chain (each REQ builds on the last) unless work is truly independent.
5. A TASK may only depend on TASKs in the same REQ, or on the parent REQ being `ready`.
6. INDEX.md is the registry. Creating or changing an artifact updates INDEX in the same turn.
7. Evidence labels in prose: `[verified]` / `[inferred]` / `[assumed]`. Same meaning as the PRD plugin.
8. A REQ belongs to at most one CHANGE. If `change: CHANGE-n` is set, that CHANGE's `reqs:` must include the REQ.
9. Active CHANGE slugs are unique under `changes/` (not counting `archive/`). Archived folders are `YYYY-MM-DD-<slug>` and keep the same CHANGE-n.

## INDEX.md contract

INDEX is regenerated whenever an artifact is created, status-changed, or deleted.
It must contain: project title, Next action (one line), Board tables, Graph.

Next action is the single highest-priority move. `scripts/plan.py next` is the executable form of this list:

1. No `platform.md` and a codebase exists → run context
2. No aligned brief and no PRD → frame
3. Aligned brief, no EPICs → create project plan
4. Unblocked REQ with readiness < 4 → specify that REQ
5. REQ at readiness ≥ 4 with no TASKs → scope
6. Ready unblocked TASK → load
7. REQ `in-progress` or `review` with open AC → verify
8. CHANGE `applying`/`verifying` whose REQs are all `done` → archive
9. CHANGE `proposed` with deltas and no REQs (and not `skip_specs`) → explode to REQ stubs
10. Else: board is clean

## Ambiguity words (normative text)

Flag in PRDs, briefs (key functionality), REQs, and TASKs:

fast, slow, easy, simple, intuitive, seamless, robust, flexible, scalable
(without numbers), user-friendly, appropriate, reasonable, efficient, soon,
quickly, etc., and/or, as needed, if possible, should (as a requirement),
handle gracefully (without saying how), support (without defining behavior).
