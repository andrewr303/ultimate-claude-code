# Project Plan — Launchpad — Rocket Launch Tracker

| Field | Value |
|---|---|
| Status | active |
| Brief | BRIEF-1 aligned |
| PRD | — |
| Platform context | present (greenfield + LL2) |
| Context sources | 2 |
| Ready specs | 0 of 3 |
| Updated | 2026-08-16 |

## Next

Specify REQ-1 / SPEC-2 (unblocked, rough 1/5).

## Spec tree

```
SPEC-1  EPIC-1 Launchpad                              shaping · high
  SPEC-2  REQ-1 Foundation & LL2 client               rough   · med    ready to start
  SPEC-3  REQ-2 Launches list + filters               rough   · med    needs first: SPEC-2
  SPEC-4  REQ-3 Launch detail                         rough   · low    needs first: SPEC-3
```

## Board

### Plan

| ID | Title | Status | Ready | Notes |
|---|---|---|---|---|
| EPIC-1 | Launchpad — Rocket Launch Tracker | ready | — | 3 requirements |
| REQ-1 | Project foundation & Launch Library 2 API integration | idea | 1/5 | Ready to start · Specify |
| REQ-2 | Upcoming launches list with location & provider filters | blocked | 1/5 | 1 blocked by REQ-1 |
| REQ-3 | Launch detail page | blocked | 1/5 | 1 blocked by REQ-2 |

### Build

| ID | Title | Tasks | Progress |
|---|---|---|---|
| — | — | — | — |

### Published

| ID | Title | Verified | Evidence |
|---|---|---|---|
| — | — | — | — |

## Graph

```
EPIC-1 Launchpad — Rocket Launch Tracker
  REQ-1 Project foundation & LL2 API integration (idea · 1/5)
    (no tasks yet)
  REQ-2 Upcoming launches list (blocked by REQ-1 · 1/5)
  REQ-3 Launch detail page (blocked by REQ-2 · 1/5)
```

## Registry

| ID | File | Status |
|---|---|---|
| PROJECT | examples/launchpad/project.md | active |
| PLATFORM | examples/launchpad/context/platform.md | — |
| CTX-1 | examples/launchpad/context/plan/CTX-1-brief-decisions.md | plan/business |
| BRIEF-1 | examples/launchpad/briefs/BRIEF-1-launchpad.md | aligned |
| EPIC-1 | examples/launchpad/epics/EPIC-1-launchpad.md | ready |
| REQ-1 | examples/launchpad/reqs/REQ-1-foundation.md | idea |
| REQ-2 | examples/launchpad/reqs/REQ-2-launches-list.md | blocked |
| REQ-3 | examples/launchpad/reqs/REQ-3-launch-detail.md | blocked |
| TASK-1 | examples/launchpad/tasks/REQ-1/TASK-1-scaffold.md | planned (example) |
| TASK-2 | examples/launchpad/tasks/REQ-1/TASK-2-ll2-client.md | blocked (example) |
| TASK-3 | examples/launchpad/tasks/REQ-1/TASK-3-landing.md | blocked (example) |
