---
description: Run a full code-health sweep — lint, anti-patterns, hidden failures, dead code, complexity, dependency audit, test quality, docs quality — and produce one prioritized scorecard.
argument-hint: [path to audit, defaults to repo root]
---

Run a code-health sweep over $ARGUMENTS (default: the repository root) and produce a single consolidated scorecard.

Load `skills/health/SKILL.md` and follow its dimension order. This command is read-only reconnaissance — do not fix anything during the sweep.

Output:

- One table: dimension | grade (A-F) | top finding | count.
- Top 5 issues overall, each with file:line, why it matters, and the exact plugin skill or command that remediates it.
- A suggested remediation order (quick wins first, then structural work).

Offer to execute the remediation plan; on approval, fix dimension by dimension with `/ult-engineer:review` on the resulting diff.
