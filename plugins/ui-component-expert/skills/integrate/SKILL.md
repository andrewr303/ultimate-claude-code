---
name: integrate
description: Preview file diffs, run additions-only collision preflight, and safely integrate generated components into the target codebase with journaled deletion rollback.
argument-hint: "--workspace <run-path> --contract <contract-path> --target <target-path> --generated <generated-path> [--apply] [--rollback <journal>]"
---

# Target Integration and Safe File Writing

Replace `<plugin-root>` in CLI examples with the absolute directory two levels above this skill file (`skills/integrate/SKILL.md`); Claude Code may use `${CLAUDE_PLUGIN_ROOT}` instead. Never execute the literal placeholder.

Integrates staged and reviewed generated components from the project-owned run workspace into the target application tree. The integration engine operates with non-destructive, additions-only defaults: dry-run preview is mandatory, collision preflight refuses any pre-existing destination files, and a transaction journal enables deletion rollback of unchanged created files.

## CLI Commands

### 1. Integration Preview (Default Dry-Run)
```bash
node "<plugin-root>/scripts/cli.mjs" integrate-target --workspace "<run-path>" --contract "<contract-path>" --target "<target-path>" --generated "<generated-path>"
```
Analyzes proposed file additions and outputs a JSON object containing proposed files and unified diff strings (`diff: "--- /dev/null\n+++ b/..."`). Modifies zero target files.

### 2. Additions-Only Apply
```bash
node "<plugin-root>/scripts/cli.mjs" integrate-target --workspace "<run-path>" --contract "<contract-path>" --target "<target-path>" --generated "<generated-path>" --apply --allow-unverified
```
Writes newly generated component files into the target project.
- **Explicit User Instruction Required**: Passing `--apply` requires **explicit user instruction**. The presence of the flag in command examples or chat transcripts does NOT constitute authorization to write files.
- **Risk Bypass Consent**: Because the CLI engine reports status `NOT_VERIFIED` (since browser verification is performed separately by the host agent rather than inside the CLI script), `--allow-unverified` is currently required alongside `--apply`. The user must give explicit affirmative consent for this risk bypass.

### 3. Deletion Rollback (Deletes Own Unchanged Created Files)
```bash
# Preview rollback actions
node "<plugin-root>/scripts/cli.mjs" integrate-target --rollback "<run-path>/integration-<uuid>.json"

# Execute rollback upon explicit user instruction
node "<plugin-root>/scripts/cli.mjs" integrate-target --rollback "<run-path>/integration-<uuid>.json" --apply
```
Rollback deletes only the hashguarded files that were created by the specific integration run, as cataloged in the transaction journal (`integration-<uuid>.json`). It requires prior user permission and explicit `--apply`. The engine verifies the run receipt, checks the journal hash against the integration proof (`integration-<uuid>.proof.json`), sets a replay lock marker (`integration-<uuid>.rollback.lock`), and unlinks only the unchanged files created by that run. If any created file was modified after integration, rollback strictly halts and refuses to delete it (`HUMAN_EDIT`). Note: this protects local operational integrity and prevents accidental deletion; it is not a cryptographic signature or guarantee against an actor rewriting all local records.

## Safety Invariants & Additions-Only Policy

### 1. Additions-Only Preflight Refusal
- Before writing any file, the preflight check inspects the target destination tree.
- If **ANY destination file already exists**, integration **strictly halts and refuses to proceed**.
- There is zero overwriting, zero in-place file mutation, and no backup/overwrite cycle. Pre-existing human edits are preserved by refusing to touch or collide with existing files.

### 2. Transaction Journal
- When an additive integration executes with `--apply`:
  1. Each created file is verified against its generated hash.
  2. A transaction journal (`integration-<uuid>.json`) records the exact paths, creation timestamps, and SHA256 checksums of the newly created files.
- Rollback `--apply` uses this journal to cleanly remove only those unchanged files upon explicit user request, leaving all other target project files completely unaffected.

### 3. Zero Unauthorized Mutations
- Modifies only files within the authorized target tree.
- Never runs `git commit`, `git push`, branch switches, or history modifications.
- Never executes global package manager commands or installs unapproved dependencies.
