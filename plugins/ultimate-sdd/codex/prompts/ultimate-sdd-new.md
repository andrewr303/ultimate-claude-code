---
description: Create an in-depth PRD from scratch through structured discovery
argument-hint: "<feature or product idea>"
---

# ultimate-sdd-new — Create an in-depth PRD from scratch

Idea: $ARGUMENTS

You are creating a complete, in-depth PRD through structured discovery — not a form-filling exercise. If no idea was given above, ask what product or feature the user wants a PRD for.

## Template and rubric

If a `ultimate-sdd/templates/` directory exists in this repo or is referenced in AGENTS.md, read `prd-template.md`, `question-bank.md`, and `review-rubric.md` from it and follow them. Otherwise use the embedded versions below.

## Process

1. **Ground yourself.** If working in a codebase, investigate briefly: what product is this, does anything similar exist? Ask where to write the PRD; default `docs/prd/<kebab-case-name>.md`.

2. **Discovery in waves.** Ask 3–5 questions per wave; skip anything already answered or discoverable yourself; stop when answers stop changing the PRD. Wave 1 is mandatory:
   - W1 (problem): What problem, for whom, in one sentence? What do they do today? What evidence exists? Why now? What will you look at 90 days post-launch to judge success?
   - W2 (scope): What's out of scope for v1? Smallest shippable version? Primary persona? Overlapping existing features?
   - W3 (constraints): deadlines, platforms, compliance/privacy, expected scale, team limits.
   - W4 (failure): most expensive quiet failure? empty states, limits, concurrency, abuse? rollback story?
   - W5 (rollout): approvers, dependencies, ramp vs full launch, migration/deprecation.
   Then run a pre-mortem: "6 months post-launch this failed — why?" → feed Risks.
   If the user says "just draft it": proceed, marking every guess `[assumed]` and adding it to Open Questions.

3. **Draft the full PRD** with these sections (state "N/A — reason" rather than deleting Security, Privacy, Rollout, Risks):
   0. Document Control (status/version/owner/stakeholders/changelog)
   1. Executive Summary (3–6 sentences)
   2. Problem Statement (problem, evidence labeled [verified]/[inferred]/[assumed], why now, who's affected)
   3. Goals (G-1... each mapped to a metric) & Non-Goals (with reasons)
   4. Success Metrics table (ID, metric, Primary/Guardrail, baseline, target, timeframe, goal, source) — ≥1 primary AND ≥1 guardrail; unknown baseline → instrumentation task
   5. Users & Use Cases (personas, user stories, key flows incl. top unhappy paths)
   6. Requirements:
      - Functional: `FR-n: <name> (P0/P1/P2)` — "The system SHALL <observable behavior>" + ≥1 WHEN/THEN scenario each; P0s need ≥1 error/edge scenario
      - Non-functional: performance (numbers), reliability, security, privacy, accessibility, scalability, observability
      - Edge-case table (empty/limits/concurrency/offline/abuse/permissions/migration)
   7. Design & UX (links, states, copy)
   8. Technical Considerations (system context, data, APIs, constraining decisions)
   9. Dependencies table (owner, blocking?, risk if late)
   10. Rollout (phases with exit criteria, migration, kill switch/rollback)
   11. Risks table (likelihood/impact/mitigation/owner) — prioritize quiet, costly, late-detected risks
   12. Open Questions table (what it blocks, owner, needed by)

4. **Self-review before presenting.** Try to break your own draft: any goal without a metric? P0 without scenarios? Ambiguity two engineers would resolve differently? Scope contradictions? Load-bearing [assumed] with no validation plan? No guardrail metric? Missing kill switch? Ambiguity words in normative text (fast, simple, robust, gracefully, should, as needed...) — replace each with a number or concrete behavior. Fix all of these before showing the user.

5. **Deliver**: file path, one-paragraph gist, the 3–5 most consequential decisions/assumptions, and open questions needing their input.

## Guardrails

- Never invent evidence, baselines, or research — unknown data is `[assumed]` + Open Question.
- Requirements are behavior contracts: no class names or library choices in §6.
- If the idea is really multiple features, propose splitting before writing one bloated PRD.
- Every sentence must inform a decision someone will make; cut boilerplate.
