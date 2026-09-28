# Ultimate SDD

**Version 1.0.0.** A local-first spec-driven-development plugin: establish project context, turn ideas into testable requirements, build scoped slices, and keep completion evidence tied to the files actually reviewed. The Python tools use the standard library only; Python **3.10+** is required. No SaaS, donor CLI, network service, or Git repository is required for planning and non-Git recovery.

The base `prd` graph remains **Project → BRIEF → EPIC → REQ → TASK**. OpenSpec-style truth/change deltas and Rasen-style delivery pipelines share that graph, rather than introducing another task system. Product PRDs remain behavior-only at `docs/prd/`; engineering contracts and evidence live in the target project's `docs/plan/`.

OpenSpec Plus contributes problem-first discovery, proportionate design, vertical slices, per-behavior TDD, and spec-before-quality review. Conductor informs project-owned workflow/setup and conservative checkpoint/rollback concepts. Evidence freshness and lifecycle hooks are independently authored mechanisms; **no Pilot Shell code, prompts, hooks, schemas, structure, or assets are included**. See `THIRD_PARTY_NOTICES.md` for provenance and licensing.

```text
Setup/context → Frame → Project → Specify → optional Design → Scope
                                                        ↓
Load gate → scoped implementation/TDD → spec review → quality review
                                                        ↓
Complete gate → cumulative checks/reviews → explicit sync/archive
```

Planning-only requests stop before implementation. A pipeline stage, a `done` label, a checkpoint, or a passing test alone does not certify delivery.

## What you get

### Command reference

Start with `/ultimate-sdd:go <request>`, backed by the `orchestrator` skill. Dispatch rules live in `references/routing.md`; explicit stages remain available. The 34 command wrappers and 34 `codex/prompts/ultimate-sdd-*.md` counterparts dispatch the same contracts. Actual slash-command syntax and independent-agent support depend on the host.

| Command suffix after `/ultimate-sdd:` | Skill | Purpose |
|---|---|---|
| `go <request>` | `orchestrator` | Route the request, respecting planning-only stops |
| `setup [title]` | `plan-setup` | Non-destructive project setup; opt into policy |
| `context [scope]` | `plan-context` | Bounded code/source context with evidence |
| `plan [idea\|PRD\|REQ-n]` | `plan` | Route the planning loop |
| `frame [idea]` | `plan-frame` | Behavior-only brief and material questions |
| `project [BRIEF\|PRD]` | `plan-project` | EPICs and sequenced REQs |
| `specify REQ-n` | `req-specify` | Testable behavior, AC and readiness |
| `refine REQ-n` | `req-specify` | Patch gaps without silently changing scope |
| `design REQ-n\|CHANGE-n` | `plan-design` | Proportionate technical decisions; no code |
| `scope REQ-n` | `req-scope` | Vertical-slice TASKs with owned AC/tests/docs |
| `load [REQ-n/TASK-k]` | `task-load` | Gated brief; load-only stops before code |
| `tdd [REQ-n/TASK-k]` | `plan-tdd` | Authorized per-behavior red/green/refactor |
| `verify [REQ\|TASK]` | `task-verify` | Actual AC evidence and completion gate |
| `board` | `plan-board` | Current SPEC tree, blockers and Next |
| `next` | derived routing | One authorized action from the live graph |
| `push` | `plan-push` | Optional authorized Linear export or Markdown |
| `propose [intent]` | `plan-propose` | One-intent CHANGE and delta specs |
| `apply [CHANGE]` | `plan-apply` | Scoped implementation and ordered reviews |
| `sync [CHANGE]` | `plan-archive` | Gated merge without moving the CHANGE |
| `archive [CHANGE]` | `plan-archive` | Gated merge, then archive |
| `auto [pipeline] <intent>` | `plan-auto` | Coordinate stages, not automatic proof |
| `goal <condition>` | `plan-goal` | Approved measure, rubric, or research loop |
| `review-cycle` | `plan-review` | Bounded repair and fresh re-review |
| `retain [CHANGE]` | `plan-retain` | Durable lessons; zero is a valid result |
| `handoff` | `plan-handoff` | Preserve and update authored session notes |
| `checkpoint REQ-n/TASK-k` | `plan-checkpoint` | Append machine observations/explicit associations |
| `resume` | `plan-resume` | Read-only recovery from current disk state |
| `revert REQ-n/TASK-k\|REQ-n\|CHANGE-n` | `plan-revert` | Read-only rollback preview, never execution |
| `decompose [CHANGE]` | `plan-decompose` | Split oversized work conservatively |
| `explore [topic]` | `prd-explore` | Thinking only; no automatic artifacts |
| `new <idea>` | `prd-new` | In-depth PRD through discovery waves |
| `improve <path>` | `prd-improve` | Strengthen an existing PRD |
| `from-code <scope>` | `prd-from-code` | As-built behavior with evidence and gaps |
| `review <path>` | `prd-review` | PRD scorecard, not implementation review |

Seven agent contracts are included: `orchestrator`, `planner`, `specifier`, `verifier`, `implementer`, `spec-reviewer`, and `quality-reviewer`. The last two are read-only reviewers; the coordinator persists their reports verbatim. An implementer cannot grade its own build.

## Layers

| Artifact | Job | May name |
|---|---|---|
| **PRD** | Product contract | Observable behavior, metrics. No libraries or file paths. |
| **Brief** | Destination | One-liner, JTBD, in/out of scope. |
| **EPIC** | Outcome slice | Why this slice, which REQs, sequence. |
| **REQ** | Build contract | Exact copy, tokens, env keys, API params, cache TTL. |
| **TASK** | Agent prompt | Steps, files, the AC this task owns. |
| **CHANGE** | Proposed edit | Why + delta vs current truth. Build still uses REQs. |
| **Truth spec** | Current behavior | SHALL + scenarios for how the system works now. |

PRDs stay at `docs/prd/`. Plan artifacts live at `docs/plan/`:

```
docs/plan/
  INDEX.md                 board + derived Next
  project.md
  config.json              strict project policy; setup opts in
  workflow.md              project-owned testing/context/definition of done
  HANDOFF.md               authored notes; preserve on recovery
  context/CATALOG.md       company / project / plan sources
  context/platform.md      actual architecture, APIs and conventions
  context/{company,project,plan}/CTX-n-*.md
  briefs/BRIEF-n-<slug>.md
  epics/EPIC-n-<slug>.md
  reqs/REQ-n-<slug>.md
  reqs/REQ-n-design.md      optional sidecar, no graph ID
  tasks/REQ-n/TASK-k-<slug>.md
  verify/REQ-n.md
  verify/REQ-n-TASK-k.reviews.json
  verify/REQ-n-TASK-k.r1.spec.md
  verify/REQ-n-TASK-k.r1.quality.md
  runs/checkpoints/*.json  append-only task snapshots
  runs/session-recovery.json
  truth/<domain>/spec.md
  changes/<slug>/CHANGE.md
  changes/<slug>/design.md
  changes/<slug>/deltas/<domain>.md
  changes/archive/YYYY-MM-DD-<slug>/
```

IDs never renumber. Status and blocker vocabulary: `references/model.md`.

## Project policy and enforcement

`docs/plan/config.json` is strict schema-version-1 JSON. Defaults fill missing keys, not invalid values. Unknown keys, wrong types and invalid enums fail visibly. The defaults are:

```json
{
  "schema_version": 1,
  "execution_mode": "subagent",
  "parallelism": "disjoint",
  "tdd": "required",
  "max_review_rounds": 3,
  "test_commands": [],
  "hooks": {"enabled": true}
}
```

Accepted alternatives are `execution_mode: "inline"`, `parallelism: "serial"`, `tdd: "off"`, and a review cap from 1 through 5. `test_commands` is a list of argument arrays, not shell strings. Populate it from actual project tooling; an empty list means commands have not been established. Setup/config/doctor/gates/hooks never execute these commands. Each execution still needs scope and permission checks. `workflow.md` belongs to the project and is never reset by setup.

| Deterministic stdlib checks | Coordinator/reviewer responsibilities |
|---|---|
| Strict policy validation; confined extension paths | Resolve product intent and material design choices |
| TASK/REQ readiness, lifecycle and blockers at Load | Honest readiness and complete owned AC/scenario coverage |
| Ordered review records, author/reviewer inequality | Genuinely distinct implementer, spec and quality sessions |
| Hashes of declared source files, evidence and REQ/TASK contracts | Run approved tests; truthful logs; declare the entire changed scope |
| Fresh passing records before complete/configured archive | TDD applicability, review substance and cumulative correctness |
| Conservative explicit-commit rollback preview | Review any proposed undo and obtain separate authorization |

Only REQ/TASK frontmatter `status` and `updated` are ignored when fingerprinting contracts. Changing AC, steps, changelogs, reviewed sources or evidence stales the review. Missing/deleted supplied files fail closed; deleted-file changes currently need manual handling rather than an invented replacement scope. Records are local consistency checks, **not signed provenance or a sandbox**. A fabricated identity/report can still lie, and omitted files cannot be discovered from a declared scope alone.

Inline implementation is supported, but self-review is not independent review. If the host cannot provide the required independent reviewers, retain `PENDING_INDEPENDENT_REVIEW`; do not mark work done. Per-task reviews are followed by combined-change tests and cumulative spec/quality review, then fresh complete gates for every task affected by the final snapshot. See `references/execution.md` and `references/tdd.md`.

Pipeline JSON schedules work; `run advance` does not execute skills, tests, or reviewers. `--approve`/`--no-gate` can approve ordinary scheduling pauses only. They never waive load/complete gates, review limits, configured archive checks, vet gates, or user permissions. See `pipelines/README.md`.

## Walkthrough

### 1. Set up an existing local project

The examples below use Bash/Git Bash. From the unpacked plugin directory, set `PLUGIN` once and replace `TARGET` with an **existing project directory** outside the plugin. Commands use only the shipped Python tools; no Git initialization is needed.

```bash
PLUGIN="$(pwd)"
TARGET="/absolute/path/to/your-project"
python "$PLUGIN/scripts/sdd.py" setup --repo "$TARGET" --root docs/plan --title "My project" --json
python "$PLUGIN/scripts/sdd.py" config --repo "$TARGET" --root docs/plan --json
python "$PLUGIN/scripts/sdd.py" doctor --repo "$TARGET" --root docs/plan --json
```

Rerunning setup preserves existing project/config/workflow files. Fresh `doctor` deliberately reports missing `context/platform.md`; setup reports the empty test-command list. These are unfinished onboarding, not a failed installer to work around. Use `/ultimate-sdd:context` to record verified project context, then complete `workflow.md` and applicable `test_commands` without inventing tools. Run doctor again. A valid resume report may still contain setup gaps or failing review gates: inspect those fields, not only `ok`.

### 2. Plan without building

```text
/ultimate-sdd:frame "usage limits with email alerts"
/ultimate-sdd:project
/ultimate-sdd:specify REQ-1
/ultimate-sdd:design REQ-1
/ultimate-sdd:scope REQ-1
```

Use the actual generated IDs. Design is proportionate: omit a separate sidecar when the existing pattern is obvious, or record a short rationale. Readiness 1–2 is rough, 3 is shaping, and 4–5 is eligible for building only when blockers and lifecycle also permit it. Each TASK owns observable AC plus needed tests/docs, not a horizontal layer divorced from behavior.

For existing behavior, use Explore → Propose to create a CHANGE with ADDED/MODIFIED/REMOVED deltas, then specify/scope its linked REQs. Neither a plan nor a proposal authorizes implementation by itself.

### 3. Load, build, review and verify

From the **target repository**, derive state rather than guessing:

```bash
cd "$TARGET"
python "$PLUGIN/scripts/plan.py" validate --root docs/plan
python "$PLUGIN/scripts/plan.py" next --root docs/plan --json
python "$PLUGIN/scripts/sdd.py" gate --repo "$TARGET" --root docs/plan --task REQ-1/TASK-1 --phase load --json
```

A missing/blocked/low-readiness task returns nonzero with errors; repair the contract, not the gate. `/ultimate-sdd:load` alone prepares a brief. An authorized load-and-build or Apply runs per-behavior red → green → refactor, affected regressions, then independent spec review and independent quality review in that order.

Review recording is explicit. The following is a **command-shape example**, not evidence or a recommended project test suite: replace IDs, actual session identities, existing report paths and the entire file inventory. The coordinator writes the reviewers' complete reports verbatim first.

```bash
python "$PLUGIN/scripts/sdd.py" review-record --repo "$TARGET" --root docs/plan --task REQ-1/TASK-1 --stage spec --status pass --author author-session --reviewer spec-session --evidence docs/plan/verify/REQ-1-TASK-1.r1.spec.md --files src/example.py tests/test_example.py --json
python "$PLUGIN/scripts/sdd.py" review-record --repo "$TARGET" --root docs/plan --task REQ-1/TASK-1 --stage quality --status pass --author author-session --reviewer quality-session --evidence docs/plan/verify/REQ-1-TASK-1.r1.quality.md --files src/example.py tests/test_example.py --json
python "$PLUGIN/scripts/sdd.py" gate --repo "$TARGET" --root docs/plan --task REQ-1/TASK-1 --phase complete --json
```

Use `--status fail` for a real failed/blocked review; failures remain in the runtime-owned ledger and return nonzero. Never hand-edit the ledger or restart the retry budget. An absent reviewer remains pending rather than receiving a fabricated record. Only current passing gates **and** actual AC/cumulative verification permit completion. Any substantive repair requires fresh ordered reviews.

### 4. Sync or archive deliberately

For a configured target, all linked REQs/TASKs must be done with fresh evidence before either dry-run or merge succeeds. This includes `skip_specs` changes. Confirmation cannot waive the gate.

```bash
cd "$TARGET"
python "$PLUGIN/scripts/plan.py" archive --root docs/plan --change CHANGE-1 --dry-run --move --json
# After inspecting the dry-run and authorizing archive:
python "$PLUGIN/scripts/plan.py" archive --root docs/plan --change CHANGE-1 --move --json
```

Omit `--move` from both commands for sync-only. Do not invoke the lower-level merger, move folders manually, or remove config to bypass evidence checks. Inspect resulting truth specs, update/validate the board, and preserve the history.

### 5. Recover without inventing history

```bash
python "$PLUGIN/scripts/sdd.py" checkpoint --repo "$TARGET" --root docs/plan --task REQ-1/TASK-1 --json
python "$PLUGIN/scripts/sdd.py" resume --repo "$TARGET" --root docs/plan --json
python "$PLUGIN/scripts/plan.py" handoff --root docs/plan
python "$PLUGIN/scripts/sdd.py" revert-plan --repo "$TARGET" --root docs/plan --task REQ-1/TASK-1 --json
```

Handoff output above is a read-only draft: read and preserve existing `HANDOFF.md`, then append or make targeted edits. Base `handoff --write` replaces it and is not a safe default. Checkpoints append machine records; resume does not repair files or advance status. Hooks keep their separate machine snapshot at `runs/session-recovery.json`.

Rollback is a **preview only**. Non-Git projects report it unavailable. Explicit association uses `checkpoint --commit <hex-sha> --files <exact-commit-changed-paths>` with a real task; without `--commit`, observed HEAD proves no ownership. A safe preview also needs passing scoped evidence, matching raw commit blobs, reachable non-merge commits, exclusive task ownership, comparable ancestry and a clean working tree. A checkpoint may itself make the tree dirty: do not auto-commit, ignore, stash or delete it to force eligibility. Refusals return no rollback commands. See `references/recovery.md` for REQ/CHANGE selectors and exact constraints.

## Migration from `prd`

Keep existing `docs/plan/` and `docs/prd/` artifacts and stable IDs. Namespace changes do not require renaming product PRDs, `prd-new`-style skill IDs, or templates. Review saved automation that calls `/prd:*` and update its command namespace; do not rewrite user-authored history mechanically.

A plan without `config.json` remains a **legacy unconfigured plan**. Base graph tools/examples still work, and legacy archive behavior is not certified by the new evidence system. Opt in deliberately with `/ultimate-sdd:setup` or `sdd.py setup`, inspect preserved state and strict defaults, establish context/workflow/test commands, and collect current reviews before configured archive. Setup does not invent retroactive verification or silently migrate invalid policy. For an existing `.plan/` workspace, pass `--root .plan` consistently.

## Local loading and host differences

Keep the entire unpacked tree: wrappers depend on bundled skills, references, templates and Python modules. A `.plugin` file is a reproducible ZIP distribution, not a claim that every host accepts that extension directly.

- **Claude Code:** load locally with `claude --plugin-dir "/path/to/ultimate-sdd"`, or use the host's local marketplace workflow with `.claude-plugin/marketplace.json`. The manifest registers seven agents. Default `hooks/hooks.json` autoload is used once; there is no duplicate manifest hook entry. Root `CLAUDE.md` is a maintainer reference, **not automatically loaded project context**.
- **Claude hooks:** SessionStart supplies bounded recovery context; PreCompact writes only machine-owned recovery state. They opt in through valid config with `hooks.enabled=true` at `docs/plan/`, or an existing `.plan/INDEX.md` plus config. Errors are visible but nonblocking. They do not execute tests, edit application code, overwrite authored handoff, or override permissions. Use explicit CLI resume for custom roots.
- **Codex:** `.codex-plugin/plugin.json` supplies skills and interface metadata. Equivalent custom-prompt files are under `codex/prompts/`; install/register them using the mechanism supported by your Codex release and keep the full plugin available. No invented `codex plugin add` command, automatic agent execution, or Claude-hook parity is assumed.
- **Kimi/generic hosts:** descriptors are included in `kimi.plugin.json` and `plugin.json`. Host loading syntax/capabilities vary. If plugin discovery is unavailable, point the agent at the installed `skills/orchestrator/SKILL.md` and use the same local Python tools. Explicit resume is portable; independent review still requires actual host capability.

Native manifest validation is not a live end-to-end host test. No global installation or authenticated host workflow is required by the local checks below.

## Validate and package

Run from the unpacked plugin root. The tests cover local contracts; they do not certify model compliance with prompts or a live host session.

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONUTF8=1 python -m unittest discover -s tests -v
python scripts/plan.py validate --root examples/launchpad
python scripts/plan.py validate --root examples/openspec-change
python scripts/validate_plugin.py --json
# Optional, when Claude Code is already installed:
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
```

For builds, choose an output outside the plugin tree. Packaging validates first, uses sorted ZIP members with fixed timestamps/modes, and excludes donor repositories, VCS metadata, caches, secrets, scratch/validation state, and prior archives. Rebuild after any source change.

```bash
python scripts/package_plugin.py --root . --output /path/to/output/ultimate-sdd.plugin --json
```

No OpenSpec, Rasen, Conductor or Pilot Shell executable is required. Linear export is optional and only occurs when separately requested with an available connector; local planning remains usable without it.

## License

The original base MIT license is retained in `LICENSE`. OpenSpec Plus MIT and Conductor Apache-2.0 notices are bundled under `licenses/`; see `THIRD_PARTY_NOTICES.md` for attribution, changed adaptations, and the explicit Pilot Shell exclusion.
