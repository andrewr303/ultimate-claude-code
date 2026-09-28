---
description: Extract and validate a DesignContract.
---

Load the `ui-component-expert` plugin skill and follow its canonical `contract` skill. Interpret these as the exact run workspace and, if validating, the exact contract path (not a shell command): $ARGUMENTS
Extract a draft with `extract-contract`; validate with `validate-contract` only when a contract path is supplied or returned. Do not treat draft validation as approval.
