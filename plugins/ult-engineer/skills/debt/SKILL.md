---
name: debt
description: Inventory technical debt and dependency risk from actual code and history, then prioritize bounded improvements. Use when asked about tech debt, outdated packages, CVEs, licenses, upgrade paths, or what to refactor first. Review-only unless the user asks to remediate.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: tech-debt
---

# Debt

Measure, then rank. Do not fabricate telemetry. Load this after the `ult-engineer` router names it.

## Inventory

Load as needed:

- `../code-complexity/SKILL.md` — complexity hotspots
- `../dry-consolidation/SKILL.md` — duplication (detect, don't extract yet)
- `../code-dead-code/SKILL.md` / `../knip-dead-code/SKILL.md` — unused surface
- `../code-dep-audit/SKILL.md` — CVEs, lag, licenses
- [references/deps-playbook.md](references/deps-playbook.md) — upgrade workflow
- [references/tech-debt.md](references/tech-debt.md) — full debt taxonomy

Also inspect real change history (`git log`, hot files) when available. Report missing cost/usage inputs as unknown.

## Rank

For each item: location, type (code / architecture / dependency / test / docs), impact if left, effort, confidence, and the skill that remediates it.

Prioritize:

1. Security vulnerabilities on reachable paths
2. Debt on files that change often
3. Blockers for a named upcoming feature
4. Everything else

Review-only scope does not authorize broad refactors, policy changes, or deploys.

## Output

- Inventory table
- Assumptions (what was not measured)
- Bounded next steps (one PR each)
