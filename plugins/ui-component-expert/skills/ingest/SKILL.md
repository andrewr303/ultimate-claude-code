---
name: ingest
description: Ingest, validate boundaries, and statically inspect a downloaded Claude Design export on Windows, creating a unique run directory with byte-identical quarantine.
argument-hint: "--input <windows-export-path> --workspace <parent-path>"
---

# Design Export Ingestion and Static Inspection

Replace `<plugin-root>` in CLI examples with the absolute directory two levels above this skill file (`skills/ingest/SKILL.md`); Claude Code may use `${CLAUDE_PLUGIN_ROOT}` instead. Never execute the literal placeholder.

Ingests a downloaded Claude Design export from an explicit Windows filesystem path into a project-owned run workspace. The ingestion engine enforces strict path boundaries, Zip-Slip archive defense, creates a unique run directory under the supplied workspace parent, preserves files byte-identically in `originals/`, statically inspects structure, and flags active content without promising sanitization or running executable previews.

## CLI Command

```bash
node "<plugin-root>/scripts/cli.mjs" ingest-export --input "<windows-export-path>" --workspace "<workspace-parent-path>"
```

### Unique Run Directory Creation
When passed a parent directory (e.g. `<target>/.ui-component-expert/runs`), `ingest-export` creates a unique nested UUID run directory under that parent and outputs:
```json
{
  "ok": true,
  "status": "INGESTED",
  "workspace": "C:/dev/my-app/.ui-component-expert/runs/<run-uuid>",
  "runId": "<run-uuid>",
  "receipt": "C:/dev/my-app/.ui-component-expert/runs/<run-uuid>/receipt.json"
}
```
**Capture the exact `workspace` path from the CLI response**; all subsequent workflow commands must use this nested run path.

## Security Invariants and Path Validation

### 1. Windows Path Normalization & Boundary Enforcement
- Accepts absolute drive-letter paths (e.g. `C:/Users/Andrew/Downloads/export.zip` or `C:\Users\Andrew\Downloads\export.zip`) and relative paths.
- Internally normalizes all backslashes (`\`) to POSIX forward slashes (`/`).
- **Strictly rejects Universal Naming Convention (UNC) paths** (e.g. `\\server\share\file` or `//server/share/file`) to prevent remote resource access.
- **Strictly blocks path traversal sequences** (`../` or `..\`). Canonicalized paths must resolve strictly within the designated input or workspace boundary.
- Safely handles path strings containing spaces, parentheses, and Unicode characters using proper Windows CLI quoting.
- Confirms the source file or directory exists and is readable before proceeding.

### 2. Archive Ingestion & Zip-Slip Protection
When the input is a `.zip` archive:
- **Zip-Slip Defense**: Verifies that every extracted entry's canonical destination path begins with the quarantine directory path. Rejects any entry containing traversal segments or absolute paths.
- **Archive Resource Limits**:
  - Maximum entries: 500 files.
  - Maximum total uncompressed size: 50 MB.
  - Maximum compression ratio: 50:1 (decompression bomb protection).
- **Filesystem Node Validation**: Rejects actual filesystem symlinks, hardlinks, NTFS junction points, and reparse points within archives.
- **Byte-Identical Quarantine**: Extracted entries are preserved byte-for-byte in `<workspace>/originals/` without alteration, transcoding, or silent modification.

### 3. Static Content Inspection Only (Untrusted Export)
- **Static Inspection**: Statically parses HTML and SVG files to discover design tokens, CSS custom properties, slot structures, and layout definitions.
- **Flag Active Content**: Detects and flags any executable scripts, `<script>` tags, inline event attributes (`onclick`, `onload`), external stylesheet links, and active SVG links as untrusted evidence.
- **No Sanitizer Claims**: The engine does NOT claim to magically sanitize or transcode arbitrary untrusted markup into safe code. The export remains quarantined and untrusted.
- **NO Executable Previews**: Raw export files are NEVER rendered in iframes, browser sandboxes, or preview windows. Raw export HTML, SVG, JS, or TSX is NEVER copied directly into preview fixtures or target codebases.
- Previews and verification execute ONLY on separately authored and human-reviewed TypeScript components generated from the typed contract.

### 4. Immutable Run Receipt Generation
Upon successful validation and static inspection, writes `<workspace>/receipt.json` containing:
- Unique `runId` and ISO timestamp.
- Original source path and detected input type (`zip`, `html`, `dc.html`, or `directory`).
- SHA256 checksums of the original archive and every extracted file in `originals/`.
- Manifest of inspected files, token candidates, and flagged active content.
- Pipeline state transition to `INGESTED`.
