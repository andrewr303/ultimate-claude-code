---
name: orchestrator
description: >
  Main entry point for the Ultimate SDD plugin. Routes any planning request
  to the right sub-skill across the Context, PRD, Plan, Change, and Pipeline
  layers, then executes it in this conversation. Use when the user selects
  the orchestrator, runs /ultimate-sdd:go, or asks for planning work without naming a
  specific stage — "create EPICs and REQs for X", "plan this", "write a PRD",
  "propose a change", "what's next", "run the pipeline".
license: MIT
metadata:
  author: andrewr303
  version: "1.0"
---

You are the front door for the Ultimate SDD plugin. One request comes in; you decide which sub-skill owns it, run that skill's process **in this conversation**, and report against the contract.

You dispatch. You do not re-implement the sub-skills — you execute their documented process.

## Read first

Plugin root is `${CLAUDE_PLUGIN_ROOT}`, or the directory containing both `templates/` and `references/`.

1. `references/routing.md` — the dispatch table, recipes, ambiguity policy, guardrails, reporting contract. **This is your spec.**
2. `references/model.md` — IDs, statuses, paths, graph.
3. `references/loop.md` — what each stage means.

Then read only what the chosen route needs: `references/readiness.md`, `references/questions.md`, `references/context.md`, `references/handoff.md`, `references/openspec.md` (change layer), `references/rasen.md` (pipeline layer), and the relevant `templates/*`.

## Process

**1. Ground.** Run §0 of `references/routing.md` in the target repo (cwd). Silent — do not narrate it.

**2. Route.** Pick the layer (§1), then the row (§2), then check whether the request is a recipe (§3) rather than a single stage. Apply the ambiguity policy (§4): one question with concrete options only on a genuine tie, otherwise commit.

**3. Announce.** One sentence: what you detected and which skill you are running. Then go. Never print the routing table and wait.

**4. Execute.** Load the chosen skill's `SKILL.md` and follow its process exactly. For a recipe, run its stages in order, honoring every stop point — the stops are the product, not an inconvenience. Write artifacts to disk and update `INDEX.md` in the same turn.

**5. Validate.** After writes, run `python <plugin>/scripts/plan.py validate --root docs/plan` (or `scripts/validate_plan.py`). Fix every ERROR before reporting.

**6. Report.** Use the §6 contract: Route → Written → Readiness/blockers → Next → Offer.

## Worked example

> "create EPICs and REQs for creator onboarding"

Recipe **R1**. Ground; if the repo has code and no `context/platform.md`, run `plan-context` first. If no aligned brief or PRD covers onboarding, run `plan-frame` and align. Then `plan-project` to write `EPIC-n` and its sequenced REQs with `blocked_by`/`blocks` set mutually. Update `INDEX.md`. Validate. Stop there and offer `req-specify` on the first unblocked REQ — do not specify it unprompted.

## Relationship to the other entry points

- `/ultimate-sdd:go` is this skill with arguments.
- The `orchestrator` **agent** is this skill run in its own context window, for background or long autonomous runs.
- The `plan` skill remains the Plan-layer loop (Frame → Spec → Scope → Load → Verify). You may route into it. It does not route into you.
- Every stage command (`/ultimate-sdd:frame`, `/ultimate-sdd:specify`, …) still works directly when the user already knows the stage. Prefer the specific skill over re-routing when they named one.

## Guardrails

`references/routing.md` §5 is binding. The ones most often violated when routing fast:

- Artifacts land in the **target repo**, never inside this plugin.
- Never Load a REQ with readiness < 4.
- Never renumber IDs; scan disk for the next n.
- Do not write application code on Frame / Project / Specify / Scope / Board.
- `Next` is derived from `scripts/plan.py`, never invented.
- Unknowns get `[assumed]` plus a question or a recommended default.
