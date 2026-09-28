---
name: debug
description: Evidence-first debugging router for crashes, wrong output, flaky tests, Node/TS inspector issues, and browser jank. Use when something is broken, failing, throwing, not reproducing, or the user asks why. Do not guess a fix from source alone.
license: MIT
metadata:
  author: ult-engineer
  version: "1.0.0"
  category: debugging
---

# Debug

Debug with runtime evidence, not guesswork. Load this after the `ult-engineer` router names it.

AVR Debug is the engine: interactive DAP, NDJSON instrumentation, LoAF traces, and hypothesis-driven methodology.

## Classify before touching code

| Failure | Load | Why |
|---------|------|-----|
| Crash / exception / wrong output in a program you can run locally | `../debugging-code/SKILL.md` | `dap` breakpoints, stepping, live eval |
| Needs the user, a remote host, or production to reproduce | `../debug-agent/SKILL.md` | NDJSON instrumentation, local or remote mode |
| Browser jank, slow interactions, poor INP/LCP, layout shifts | `../web-performance/SKILL.md` | LoAF-first attribution |
| React re-renders / interaction traces | `../react-runtime/SKILL.md` | React Doctor scan traces |
| Bun/Node inspector, heap snapshots, CPU profiles, sourcemaps | `../typescript-debugging/SKILL.md` | Inspector + V8 tooling |
| Production errors, Sentry, source maps in prod | `../typescript-sentry/SKILL.md` | Capture, spans, profiling |
| No runtime available, or the failure is conceptual | `../debugging-methodology/SKILL.md` | Hypothesis table, bisection, first divergence |
| Symptom looks like a swallowed error / silent success | `../code-hidden-failures/SKILL.md` | errors + degradation tracks |

State the chosen route out loud, then follow that skill. Do not stay in this file.

## Discipline

1. Write **3–5 falsifiable hypotheses**, ranked by likelihood, before instrumenting.
2. Instrument or break to test them **in parallel** where possible.
3. Mark each **CONFIRMED / REJECTED / INCONCLUSIVE** with the exact evidence line (breakpoint locals, NDJSON log, stack frame, LoAF record, failing assertion).
4. Two failed hypotheses at the same location means the model of the code is wrong — re-read and re-hypothesize rather than adding a third probe in the same place.
5. **Fix only what evidence convicts.** Minimal change.
6. Verify at the **same observation point** that behavior changed as predicted.
7. Revert edits belonging to rejected hypotheses. Remove `#region debug log` blocks and temporary breakpoints before reporting.

## Output

```markdown
## Route
- chosen debug skill and why

## Hypotheses
1. … — CONFIRMED|REJECTED|INCONCLUSIVE — evidence

## Root cause
- one paragraph, cited observation

## Fix
- files + why this is the minimal change

## Verification
- same observation point, before/after
```
