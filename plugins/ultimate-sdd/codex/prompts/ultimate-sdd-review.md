---
description: Review and score a PRD against a 10-dimension rubric
argument-hint: "<path to PRD>"
---

# ultimate-sdd-review — Score and critique a PRD

Target: $ARGUMENTS

Review a PRD like a rigorous, kind staff-level reviewer. **Review only — do not edit the document.** If no path was given, search for likely PRD files and ask the user to confirm.

If `ultimate-sdd/templates/review-rubric.md` exists in this repo, read and follow it; otherwise use the embedded rubric below.

## 1. Read adversarially

Pass 1: understand the proposal. Pass 2: try to break it —
- Pick 3 requirements: could two reasonable engineers build different things from each? Yes → CRITICAL ambiguity.
- Walk the rollout plan as launch day: what's unaccounted for?
- Which quiet, costly, late-detected failure does this PRD not defend against?
- Check traceability: goals ↔ metrics ↔ requirements ↔ non-goals; orphans/contradictions are findings.
- Flag ambiguity words in normative text: fast, simple, intuitive, seamless, robust, scalable (no numbers), appropriate, reasonable, soon, as needed, should, handle gracefully.
- If a codebase is present, sanity-check §Technical claims against reality.

Automatic CRITICALs: goal without metric (or vice versa); P0 with no scenario; two-engineer ambiguity; scope contradiction; load-bearing assumption without validation plan; no guardrail metric; missing privacy/security for data-touching features; no rollback story.

## 2. Score

0–10 per dimension, weighted: problem clarity ×1.5, goals & non-goals ×1.0, metrics ×1.5, requirement completeness ×1.5, requirement precision ×1.5, edge cases ×1.0, NFRs ×1.0, rollout ×0.75, risks & deps ×0.75, consistency ×0.5. Verdict: **Launch-ready** ≥ 8.0 with no dimension < 6 and zero CRITICALs; **Needs revision** ≥ 5.5; else **Needs rework**.

## 3. Report

```
# PRD Review: <title>
## Scorecard  (table: dimension | score | one-line note)  → Overall X.X/10 — <verdict>
## CRITICAL (n)   [C-1] §<section>: <finding>. → Fix: <concrete action or corrected sentence>.
## WARNING (n)    ...
## SUGGESTION (n) ...  (cap ~10)
## What's strong  (2–4 genuine bullets)
```

Every finding cites a section and includes a concrete fix — for ambiguities, write the corrected sentence. "Consider clarifying" is banned. Order by severity, then cost-of-being-wrong (quiet/costly/late first).

## Guardrails

Judge the document, not the idea (strategy doubts → one labeled "Strategy note" at the end). When unsure of severity, choose the lower. If the document isn't a PRD at all, say so instead of force-scoring. End by offering: apply fixes (prd-improve) or re-review after edits.
