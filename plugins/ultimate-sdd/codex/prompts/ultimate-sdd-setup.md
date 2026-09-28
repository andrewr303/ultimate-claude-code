---
description: Set up missing project scaffolding while preserving authored context and policy
argument-hint: "[project title or target repository]"
---

# ultimate-sdd-setup

This dispatcher requires the full installed Ultimate SDD plugin root (`skills/`, `references/`, `templates/`, `scripts/`, and `commands/`); it is not a self-contained isolated prompt. Resolve `<plugin>` from installed host metadata or an explicit local installation path. If the installation is unavailable or incomplete, stop, report the missing installation, and request its location; never fall back to donor repositories or duplicated inline workflows.

Resolve the installed full `<plugin>` root and the target `<repo>` / `<root>` via `references/model.md`. Run base `plan.py` commands with the target repository as cwd. Stop if required plugin files are unavailable.

Read and follow `<plugin>/skills/plan-setup/SKILL.md` and `<plugin>/references/recovery.md`.

Target: $ARGUMENTS

Use bounded, evidenced reconnaissance and non-destructive setup. Preserve existing context/configuration/workflow; report malformed state instead of replacing it. No guessed tooling, automatic tests, installs, application changes, or git initialization.
