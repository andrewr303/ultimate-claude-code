---
name: review
description: Structured code review for TypeScript, React, and Node.js covering correctness, security, performance, types, and tests. Use when asked to review a PR, audit a diff, check if code is safe, or critique a change before merge.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: code-review
---

# Review

Read-then-judge. Load this after the `ult-engineer` router names it.

## Choose depth

| Ask | Load |
|-----|------|
| Full quality / security / perf / tests review | `../code-review/SKILL.md` |
| Manual checklist walk | `../code-review-checklist/SKILL.md` |
| Mechanical anti-patterns (ast-grep) | `../code-antipatterns/SKILL.md` |
| Swallowed errors / silent degradation | `../code-hidden-failures/SKILL.md` |
| Security-sensitive (auth, SQL, secrets, shell, taint) | `../semgrep-scan/SKILL.md` |
| Type-design review (Effective TypeScript items) | `../effective-typescript/SKILL.md` |
| React-specific diagnostics | `../react-doctor/SKILL.md` |
| Test-file quality | `../code-test-quality/SKILL.md` |

## Process

1. Establish scope (paths, PR diff, or named files). Prefer the actual diff over the whole tree.
2. Re-read every cited `file:line` before reporting. Drop findings the current source does not support.
3. Score survivors:

   | Severity | Meaning |
   |----------|---------|
   | Critical | Exploit, data loss, crash on a common path — ship blocker |
   | High | Real correctness bug, auth gap, serious perf (N+1, unbounded) |
   | Medium | Maintainability that will bite; missing tests on a risky path |
   | Low | Style, optional polish |

   | Confidence | Meaning |
   |------------|---------|
   | High | Observed in source or scanner output |
   | Medium | Strong pattern, not executed |
   | Low | Hypothesis — flag or drop |

4. Do not pad. Three verified findings beat ten speculative ones.
5. Distinguish **measured** (compiler, scanner, failing test) from **judgment** (your read).

Do not apply fixes unless the user asked to address the review. Suggest the exact specialist that remediates each finding.

## Output

```markdown
## Scope
## Findings (severity × confidence, file:line)
## What is already good
## Remediation order
```
