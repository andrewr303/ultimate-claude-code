---
name: plan-project
description: >
  Create a project plan of EPICs and sequenced REQs (also shown as a
  SPEC tree with Rough/Shaping/Ready and Low/Med/High effort) from an
  aligned brief or PRD. Use when the user says create project plan,
  shape this into specs, explode a spec, or runs /ultimate-sdd:project.
license: MIT
metadata:
  author: andrewr303
  version: "2.0"
---

Explode a destination (brief or PRD) into a buildable graph. You are writing stubs, not full specs.

**Supporting files:** `references/model.md`, `references/loop.md`, `templates/epic-template.md`, `templates/req-template.md`, `templates/index-template.md`.

## Input

- An aligned `BRIEF-n`, or
- A PRD path (`docs/prd/…`), or
- A CHANGE-n / `changes/<slug>/` (brownfield: one REQ per ADDED/MODIFIED requirement), or
- Brief + PRD (PRD wins on goals/FRs; brief wins on tone/one-liner)

If none of those exists, run `plan-frame` first. For a fuzzy edit to existing behavior, run `plan-propose` first.

Read `platform.md` if present. Sequence work so it fits the real architecture (e.g. API client before pages that call it).

## Steps

### 1. Slice

Decide EPIC count:

- One destination / one v1 product → **one EPIC**, 2–5 REQs
- Multiple independent outcomes in the PRD → one EPIC per outcome
- Never one REQ that is the entire product

REQ shape (tracer-bullet, sequential by default):

1. Foundation — whatever unblocks the rest (scaffold, client, auth, schema)
2. Primary user-visible slice
3. Detail / secondary slice
4. Only add more if the PRD's P0s demand a separate verifiable increment

Each REQ:

- Builds something you can verify alone
- Has a title a human can say out loud
- Lists `blocked_by` the previous REQ unless truly independent
- Starts at `status: idea`, `readiness: 1`, `effort: low|med|high` (estimate now; refine later)
- `spec:` alias — EPIC → `SPEC-1`, REQs → `SPEC-2`… in order
- Maps back to PRD FR/G IDs in the stub body when a PRD exists
- When sourced from a CHANGE: `change: CHANGE-n` on each REQ; CHANGE `reqs:` updated in the same turn

### 2. Write files

- `epics/EPIC-<n>-<slug>.md` from `templates/epic-template.md`
- `reqs/REQ-<n>-<slug>.md` — short stub: Overview (3–5 lines), Problem, Out of scope, empty AC, `readiness_gaps: ["not specified"]`
- Do **not** fill the full spec here. That is `req-specify`.

Set mutual `blocked_by` / `blocks`. First REQ has no blocker and is the one INDEX will tell them to Specify.

### 3. Confirm as a SPEC tree

Show both the BrainGrid table and the Plansmith tree:

```
SPEC-1  <epic title>                         shaping · <effort>
  SPEC-2  REQ-1 · <title>                    rough   · <effort>   ready to start
  SPEC-3  REQ-2 · <title>                    rough   · <effort>   needs first: SPEC-2
  SPEC-4  REQ-3 · <title>                    rough   · <effort>   needs first: SPEC-3

0 of N specs Ready.
Next: Specify REQ-1 (SPEC-2).
```

Ask: Specify REQ-1 now? (Recommended yes.)

When a later answer changes sequencing or effort, rewrite the tree and re-score in the same turn.

Ask: Specify REQ-1 now? (Recommended yes.)

### 4. Index

Rebuild INDEX board + graph. Project status → `active`. Next = `Specify REQ-1`.

Run `python <plugin>/scripts/validate_plan.py --root docs/plan` and fix ERRORs.

## From-PRD mapping

| PRD | Plan |
|---|---|
| §3 Goals / a theme of FRs | EPIC |
| P0 FR or tightly bound FR cluster | REQ |
| P1/P2 | later REQ or Out of scope of v1 EPIC |
| NFR that needs work | its own REQ if it is a deliverable; else a Constraints section on the first REQ |
| ⚠ GAP from as-built PRD | REQ titled as the gap |

Preserve PRD IDs in a "Source" line on each REQ (`FR-3, FR-4`).

## Guardrails

- Do not specify (full AC, exact tokens) in this skill.
- Do not start building.
- Do not flatten a PRD into one REQ "so it's simpler".
- If the PRD is internally contradictory, stop and send them to `prd-improve` instead of encoding the contradiction.
