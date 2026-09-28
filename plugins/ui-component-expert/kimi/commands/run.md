---
description: Route the complete manual design-export workflow.
---

Load the `ui-component-expert` plugin skill, then read its canonical `run` skill. Treat the following as workflow context (target, run parent, export path, description), not shell flags to execute blindly: $ARGUMENTS
Follow every approval and verification gate. If no export path was supplied, stop at the manual Claude Design download handoff.
