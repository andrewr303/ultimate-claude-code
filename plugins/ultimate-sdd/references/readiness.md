# Readiness scoring

Each REQ gets an integer **1–5**. Do not Scope or Load below **4**; the score never overrides separate load/authorization gates. Use `references/spec-quality.md` for context loading, coverage, and artifact review.

| Score | Meaning | Candidate next, subject to gates |
|---|---|---|
| 1–2 | Needs more definition | Frame / Specify |
| 3 | Good for discovery, not ready to build | Refine |
| 4–5 | Contract is sufficiently defined | Scope → Load |

A dimension passes only if it has no blocking gap. **Raw score = max(1, number of passing dimensions)**, so zero passing dimensions still yields 1, never 0. **Overall = min(raw score, 3) if any build-blocker remains**, otherwise raw score. Do not round up.

Derived labels (never stored separately): 1–2 = `rough`, 3 = `shaping`, 4–5 = `ready`. Show score, label, blockers, and review state separately. Re-score immediately when an answer, source, design, patch, or review finding changes the evidence.

## Five dimensions

### 1. Problem & goal

Pass when who, pain, current need, and observable "done when" are unambiguous; non-goals bound the slice. Material chosen decisions have a need/source and concise rationale.

Fail when it is a solution in search of a problem, hidden scope, or "done" would be argued.

### 2. Behavior contract

Pass when every in-scope functional behavior has a stable SHALL/MUST FR and relevant **positive, negative, and edge** GIVEN/WHEN/THEN scenarios. A genuinely inapplicable kind has a specific reason, not a blanket exemption. NFRs name a measure, threshold, and conditions.

Fail when behavior is implied, speculative, happy-path-only, or can be implemented with materially different results. Coverage applies to every FR, not just P0s.

### 3. Acceptance criteria

Pass when every FR maps through decision/source and scenario kinds to stable, observable technical AC, with full Given/When/Then and an actual verification method. Relevant negative/edge behavior must be testable, not merely mentioned in prose.

Fail when a FR has no AC, AC only restate titles, values are unmeasurable, or no reproducible check/authorized observation is known. Missing `test_commands` alone is not a failure if such an observation suffices; unknown commands/methods must not be guessed.

### 4. Context & constraints

Pass when platform context is applied to real files/APIs/types/auth/env key names and known dependencies; config validation/workflow inputs and relevant upstream/CTX/design sources are recorded. Each material decision/assumption is traceable with agreed/assumed/unresolved status and rationale. Current code inference is labeled, not promoted to truth.

Fail when the contract ignores existing modules or contradicts upstream behavior, omits applicable security/data boundaries, or claims authorization/config validation that did not occur.

### 5. Buildability

Pass when an implementer need not invent material exact values (formats, copy, tokens, API params, TTL, failure outcomes), architecture/test seams are sufficiently settled, dependencies are authorized, and migration/compatibility/rollback obligations are defined where relevant.

Fail when the contract relies on vague normative words, unknown delivered semantics, unapproved dependencies, or load-bearing assumptions disguised as decisions. Safe reversible defaults need source/rationale/boundary; critical unknowns cannot be handwaved as `[assumed]` to earn a pass.

## Build-blockers and separate gates

Regardless of passing dimension count, cap at **3** for any unresolved build-blocker, including:

- Any FR missing relevant scenario/AC coverage, or material scope/architecture/contract ambiguity.
- Critical security/privacy/access, data ownership/loss, delivery/retry/partial-result semantics left unknown.
- Missing applicable error/rollback/migration behavior or a contradicted/unread platform contract.
- A new library addition/replacement without user/host authorization, or another required permission not granted.
- Unresolved setup/config/tooling that prevents choosing an authorized implementation or verification method.
- Material unresolved planning-review findings, including overflow not yet assessed.

Record blockers both as concise `readiness_gaps` and in the REQ's Readiness block with their source, impact, and next resolution. Do not raise readiness by deleting scope, inventing a test result, treating silence as approval, or calling an assumption "agreed".

Load gates are separate from the numeric score: unfinished graph dependencies, lifecycle, task context/AC completeness, authorization, and review state still apply. Unperformed artifact review is **pending**; a self-check is not independent review and does not clear an independent-review gate. Pending review is not a sixth score dimension or a claimed pass. Material findings block even if all five dimensions otherwise pass.

For `in-progress`, `review`, or `done` REQs, re-score without moving them back to `ready`; flag stale downstream contracts/evidence for an authorized follow-up. Do not reactivate cancelled work. For planning states use the established status vocabulary and dependency rules in `references/model.md`.

## Section coverage and effort

After Specify show coverage, not a second score:

| Section | State |
|---|---|
| Each FR → decision/source → positive/negative/edge → AC | defined / justified N/A branch / gap |
| UI Layout | defined / no UI (infrastructure-only) / gap |
| Architecture / design link | settled pattern / linked design / unresolved decision |
| Env & config / workflow | grounded / missing / invalid / pending validation |
| Acceptance criteria and verification | defined / gap |
| Artifact review | pass / needs-work / pending; independence stated |

A section is defined only when material values and sources are present. `effort: low|med|high` estimates implementation size independently of readiness.

## Accept / reject patches

Refine offers concrete patches for real gaps: **Accept / Reject / Edit**, **Accept all / Reject all / Save** when interactive input is appropriate. Honor prior authorization without repeated ceremony. Rejected material changes remain gaps. "Accept all" or "make it 5/5" is not permission to invent values, override host controls, or accept undisclosed dependency changes. Safe draft defaults remain `[assumed]`; apply `references/questions.md` in auto mode. Saving a draft below 4 is valid.

## Infrastructure-only REQs

No UI screens means **UI Layout is inapplicable**, not that architecture/design is skipped. Assess boundaries, auth, types, data, failures, migration and test seams where relevant. An obvious existing pattern needs only a short rationale; meaningful uncertainty can use `plan-design`. Keep all five dimensions.
