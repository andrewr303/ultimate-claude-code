---
description: Run a full code-health sweep — lint, anti-patterns, hidden failures, dead code, complexity, dependency audit, test quality, docs quality — and produce one prioritized scorecard.
argument-hint: [path to audit, defaults to repo root]
---

Run a code-health sweep over $ARGUMENTS (default: the repository root) and produce a single consolidated scorecard.

1. Establish scope: language mix, size, and test presence (quick Glob/ls pass). Skip dimensions that don't apply and say so.
2. Run the health dimensions, preferring the plugin's skills in this order:
   - `/avr-debug:code-lint` — auto-detect and run the project's linters (check-only).
   - `/avr-debug:code-antipatterns` — ast-grep anti-pattern scan.
   - `/avr-debug:code-hidden-failures` — swallowed errors and silent degradation (both tracks).
   - `/avr-debug:code-dead-code` — unused exports, unreachable branches, orphaned files (use `knip-dead-code` for JS/TS repos).
   - `/avr-debug:code-complexity` — hotspot functions and files.
   - `/avr-debug:code-dep-audit` — CVEs, outdated packages, license flags.
   - `/avr-debug:code-test-quality` — test smells, empty assertions, flaky patterns.
   - `/avr-debug:code-docs-quality` — READMEs, ADRs, CLAUDE.md accuracy.
   - Optional deep passes when warranted: `semgrep-scan` for security-sensitive code; `openrewrite-recipes` (dry-run) for JVM repos.
3. Do not fix anything during the sweep — this command is read-only reconnaissance.
4. Output the scorecard:
   - One table: dimension | grade (A-F) | top finding | count.
   - Top 5 issues overall, each with file:line, why it matters, and the exact plugin skill or command that remediates it.
   - A suggested remediation order (quick wins first, then structural work).
5. Offer to execute the remediation plan; on approval, fix dimension by dimension with `/avr-debug:code-review` on the resulting diff.
