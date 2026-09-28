---
description: Verify written AC, ordered independent reviews, and current completion gates
argument-hint: "[REQ-n or REQ-n/TASK-k]"
---

# ultimate-sdd-verify — Walk written AC

Target: $ARGUMENTS

Read AC from the REQ file on disk. For each: run a check that could fail; verdict pass/fail/blocked; proof = file:line, test name, or command output. "Looks right" is not proof.

Write `docs/plan/verify/REQ-n.md`. Failures → TASK `sent-back` with context attached. All pass → REQ `done`, unlock dependents. Do not rewrite AC to match a bad implementation; do patch the spec when the AC was wrong.
