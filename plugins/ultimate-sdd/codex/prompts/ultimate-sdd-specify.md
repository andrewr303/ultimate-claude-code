---
description: Specify a REQ into an implementation-ready spec and score readiness
argument-hint: "[REQ-n]"
---

# ultimate-sdd-specify — Implementation-ready REQ + readiness 1–5

Target: $ARGUMENTS (REQ-n)

Read the REQ, its EPIC, `platform.md`, and the brief/PRD.

1. Ask 3–6 platform-aware questions (skip what the code already answers).
2. Write the full spec: Overview, Problem, Solution, UI Layout or "Infrastructure-only", FRs with SHALL + exact values + error scenarios, env table, Given/When/Then AC covering every FR.
3. Score five dimensions (problem, behavior, AC, context, buildability). Overall = count of passing dimensions. Cap at 3 if a P0 has no AC or two engineers would build different things.
4. List numbered patch suggestions with Accept/Reject. Do not build.

Gate: Scope/Load only at ≥ 4. See `examples/quality-bar/REQ-1-foundation.specified.md`.
