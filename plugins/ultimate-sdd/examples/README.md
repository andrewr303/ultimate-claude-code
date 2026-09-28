# Launchpad example

Worked example matching the product-planner screenshots: brief → EPIC-1 → three sequenced REQs.

| File | Stage shown |
|---|---|
| `context/CATALOG.md` | Company / project / plan sidebar |
| `briefs/BRIEF-1-launchpad.md` | Aligned brief (one-liner, JTBD, out of scope) |
| `epics/EPIC-1-launchpad.md` | Single v1 EPIC |
| `reqs/REQ-1-foundation.md` | Stub after Create Project Plan (1/5) |
| `../quality-bar/REQ-1-foundation.specified.md` | Same REQ after Specify (5/5) — **quality bar** |
| `reqs/REQ-2-*.md`, `REQ-3-*.md` | Blocked stubs |
| `tasks/REQ-1/TASK-2.handoff.md` | Load contract |
| `verify/REQ-1.sample.md` | Fail-and-send-back |

Agents: copy this shape, not the rocket-launch domain, unless the user is actually building Launchpad.

# OpenSpec-style change example

`openspec-change/` is a separate tree: current-behavior truth spec + one proposed CHANGE with ADDED/MODIFIED deltas. No EPIC/REQ yet — that is the "review the proposal" moment.

| File | Stage shown |
|---|---|
| `truth/launches/spec.md` | Current behavior (list + filters) |
| `changes/add-launch-countdown/CHANGE.md` | Proposal (why / scope) |
| `changes/add-launch-countdown/deltas/launches.md` | MODIFIED Upcoming List + ADDED Launch Countdown |
| `changes/add-launch-countdown/design.md` | Optional how |

Harness check (from the plugin root):

```
python scripts/plan.py doctor --json
python scripts/plan.py status --root examples/launchpad --json
python scripts/plan.py classify "fix the login crash" --json
```
