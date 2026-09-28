# PRD: <Product / Feature Name>

<!-- HOW TO USE THIS TEMPLATE
Every section has a purpose comment. Delete comments in the final PRD.
Sections marked (OPTIONAL) may be removed if genuinely not applicable —
but state "N/A — <reason>" rather than silently deleting for: Security,
Privacy, Rollout, and Risks.
Requirement IDs (FR-1, NFR-1...) are stable — never renumber, only append.
-->

## 0. Document Control

| Field | Value |
|---|---|
| Status | Draft / In Review / Approved / Shipped |
| Version | 0.1 |
| Owner | <name> |
| Stakeholders | <eng lead, design, data, legal, ...> |
| Last updated | YYYY-MM-DD |
| Target release | <milestone / quarter> |
| Links | <design files, tickets, related PRDs, tech spec> |

### Changelog
| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | YYYY-MM-DD | <name> | Initial draft |

---

## 1. Executive Summary
<!-- 3-6 sentences. A director who reads ONLY this section should understand:
what we're building, for whom, why now, and how we'll know it worked. -->

## 2. Problem Statement

### 2.1 The Problem
<!-- The user/business pain in concrete terms. Quantify where possible:
"X% of users abandon at step Y", "support receives N tickets/week about Z". -->

### 2.2 Evidence
<!-- Data, research, support tickets, interviews, competitive pressure.
Label each item: [verified] (measured), [inferred] (derived), [assumed] (belief).
An assumption load-bearing to the whole PRD must have a validation plan. -->

### 2.3 Why Now
<!-- What changed? Cost of delay? Window of opportunity? -->

### 2.4 Who Is Affected
<!-- Personas / segments, with rough sizing. Primary vs secondary users. -->

## 3. Goals & Non-Goals

### 3.1 Goals
<!-- Each goal MUST map to at least one success metric in §4.
Number them: G-1, G-2... -->
- **G-1**: <goal>
- **G-2**: <goal>

### 3.2 Non-Goals
<!-- Explicitly out of scope, WITH the reason. Non-goals prevent scope creep
and settle debates before they start. -->
- <non-goal> — <why it's excluded>

### 3.3 Future Considerations (OPTIONAL)
<!-- Things intentionally deferred, likely revisited. Distinct from non-goals. -->

## 4. Success Metrics

| ID | Metric | Type | Baseline | Target | Timeframe | Maps to Goal | Source |
|---|---|---|---|---|---|---|---|
| M-1 | <metric> | Primary | <current> | <target> | <e.g., 90 days post-launch> | G-1 | <dashboard/query> |
| M-2 | <metric> | Guardrail | <current> | must not regress > X% | | — | |

<!-- Rules:
- ≥1 Primary metric (proves the goal), ≥1 Guardrail metric (catches harm).
- Every metric needs a baseline. If baseline unknown, add instrumentation task.
- "Engagement goes up" is not a metric. "D7 retention +2pp" is. -->

## 5. Users & Use Cases

### 5.1 Personas
<!-- For each: who they are, context of use, what they need, current workaround. -->

### 5.2 User Stories / Jobs-to-be-Done
<!-- US-1: As a <persona>, I want <capability> so that <outcome>. -->

### 5.3 Key User Flows
<!-- Walk the happy path AND the top 2-3 unhappy paths step by step.
Use diagrams (ASCII or linked) for anything with branches. -->

## 6. Requirements

<!-- The heart of the PRD. Rules:
- Use SHALL/MUST for normative requirements. Avoid "should"/"may"/"ideally".
- Every functional requirement gets ≥1 testable scenario (WHEN/THEN).
- Priority: P0 = launch-blocking, P1 = fast-follow, P2 = nice-to-have.
- IDs are permanent. Never renumber. -->

### 6.1 Functional Requirements

#### FR-1: <Requirement name> (P0)
The system SHALL <observable behavior>.

- **Scenario: <name>**
  - WHEN <condition / user action>
  - THEN <expected observable outcome>
- **Scenario: <error case>**
  - WHEN <failure condition>
  - THEN <expected handling — message, retry, fallback>

#### FR-2: <Requirement name> (P1)
...

### 6.2 Non-Functional Requirements

<!-- Cover each; write "N/A — <reason>" if truly not applicable. -->

#### NFR-1: Performance
<!-- Latency budgets (p50/p95/p99), throughput, payload sizes, cold start. -->

#### NFR-2: Reliability & Availability
<!-- SLO/uptime, degradation behavior, data durability, recovery targets. -->

#### NFR-3: Security
<!-- AuthN/AuthZ model, data classification, threat considerations, secrets. -->

#### NFR-4: Privacy & Compliance
<!-- PII handling, retention, consent, GDPR/CCPA/HIPAA as applicable. -->

#### NFR-5: Accessibility
<!-- WCAG level, keyboard nav, screen readers, i18n/l10n. -->

#### NFR-6: Scalability
<!-- Expected load at launch / 12 months. What breaks first? -->

#### NFR-7: Observability
<!-- What must be logged/traced/alerted for this to be operable? -->

### 6.3 Edge Cases & Error States
<!-- Enumerate: empty states, limits/quotas, concurrency, offline, partial
failure, abuse/misuse, permission-denied, migration of existing data. -->

| # | Edge case | Expected behavior | Covered by |
|---|---|---|---|
| E-1 | <case> | <behavior> | FR-x |

## 7. Design & UX (OPTIONAL for pure backend)

- Links to mocks/prototypes: <figma/...>
- Content/copy guidelines: <voice, key strings, error messages>
- Empty / loading / error state designs: <links>
- Platform notes (mobile / desktop / responsive): <...>

## 8. Technical Considerations

<!-- NOT a full tech spec — capture what product decisions depend on. -->

### 8.1 System Context
<!-- Where this sits in the architecture. A small diagram helps. -->

### 8.2 Data
<!-- New entities, ownership, migrations, retention, analytics events. -->

### 8.3 APIs & Integrations
<!-- New/changed endpoints or contracts, third-party dependencies, rate limits. -->

### 8.4 Key Technical Decisions & Constraints
<!-- Decisions already made that constrain implementation, with rationale.
Format: Decision → Why → Alternatives rejected. -->

## 9. Dependencies

| ID | Dependency | Type | Owner | Status | Risk if late |
|---|---|---|---|---|---|
| D-1 | <team/system/vendor> | Blocking / Soft | <owner> | <status> | <impact> |

## 10. Rollout & Launch Plan

### 10.1 Phasing
<!-- Phases with entry/exit criteria. E.g.:
Phase 0: Internal dogfood — exit: 0 P0 bugs for 1 week
Phase 1: 5% ramp — exit: guardrail metrics flat
Phase 2: GA -->

### 10.2 Migration & Backwards Compatibility
<!-- Existing users/data affected? Deprecations? Grace periods? -->

### 10.3 Kill Switch / Rollback
<!-- How do we turn this off? What's the blast radius of rollback? -->

### 10.4 Go-to-Market (OPTIONAL)
<!-- Announcement, docs, support training, pricing/packaging changes. -->

## 11. Risks & Mitigations

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R-1 | <risk> | H/M/L | H/M/L | <mitigation or accepted> | <name> |

<!-- Prioritize quiet, costly, late-detected risks — the ones nobody notices
until they're expensive. Loud, cheap, instantly-caught failures need less ink. -->

## 12. Open Questions

| ID | Question | Blocks | Owner | Needed by | Status |
|---|---|---|---|---|---|
| Q-1 | <question> | FR-x / launch / nothing | <name> | <date/phase> | Open |

<!-- Only genuinely deferrable unknowns. If the answer would change the
requirements or the approach, it's not an open question — resolve it now. -->

## 13. Appendix (OPTIONAL)
<!-- Research raw data, competitive analysis, glossary, meeting notes. -->
