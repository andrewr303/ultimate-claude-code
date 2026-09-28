# PRD Review Rubric

Score each dimension 0–10. Overall = weighted average. A PRD is
**launch-ready at ≥ 8.0 overall with no dimension below 6**.

Severity levels for findings:
- **CRITICAL** — would cause wrong thing to be built, or launch to fail. Must fix.
- **WARNING** — likely to cause churn, rework, or ambiguity mid-build. Should fix.
- **SUGGESTION** — polish. Nice to fix.

| # | Dimension | Weight | What 9–10 looks like | What 0–3 looks like |
|---|---|---|---|---|
| 1 | Problem clarity | 1.5 | Quantified pain, evidence labeled verified/inferred/assumed, clear "why now" | Solution in search of a problem; no evidence |
| 2 | Goals & non-goals | 1.0 | Numbered goals each mapped to a metric; non-goals with reasons | Vague aspirations; no exclusions stated |
| 3 | Success metrics | 1.5 | Primary + guardrail metrics with baselines, targets, timeframes, data sources | "Improve engagement"; no baselines |
| 4 | Requirement completeness | 1.5 | All user flows covered; every FR has ≥1 WHEN/THEN scenario incl. error paths | Happy path only; features implied but unwritten |
| 5 | Requirement precision | 1.5 | SHALL/MUST language; testable; no ambiguous adjectives ("fast", "simple", "intuitive") | Untestable prose; "should probably" |
| 6 | Edge cases & error states | 1.0 | Empty/limit/concurrent/offline/abuse/permission cases enumerated with behaviors | Not considered |
| 7 | NFRs (perf, security, privacy, a11y, scale, observability) | 1.0 | Each addressed or explicitly N/A with reason | Absent |
| 8 | Rollout & reversibility | 0.75 | Phases with exit criteria, migration plan, kill switch | "Ship it" |
| 9 | Risks & dependencies | 0.75 | Quiet/costly/late-detected risks identified with owners and mitigations | Empty or boilerplate risks |
| 10 | Internal consistency & traceability | 0.5 | Goals↔metrics↔requirements↔scope all agree; stable IDs; no contradictions | Sections contradict each other |

## Automatic CRITICAL triggers (regardless of scores)

1. A goal with no corresponding metric, or a metric mapped to no goal.
2. A P0 requirement with zero scenarios.
3. An ambiguity that two reasonable engineers would resolve differently.
4. Scope contradiction (something both in-scope and non-goal, or a flow that
   references a capability not required anywhere).
5. A load-bearing [assumed] claim with no validation plan.
6. No guardrail metric (nothing catches harm).
7. Privacy/security marked absent for a feature touching user data.
8. No rollback/kill-switch story for a user-facing behavioral change.

## Ambiguity word list (flag every occurrence in normative text)

fast, slow, easy, simple, intuitive, seamless, robust, flexible, scalable
(without numbers), user-friendly, appropriate, reasonable, efficient, soon,
quickly, etc., and/or, as needed, if possible, should (in a requirement),
handle gracefully (without saying how), support (without defining behavior).

## Report format

```markdown
# PRD Review: <title>

## Scorecard
| Dimension | Score | Notes |
|---|---|---|
| ... | x/10 | one-line justification |
**Overall: X.X / 10 — <verdict: Launch-ready / Needs revision / Needs rework>**

## CRITICAL (n)
- [C-1] §<section>: <finding>. → Fix: <specific action>.

## WARNING (n)
- [W-1] §<section>: <finding>. → Fix: <specific action>.

## SUGGESTION (n)
- [S-1] ...

## What's strong
<2-4 bullets — reviewers who only criticize get ignored>
```

Every finding must cite a section and give a concrete fix. "Consider
clarifying" is banned; write the clarified sentence instead.
