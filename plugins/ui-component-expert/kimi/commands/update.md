---
description: Compare approved DesignContracts without overwriting human edits.
---

Load the `ui-component-expert` plugin skill and follow its canonical `update` skill. Interpret these as the old and new approved contract paths (not a shell command): $ARGUMENTS
Use `diff-contract`, preserve human edits, and reverify any changes; do not use additions-only integration to overwrite existing files.
