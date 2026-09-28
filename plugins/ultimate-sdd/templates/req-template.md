---
id: REQ-1
title: <name>
epic: EPIC-1
spec: SPEC-2
status: idea
readiness: 1
effort: med
readiness_gaps: []
blocked_by: []
blocks: []
priority: P0
source:
change:
stack:
linear:
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# REQ-1 — <Name>

## Overview

<What this REQ builds, for whom, on which existing platform, and the observable outcome.>

## Problem Statement

<Current need/workaround and why this slice matters. Name dependent outcomes when relevant.>

## Solution

<The approach constrained by platform and upstream behavior. Preserve material accepted facts/tradeoffs, not all analysis.>

## Planning inputs

- Upstream: <project / brief / PRD / EPIC / linked CHANGE, deltas and truth paths>
- Context: <catalog, platform and relevant CTX paths/sections>
- Config: <plan-root/config.json; sdd.py config validation result or pending/error; relevant effective settings>
- Workflow: <plan-root/workflow.md; conventions and verification-method source, or missing>
- Design: <optional reqs/REQ-n-design.md / changes/slug/design.md; settled pattern or unresolved architecture>

## Source and decision trace

D-n labels are stable local decisions, not graph IDs. Status is `agreed|assumed|unresolved`; agreement requires an actual decision source. Preserve IDs on refinement.

| Decision | Source / evidence | Status | Affected FR / AC | Rationale / safe default and boundary |
|---|---|---|---|---|
| D-1: <choice> | <user decision or path:section; verified/inferred/assumed> | unresolved | FR-1 / AC-1 | <why; accepted tradeoff; unsafe unknowns remain blockers> |

## UI Layout

<Regions, exact primary copy, empty/error/loading states, and deliberately absent UI. If infrastructure-only: "Infrastructure-only — no UI screens." Separately assess architecture; no UI does not skip design.>

## Functional Requirements

### FR-1: <Name>

The system SHALL <observable technical behavior>.

- Decision/source: <D-1 and source pointer>
- Exact contract values: <applicable copy, header/ID formats, API params, TTL and failure outcomes, grounded in evidence>

#### Scenario: positive — <name>
- GIVEN <precondition>
- WHEN <action>
- THEN <observable result with exact contract values>

#### Scenario: negative — <name>
- GIVEN <invalid/denied/failure precondition>
- WHEN <action>
- THEN <specific error/result and unchanged state or retry rule>

#### Scenario: edge — <name>
- GIVEN <boundary/empty/transition precondition>
- WHEN <action>
- THEN <exact boundary outcome>

<Append FR IDs as needed; never renumber. Every FR needs all relevant scenario kinds. Replace a genuinely inapplicable kind only with "N/A — <specific reason>"; do not create speculative behavior to fill the template.>

## Non-functional requirements

| Concern | Measure / threshold | Conditions | Verification method / source |
|---|---|---|---|
| <applicable reliability/performance/security constraint> | <exact measurable limit> | <load/data/environment> | <actual tooling or reproducible authorized observation; justified N/A if inapplicable> |

## Constraints from platform

- Auth / access / ownership: <existing scheme, exact header, env key names, scoped data and evidenced failure behavior>
- API / types: <actual endpoints, params, schema/interfaces and source paths>
- Cache: <scope/isolation, exact TTL and invalidation source; or justified N/A>
- Files to extend, not reinvent: <existing paths and integration seams>
- Dependencies: <existing manifest choices; any addition/replacement and actual authorization or blocker>
- Compatibility / migration / rollout / rollback: <contract or design pointer; justified N/A where applicable>

## Env & config

| Key | Required | Where documented | Notes |
|---|---|---|---|
| <KEY> | yes | `.env.example` | key names only, never secret values |

## Out of scope

- <item> — <why excluded / owning REQ>

## Acceptance Criteria

Every FR maps to observable technical AC covering its relevant positive, negative and edge behavior. Keep stable AC IDs and full Given/When/Then text; later TASKs copy their owned criteria verbatim.

- **AC-1** Given <precondition>, When <action>, Then <exact positive observable>
- **AC-2** Given <failure precondition>, When <action>, Then <exact negative observable>
- **AC-3** Given <boundary precondition>, When <action>, Then <exact edge observable>

## Coverage

| FR | Decision / source | Scenario kinds (positive / negative / edge or justified N/A) | AC IDs | Verification method / source |
|---|---|---|---|---|
| FR-1 | D-1 / <source> | <scenario names and any specific N/A reasons> | AC-1, AC-2, AC-3 | <actual method and expected outcome> |

## Readiness

| Dimension | Pass? | Gap |
|---|---|---|
| Problem & goal | | |
| Behavior contract | | |
| Acceptance criteria | | |
| Context & constraints | | |
| Buildability | | |

**Score: n/5** — max(1, passing dimensions); any build-blocker caps at 3.

- Build-blockers: <source, impact and next resolution for each; "none" only when evidenced>
- Separate load gates: <dependencies, lifecycle, authorization, task completeness, review state>
- Artifact review: <pass|needs-work|pending; actual independence/round/report path; self-check is not independent>
- Stale downstream contracts/evidence: <affected TASKs or prior proof; do not reset in-progress/review/done lifecycle>

## Changelog

| Date | Change |
|---|---|
| YYYY-MM-DD | Initial specify |
