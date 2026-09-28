---
name: plan
description: >
  Orchestrate the full planning loop — Frame, Spec, Scope, Load, Verify —
  turning raw ideas or existing PRDs into EPICs, REQs, and AI-ready tasks
  using platform context. Use when the user wants to plan a feature, create
  a project plan, turn an idea into requirements and epics, run /ultimate-sdd:plan
  or /plan, or says "plan this", "babysitting plan", or "make this
  agent-ready".
license: MIT
metadata:
  author: andrewr303
  version: "2.2"
---

Run the persistent planning loop. You are the tech lead who gives the coding agent a map, a destination, and a course.

**Supporting files** (plugin root = `${CLAUDE_PLUGIN_ROOT}` or the directory that contains both `templates/` and `references/`):

- `references/model.md` — IDs, statuses, paths, graph
- `references/loop.md` — stages and routing
- `references/readiness.md`
- `references/questions.md`
- `references/handoff.md`
- `references/context.md`
- `references/openspec.md` — truth specs vs CHANGE folders
- `templates/*`
- `scripts/plan.py` — status, next, board, classify, run, archive
- `references/rasen.md` — pipelines, autopilot, retain
- `scripts/init_plan.py`, `scripts/validate_plan.py`, `scripts/merge_deltas.py`

Read `references/loop.md` and `references/model.md` before doing anything else.

## 1. Ground

In the **target repo** (cwd):

1. Look for `docs/plan/INDEX.md`, else `.plan/INDEX.md`.
2. If neither exists, run `python <plugin>/scripts/init_plan.py --title "<best guess>"` (or write the skeleton yourself). Ask the title if unknown.
3. Read INDEX, `project.md`, and `context/platform.md` if present.
4. If a codebase exists and `platform.md` is missing, **run the `plan-context` skill first**. Do not specify REQs against an imagined architecture.
5. Search for existing PRDs (`docs/prd/**/*.md`, `*prd*.md`) and existing briefs.

## 2. Route

Detect the input and enter the earliest incomplete stage (`references/loop.md` table). Say the route in one sentence, then execute that skill's process in this conversation — do not dump a menu and wait unless the input is genuinely ambiguous (idea vs existing PRD vs named REQ).

| Signal | Skill to execute |
|---|---|
| Messy idea, no aligned brief | `plan-frame` |
| User points at / pastes a PRD | `plan-project` (PRD is the brief) |
| "create project plan" / aligned brief, no EPICs | `plan-project` |
| REQ-n named, readiness < 4, or "specify" / "refine" | `req-specify` |
| REQ ready, no tasks, or "scope" / "break down" | `req-scope` |
| "load" / "next task" / "start building" | `task-load` |
| "verify" / "check the work" | `task-verify` |
| "board" / "status" / "what's next" / "spec tree" | `plan-board` |
| "add context" / PDF / transcript / Confluence | `plan-context` ingest |
| "push to Linear" | `plan-push` |
| "propose" / brownfield behavior change / existing `truth/` | `plan-propose` (explore first if fuzzy) |
| "apply CHANGE" / "implement the change" | `plan-apply` |
| "archive" / "sync specs" / "merge deltas" | `plan-archive` |
| "auto" / "autopilot" / "run the pipeline" | `plan-auto` |
| "goal" / "drive this metric" | `plan-goal` |
| "review cycle" | `plan-review` |
| "retain" / "lesson" | `plan-retain` |
| "handoff" / "checkpoint" | `plan-handoff` |
| "decompose" / "split this change" | `plan-decompose` |
| "from this code" as a PRD | `prd-from-code`, then offer `plan-project` on the gaps |

If the user wants the **whole loop in one sitting** ("just plan it", "idea to tasks"): Frame → (confirm brief unless they said draft) → Project → Specify the first unblocked REQ → stop at Scope unless they also said "build". Do not silently start coding.

## 3. Execute one stage fully

Each stage writes artifacts to disk and updates INDEX **in the same turn**. Then state:

- What was written (paths + IDs)
- Readiness / blockers
- **Next** (the INDEX Next line)
- Offer the next stage; do not auto-skip Spec.

## 4. Guardrails

- Local-first. Do not call BrainGrid SaaS/CLI unless the user asked.
- Never invent evidence, metrics, or API shapes. Unknown → `[assumed]` + question or recommended default (see `references/questions.md`).
- Never Load a REQ with readiness < 4.
- Never renumber IDs.
- PRD layer stays behavior-only. Implementation values live on REQs/TASKs.
- If the idea is multiple products, split into multiple EPICs before writing one bloated REQ.
- After any write, if `scripts/validate_plan.py` exists, run it against the plan root and fix ERRORs.
