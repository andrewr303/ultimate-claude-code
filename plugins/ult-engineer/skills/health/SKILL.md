---
name: health
description: Read-only code-health sweep across lint, anti-patterns, hidden failures, dead code, complexity, dependencies, tests, and docs. Use when asked to audit a repo, score code health, find dead code, or produce a prioritized scorecard. Changes nothing.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: code-health
---

# Health

Inspect; do not modify. Load this after the `ult-engineer` router names it.

## Scope

Establish language mix, size, and test presence with a quick Glob/ls pass. Skip dimensions that do not apply and say so.

## Dimensions (this order)

1. `../code-lint/SKILL.md` — check-only; never `--fix` during a sweep
2. `../code-antipatterns/SKILL.md` — ast-grep catalog
3. `../code-hidden-failures/SKILL.md` — errors + degradation tracks
4. Dead code — `../knip-dead-code/SKILL.md` for JS/TS; else `../code-dead-code/SKILL.md`
5. `../code-complexity/SKILL.md` — hotspot functions and files
6. `../code-dep-audit/SKILL.md` — CVEs, outdated packages, licenses
7. `../code-test-quality/SKILL.md` — smells, empty assertions, flakes
8. `../code-docs-quality/SKILL.md` — README / ADR / CLAUDE.md accuracy
9. Optional: `../semgrep-scan/SKILL.md` on auth, input, secrets, SQL, shell
10. Optional (React): `../react-doctor/SKILL.md` read-only scan
11. Optional (JVM): `../openrewrite-recipes/SKILL.md` dry-run

Never format, autofix, or upgrade during the sweep.

## Scorecard

| Dimension | Grade (A–F) | Top finding | Count | Source |
|-----------|-------------|-------------|-------|--------|
| lint | | | | scanner |

Then:

- Top 5 issues overall, each with `file:line`, why it matters, and the skill that remediates it
- Remediation order: quick wins first, then structural work
- Label scanner output vs judgment

Offer to execute the plan; on approval, fix dimension by dimension and run `review` on the resulting diff.
