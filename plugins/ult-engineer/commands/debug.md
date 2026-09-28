---
description: Triage a bug and route it to the right debugging discipline — interactive DAP stepping, evidence-based log instrumentation, browser performance tracing, or hypothesis-driven methodology.
argument-hint: <describe the bug or paste the error>
---

Debug the following with runtime evidence, not guesswork: $ARGUMENTS

Load `skills/debug/SKILL.md` and follow it.

1. Classify the failure before touching code:
   - **Crash/exception/wrong output in a program you can run locally** → `debugging-code` (`dap` breakpoints, stepping, live eval).
   - **Bug needs the user or a remote/production environment to reproduce** → `debug-agent` (NDJSON instrumentation, local or remote mode).
   - **Browser jank, slow interactions, poor INP/LCP, layout shifts** → `web-performance` (LoAF-first tracing).
   - **React re-renders / slow interactions** → `react-runtime`.
   - **Bun/Node tooling problems (inspector, heap snapshots, CPU profiles, sourcemaps)** → `typescript-debugging`.
   - **No runtime available, or the failure is conceptual/architectural** → `debugging-methodology` (hypothesis table, bisection, first divergence).
2. State your chosen route and 3-5 falsifiable hypotheses ranked by likelihood.
3. Gather runtime evidence per the chosen skill. Do not propose a fix until evidence confirms one hypothesis; cite the observation (breakpoint state, log line, LoAF entry) that proves it.
4. Apply the minimal fix, then verify at the same observation point that behavior changed as predicted. Revert any speculative edits from rejected hypotheses.
5. Clean up all instrumentation (`#region debug log` blocks, temporary breakpoints) and summarize: root cause, evidence, fix, verification.
