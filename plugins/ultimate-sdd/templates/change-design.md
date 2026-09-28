# Design — <REQ or CHANGE title>

No frontmatter `id`: this is a sidecar, not a graph artifact. Use the existing CHANGE folder's `design.md` or `reqs/REQ-n-design.md`. Keep it proportionate; link requirements rather than duplicate them.

## Target and sources

- Target: <existing REQ-n or CHANGE-n and resolved path under the target plan root>
- Upstream: <proposal / brief / EPIC / REQ / deltas / truth paths and relevant FR/AC/scenario links>
- Evidence: <platform / CTX / needed source or manifest paths; verified/inferred/assumed labels>
- Config / workflow: <validated effective config and workflow paths/results; missing/invalid inputs stay pending>
- Existing design / decisions: <links and decisions preserved by this patch>

## Context

<Constraints and actual technical uncertainty. No UI is not a reason to skip architecture. An obvious existing pattern needs only a short rationale, not invented alternatives.>

## Goals / Non-Goals

**Goals:**

- <what this design must achieve within the existing contract>

**Non-Goals:**

- <explicitly excluded behavior or architecture work>

## Options

<Compare 2–3 meaningful options only if there is a real choice; otherwise name the existing pattern and why it suffices.>

| Option | Evidence / constraints | Benefit / cost / risk | Disposition and rationale |
|---|---|---|---|
| <real option> | <source> | <material tradeoff> | <selected, rejected with reason, or unresolved candidate> |

## Selected architecture

- Boundaries / interfaces: <responsibilities, contracts and integration seams>
- Data flow / ownership: <state owner, storage/access scope, transitions and concurrency where relevant>
- Dependencies: <existing manifest options; addition/replacement needs actual user/host authorization before acceptance, never install here>

## Decisions

D-n labels are local, stable, and not graph IDs. Status is `agreed|assumed|unresolved`. Record actual sources, not manufactured acceptance. A changed decision preserves the earlier rationale and explains the correction.

| Decision | Source / evidence | Affected FR / AC / delta | Status | Rationale / accepted tradeoff / rejected alternative |
|---|---|---|---|---|
| D-1: <choice> | <decision or source pointer> | <contract links> | unresolved | <why, tradeoff, alternative rejected and why; safe boundary for any assumption> |

## Failure behavior

<Error/denial, retry limits, idempotency, partial results and recovery as relevant; link the governing FR/AC/delta. Critical unknowns block, not an assumed success path.>

## Security and privacy

<Access boundaries, tenant/auth isolation, sensitive data exposure/retention, validation, and env key names only.>

## Migration and compatibility

<Existing data/API/client compatibility, migration sequencing and preservation checks.>

## Rollout and rollback

<Activation/rollout conditions, rollback triggers and reversible steps, or why reversal is not possible and the accepted mitigation. No git mutation instructions.>

## Testing strategy

<Test seams, relevant positive/negative/edge checks, isolation/fixtures, reproducible methods from config/workflow/repo evidence and expected results. Describe later testing, do not run it here.>

## Risks / Trade-offs

- <material risk> — <mitigation or actual accepted tradeoff and source>

## File changes

| File / surface | Planned change | Integration seam / ownership / sequencing |
|---|---|---|
| <existing or needed path> | <why> | <provider/consumer and overlap constraints> |

## Open questions and assumptions

- <source, unresolved question or bounded assumed candidate, rationale and next resolution>
- Build-blockers: <scope/architecture/authorization/security/data gaps; linked REQ readiness at most 3 while unresolved>
- Contract conflicts: <needed Propose/Specify correction; never silently rewrite requirements>

Use `N/A — <specific reason>` only for genuinely inapplicable concerns, not as a blanket exemption. A short design is valid when it resolves the actual uncertainty.

## Artifact review

- State: <pass|needs-work|pending; report path/round and actual independence>
- Unreviewed delta / follow-up: <remaining findings, stale downstream contracts/evidence, or pending independent review after self-check>

Design completion is not implementation completion, TASK evidence, or authorization to build.
