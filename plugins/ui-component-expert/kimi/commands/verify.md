---
description: Run available checks and report blocked browser gates honestly.
---

Load the `ui-component-expert` plugin skill and follow its canonical `verify` skill. Interpret these as the run workspace, contract path, target path, and generated path (not a shell command): $ARGUMENTS
Use `run-verification` with `--run-checks` only for declared target scripts. The CLI cannot certify browser or axe checks; use an authorized browser separately, otherwise report `BLOCKED`.
