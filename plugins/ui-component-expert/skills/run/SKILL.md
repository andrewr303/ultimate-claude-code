---
name: run
description: Orchestrate the end-to-end ui-component-expert workflow from Claude Design brief to verified, integrated TypeScript components.
argument-hint: "[--workspace <parent-path>] [--target <target-path>] [--input <export-path>]"
---

# UI Component Expert: End-to-End Orchestration

Before running any CLI example, replace `<plugin-root>` with the absolute directory two levels above this skill file (`skills/run/SKILL.md`). Claude Code may use `${CLAUDE_PLUGIN_ROOT}`; Kimi and Codex must resolve their installed plugin path instead. Never execute the literal placeholder. The same rule applies to every canonical skill. References to Claude Code as the author/reviewer below mean the active host agent with human review; `/ui-component-expert:<stage>` is available in Claude Code and Kimi, while Codex invokes `$ui-component-expert` or an individual skill.

Execute the complete, deterministic workflow translating a Claude Design conceptual UI into bespoke, accessible TypeScript components in a target codebase. Validation status is currently evaluated against synthetic fixtures and test suites; live Claude Design exports and in-browser runs have not been tested in this environment.

## Architectural Invariants

1. **Manual Claude Design Workflow**: Claude Design is an external design canvas. The workflow generates a portable design brief (`design-brief-<uuid>.md`), prompts the user to download the approved export archive/folder to their Windows machine, and ingests it from an explicit local path. There are no private APIs or automated cloud couplings.
2. **Project-Owned Run Workspace**: All ephemeral run artifacts (receipts, contracts, generated code, test reports, journals) reside in a project-owned run workspace. Supplying `--workspace <parent>` to `ingest-export` creates a unique nested run directory under that parent (e.g. `<target>/.ui-component-expert/runs/<run-uuid>/`). Subsequent commands must use the exact returned `workspace` path.
3. **Quarantine Static Inspection Only**: The raw design export remains untrusted and byte-identical in quarantine. Ingestion performs static inspection only. There are no promises of magical sanitization. Never render, iframe, sandbox, or preview raw export files. Never copy raw export HTML, SVG, JS, or TSX into executable previews or target integration. Previews and tests render ONLY separately authored and reviewed TypeScript components.
4. **Bespoke Code Generation by Claude Code**: The CLI script `generate-components` emits an implementation build worklist to stdout. It does NOT generate or write component code. Claude Code authors the bespoke TypeScript components, styles, harnesses, and unit tests adhering to target stack constraints and the approved contract.
5. **Single Primitive Backend**: For each composite widget, select exactly one headless primitive engine (`Base UI`, `React Aria`, `Zag.js`, or native HTML semantics). Standard native HTML elements (e.g. native `<dialog>` which provides browser-native focus containment and Escape key dismissal without custom JS trap hacks; note that native modal dialogs do not necessarily light-dismiss on backdrop click, so outside click dismissal may be handled separately where needed) within a primitive are expected, but never mix multiple headless libraries in one composite control.
6. **Strict Additions-Only Integration**: The integration engine is strictly additions-only. Preflight checks destination paths and strictly halts if ANY destination file already exists. Applying integration currently requires `--allow-unverified --apply` along with explicit user consent for risk bypass. Rollback `--apply` unlinks only the newly created files recorded in `integration-<uuid>.json`.
7. **Honest Gate Reports**: All checks report strictly `PASS`, `FAIL`, `BLOCKED`, or `NOT_EVALUATED`. `run-verification --run-checks` executes only declared npm scripts (`typecheck`, `test`, `build`) if present in `package.json`. It does not execute BrowserOS or axe audits internally; `browser.status` is always `BLOCKED` (external evidence retained as `untrustedReport`). In Claude Code, BrowserOS neo is the required browser runtime; in Kimi or Codex, use only a separately authorized host browser runtime. Mark unavailable visual and DOM accessibility checks `BLOCKED`, and never treat a static check as browser evidence.
8. **Critical Security Boundary**: The engine's hash check prevents copying byte-identical untrusted export code into generated files, but modified or pasted export code could slip through raw text. Explicit human code review is strictly required before executing or integrating any generated code; never claim a hash check guarantees reviewed safety.

## Orchestration Workflow

### Step 1: Initialize Workspace & Brief
- Determine target application path (`--target` or current working directory).
- Choose run parent directory: `<target>/.ui-component-expert/runs`.
- If starting from a concept or user prompt, invoke `/ui-component-expert:brief`:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" generate-brief --description "<product-or-component-description>" --workspace "<target>/.ui-component-expert/runs"
  ```
- Outputs a brief containing 3-tier tokens, viewports (1440px desktop, 768px tablet, 390px mobile, 320px narrow), 8 states, and a11y requirements.
- Instruct the user to paste this brief into Claude Design, approve the visual direction, and download the export package to Windows.
- Pipeline state is `WAITING_FOR_DOWNLOAD`.

### Step 2: Ingest Downloaded Export
- When the user provides the local Windows export path (`.zip`, `.html`, `.dc.html`, or directory), invoke `/ui-component-expert:ingest`:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" ingest-export --input "<windows-path>" --workspace "<target>/.ui-component-expert/runs"
  ```
- `ingest-export` creates a unique nested run directory under the supplied parent and outputs the exact run path in `workspace` (e.g. `C:/dev/my-app/.ui-component-expert/runs/<run-uuid>`).
- **Capture this exact run workspace path** for all subsequent commands: `<run-path>`.
- Ingestion verifies path boundaries, preserves files byte-identically in `<run-path>/originals/`, statically inspects structure, flags active content, and writes `receipt.json`.
- State transitions to `INGESTED`.

### Step 3: Extract and Validate DesignContract
- Extract draft contract:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" extract-contract --workspace "<run-path>"
  ```
- Capture the exact contract file path returned by the CLI: `<contract-file>` (`contract-<uuid>.json`).
- Validate draft contract:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" validate-contract --contract "<contract-file>" --workspace "<run-path>"
  ```
- Note on Draft Validation: Extracting a contract creates a `DRAFT` (`reviewStatus: "draft"`). Running `validate-contract` on a draft reports `structuralValid: true` but exits non-zero with `CONTRACT_NOT_READY` because required unknowns are unresolved. This is expected behavior, not an unexpected failure.
- Human Review & Approval Gate: Claude Code guides the user through reviewing tokens, component anatomy, 8 states, and resolving all required unknowns. Once approved, the contract is marked approved with non-empty `approvedBy` and `approvedAt`.
- State transitions to `CONTRACT_READY`.

### Step 4: Target Inspection & Implementation Brief
- Inspect target project:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" inspect-target --target "<target>"
  ```
- Detects framework, React version (18 vs 19+), styling libraries, and declared npm scripts.
- Select single primitive backend per composite widget:
  - `Native HTML`: standard controls and semantic containers (native `<dialog>` provides browser-native focus trapping and Esc dismissal).
  - `Base UI`: unstyled composite overlays (popovers, dropdowns, switches, tabs).
  - `React Aria`: complex internationalization (i18n), localized date/number parsing, virtualized comboboxes.
  - `Zag.js`: multi-step state machines, complex wizards.
- Generate build worklist:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" generate-components --workspace "<run-path>" --contract "<contract-file>" --target "<target>"
  ```
- The CLI emits the build worklist to stdout. It does NOT generate component files.

### Step 5: Bespoke Component Implementation
- Claude Code authors bespoke TypeScript components directly into `<run-path>/generated/`:
  - `[Name].tsx`: Clean functional component adhering to target React version:
    - React 18: `React.forwardRef<ExactElementType, Props>` with exact DOM element types.
    - React 19+: direct `ref` prop passing.
    - Next.js App Router: `"use client"` on interactive leaf files; no top-level `window`/`document` during SSR.
  - `[Name].types.ts`: Strict TypeScript interfaces; zero `any`, zero `@ts-ignore`.
  - `[Name].module.css` or Tailwind classes matching inspected target styling.
  - `[Name].harness.tsx`: 8-state harness rendering all 8 states simultaneously for preview.
  - `[Name].test.tsx`: behavioral unit tests.
- Never copy raw export HTML/SVG into component files; author clean bespoke TypeScript.

### Step 6: Multi-Stage QA Verification
- Run verification script:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" run-verification --workspace "<run-path>" --contract "<contract-file>" --target "<target>" --generated "<run-path>/generated" --run-checks
  ```
- Understand CLI vs Agent Verification:
  - The CLI executes only target npm scripts (`typecheck`, `test`, `build`) if declared in `package.json` (120s limit per script). If undeclared, CLI reports `BLOCKED`.
  - The CLI does not invoke BrowserOS or run built-in axe audits; `browser.status` is always `BLOCKED` (if `--browser-evidence` is passed from an external run, evidence is retained as `untrustedReport`).
  - The host agent inspects the 8-state harness and uses its authorized browser runtime for live visual and DOM checks (BrowserOS neo in Claude Code). If no authorized runtime is available, visual verification and DOM axe audits report **`BLOCKED`**. Static code checks are never reported as accessibility proof.
  - Verification record is saved to `verification-<uuid>.json`. Engine status remains `NOT_VERIFIED` unless witnessed.

### Step 7: Additions-Only Integration & Rollback
- Preview proposed additions in dry-run mode:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" integrate-target --workspace "<run-path>" --contract "<contract-file>" --target "<target>" --generated "<run-path>/generated"
  ```
- Preflight verifies that no destination file exists. If ANY destination file already exists, integration strictly halts and refuses to overwrite.
- Preview emits a JSON object containing proposed files and unified diff strings.
- Applying integration requires **explicit user instruction** and consent for risk bypass:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" integrate-target --workspace "<run-path>" --contract "<contract-file>" --target "<target>" --generated "<run-path>/generated" --apply --allow-unverified
  ```
- Writes newly generated files and logs a transaction journal at `<run-path>/integration-<uuid>.json` alongside a companion proof file (`integration-<uuid>.proof.json`).
- Rollback requires prior user permission and explicit `--apply`. The engine checks the run receipt, validates the journal against the proof, sets a replay lock marker (`integration-<uuid>.rollback.lock`), and unlinks only the unchanged files created by that run:
  ```bash
  node "<plugin-root>/scripts/cli.mjs" integrate-target --rollback "<run-path>/integration-<uuid>.json" --apply
  ```
- State reports `IMPLEMENTED_UNVERIFIED`.
