---
name: status
description: Inspect and report the current lifecycle state, ingested receipts, contract validity, and verification progress for a workspace.
argument-hint: "[--workspace <run-path>]"
---

# Pipeline Status and Lifecycle Inspector

Replace `<plugin-root>` in CLI examples with the absolute directory two levels above this skill file (`skills/status/SKILL.md`); Claude Code may use `${CLAUDE_PLUGIN_ROOT}` instead. Never execute the literal placeholder.

Inspects the project-owned run workspace to report the current progress state, catalog ingested design assets, check contract validation status, and summarize verification and integration stages.

## CLI Command

```bash
node "<plugin-root>/scripts/cli.mjs" status [--workspace "<run-path>"]
```

If `--workspace` is omitted or points to an uninitialized directory, reports `WAITING_FOR_DOWNLOAD`.

## Engine Lifecycle States

The CLI status engine tracks progress across deterministic state transitions:

```
WAITING_FOR_DOWNLOAD
       │
       │ (ingest-export)
       ▼
    INGESTED
       │
       │ (extract-contract -> draft)
       │ (human review, resolve unknowns & approve)
       ▼
 CONTRACT_READY
       │
       │ (generate-components & host agent authors components)
       │ (run-verification & BrowserOS verification)
       │ (integrate-target --apply --allow-unverified)
       ▼
IMPLEMENTED_UNVERIFIED
```

- **`WAITING_FOR_DOWNLOAD`**: Awaiting manual Claude Design design and export download to Windows.
- **`INGESTED`**: Valid `receipt.json` exists and preserved original files in `originals/` are verified against their SHA256 hashes.
- **`CONTRACT_READY`**: An approved `contract-<uuid>.json` exists in the workspace satisfying structural validation, with all required unknowns resolved and signed off.
- **`IMPLEMENTED_UNVERIFIED`**: An additive transaction journal (`integration-<uuid>.json`) exists with status `APPLIED_UNVERIFIED`, and all created files remain intact in the target tree.
- Note: The engine does not emit a self-certified `VERIFIED` state because browser verification cannot be self-certified without an internally witnessed browser runtime.

## Status Report Output Fields

The JSON status report contains:
- `ok`: Boolean execution success indicator.
- `status`: Current state enum value (`WAITING_FOR_DOWNLOAD`, `INGESTED`, `CONTRACT_READY`, `IMPLEMENTED_UNVERIFIED`).
- `workspace`: Resolved absolute run workspace path.
- `runId`: Active run UUID.
- `receipt`: Path to `receipt.json`.
