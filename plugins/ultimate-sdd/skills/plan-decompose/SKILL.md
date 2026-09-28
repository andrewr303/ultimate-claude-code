---
name: plan-decompose
description: >
  Split a CHANGE that is too large into child changes with a conservative
  serial/parallel policy. Use when the user says decompose, split this
  change, auto-decompose, or /ultimate-sdd:decompose.
license: MIT
metadata:
  author: andrewr303
  version: "2.3"
---

One change, one intent. If the proposal needs "and also", split.

```
python <plugin>/scripts/plan.py decompose --root docs/plan --change <slug> --json
```

The script lists ADDED/MODIFIED/REMOVED requirements as candidate children.

## Policy

- **Split** when `needs_split` is true, or the user said the diff would be unreviewable.
- **Serial** when two children touch the same truth domain.
- **Parallel** only when domains are disjoint.
- Each child runs `small-feature` (or the named `childPipeline`).
- The parent CHANGE stays as the portfolio: its `reqs:` list the children once they exist, or you write a short note in the parent body listing child slugs.

Do not create children until the user confirms the split list.

Then `plan.py propose-scaffold` once per accepted child.

## Guardrails

- Do not decompose a one-requirement change.
- Do not invent children that are not in the delta.
- Parent `--no-gate` does not waive a child's vet gate.
