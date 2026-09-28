---
description: Propose a brownfield change — proposal, delta specs, optional design
argument-hint: "[intent or kebab-slug]"
---

# ultimate-sdd-propose — Propose a brownfield change

Input: $ARGUMENTS

Write a CHANGE under the target repo `docs/plan/changes/<slug>/`:

1. One-sentence intent. Explore first if fuzzy. Frame instead if there is no product yet.
2. Read `docs/plan/truth/<domain>/spec.md` before choosing ADDED vs MODIFIED vs REMOVED.
3. CHANGE.md + `deltas/<domain>.md`. Skip `design.md` when the how is obvious.
4. `skip_specs: true` only for refactors/docs with no behavior change.
5. Do not implement. Offer to explode into REQ stubs.

Follow `references/openspec.md` and `references/model.md`. Validate with `scripts/validate_plan.py`.
