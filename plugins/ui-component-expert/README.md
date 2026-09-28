# UI Component Expert (`ui-component-expert`)

An additive Claude Code, Kimi Code, and Codex plugin that bridges **Claude Design** visual specifications with **React and TypeScript** target codebases.

`ui-component-expert` ingests exported design artifacts into a typed `DesignContract`, assists in selecting an unstyled headless primitive engine (`Base UI`, `React Aria`, `Zag.js`, or native HTML), and emits a worklist for a host agent to author bespoke TypeScript components. Validation status is currently evaluated against synthetic fixtures and test suites; live Claude Design exports and in-browser runs have not been tested in this environment.

---

## 1. Quick Start & Loading the Plugin

### Windows Loading Command
Per the official [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference), load the plugin directly from its Windows directory using `--plugin-dir`:

```bash
claude --plugin-dir "C:/dev/Plugins/ui-component-expert/plugin"
```

### Claude Code local marketplace
The marketplace manifest is at `plugin/.claude-plugin/marketplace.json`, with its `source` set to `./` (this plugin directory itself). To validate and register it locally:

```bash
claude plugin validate "C:/dev/Plugins/ui-component-expert/plugin"
claude plugin marketplace add "C:/dev/Plugins/ui-component-expert/plugin"
```

Only validation was run while preparing this distribution; registration/installation changes user settings and is left to the user. Direct `--plugin-dir` loading above remains an alternative and does not need marketplace registration. The Codex marketplace example below uses a different manifest format and is not a Claude Code marketplace manifest.

### Claude Customize upload and Claude Design handoff
From the project directory, run `python package_distributions.py` (or `python package_distributions.py --package full`) to build **only** `distribution/ui-component-expert-claude-safe.zip`. Run `python package_distributions.py --package design` separately if the design companion is not already present; `--package all` builds both only when neither exists. Every mode refuses to overwrite an existing output and leaves the original `plugin.zip` untouched. Archive files live at the ZIP root (not under `plugin/`):

- `ui-component-expert-claude-safe.zip`: recommended full Claude plugin for an upload attempt where ZIP uploads are supported, or for extraction into a dedicated local plugin directory. Includes canonical skills, scripts, contracts, curated references, Kimi/Codex adapters, manifests, and bundled runtime `node_modules`, but not fixture caches, tests, build output, or original upstream repositories. To satisfy the platform upload ceiling of at most 500 entries (uploads with 501+ entries are rejected), `node_modules` is scoped to runtime code and data (`.js`, `.mjs`, `.cjs`, `.json`) and package license files, excluding non-runtime TypeScript sources (`.ts`), source maps (`.map`), and documentation. This yields 417 entries (well under the 500 limit, down from 821) while preserving all package metadata (`package.json`) and schema definitions (`ajv/dist/refs`). For archive portability, five `(docs)` reference directory paths are aliased to `docs` and nine `@react-aria`/`@react-stately` reference directory paths to `react-aria`/`react-stately`. Only archived `snapshotPath` fields in the provenance manifest change; original paths, file bytes, hashes, and the on-disk source remain intact. The packager enforces a hard 500-entry guard (both before writing and post-write), path safety, provenance SHA/size, CRC, and a conservative 200,000,000-byte expanded-size ceiling. Bundled parser dependencies (`ajv`, `jsonc-parser`, `parse5`, `yauzl`) remain fully functional and offline-executable without network access.
- `ui-component-design-claude.zip`: small design-brief companion with its own manifest and `design-component` skill. It prepares a portable brief and manual export handoff. It is **not** a plugin running inside the Claude Design canvas.

Do **not** upload the older `plugin.zip` or `distribution/ui-component-expert-claude.zip` for this path-sensitive workflow; both contain ZIP member names outside the conservative `[A-Za-z0-9._/-]` set and exceed the 500-entry ceiling. The alias fix addresses a plausible cause of the reported `Zip file contains path with invalid characters` error, and the runtime-scoping fix ensures entry counts stay strictly under the 500-entry maximum. Acceptance by the user's cloud validator depends on the platform's specific ingestion rules.

Claude Design remains a separate canvas: approve the design there, manually export/download ZIP or HTML, and pass its local Windows path to a local coding host using `ui-component-expert`. This companion does not include or execute the local Node CLI or access local Windows paths; some host environments can execute Node independently. No cloud upload, plugin installation, model run, or live Design-canvas integration has been tested.

### Local Dependency Setup
The plugin requires Node.js >=22. The slim full distribution already bundles the installed parser dependencies (`ajv`, `jsonc-parser`, `parse5`, `yauzl`) for local use. For source installs without dependencies, this optional command downloads them from the npm registry; once installed, engine execution runs locally without background daemons, network calls, or remote telemetry:

```bash
cd "C:/dev/Plugins/ui-component-expert/plugin"
npm ci --ignore-scripts
```

### Namespaced Command Semantics
When loaded, Claude Code automatically discovers skills in `skills/<name>/SKILL.md` under the `/ui-component-expert:<skill>` namespace:
- `/ui-component-expert:run` — Master end-to-end orchestrator.
- `/ui-component-expert:brief` — Design brief generator for Claude Design.
- `/ui-component-expert:ingest` — Windows export quarantine and static inspection runner.
- `/ui-component-expert:contract` — DesignContract parser and validator.
- `/ui-component-expert:build` — Bespoke TypeScript component generator.
- `/ui-component-expert:interface` — Application view and dashboard composer.
- `/ui-component-expert:verify` — Script verification runner and accessibility review guide.
- `/ui-component-expert:integrate` — Additions-only preflight and safe integrator.
- `/ui-component-expert:update` — Semantic contract diff and migration engine.
- `/ui-component-expert:status` — Pipeline lifecycle state inspector.

### Kimi Code (local installation by the user)
The root [`kimi.plugin.json`](kimi.plugin.json) registers a single routing skill at `kimi/skills/ui-component-expert/SKILL.md` and ten namespaced prompts in `kimi/commands/`. In Kimi Code, install the local plugin with `/plugins install C:/dev/Plugins/ui-component-expert/plugin`, then `/reload` (or start a new session). Invoke `/ui-component-expert:brief <description>`, `/ui-component-expert:ingest <export-path> <workspace-parent>`, or any other `/ui-component-expert:<stage>` from the list above; `/skill:ui-component-expert` opens the routing skill directly. These commands pass task context to the agent, not arbitrary shell flags. Kimi copies local plugins into its managed plugins directory: subsequent edits to this source tree require reinstalling and reloading. Resolve the CLI relative to the **installed** `${KIMI_SKILL_DIR}` (`../../../scripts/cli.mjs`), not this README's source path. Dependencies must exist in that installed copy before CLI execution; if missing, the user may run `npm ci --ignore-scripts` there after approving the network install. Do not install packages globally.

### Codex (portable local plugin)
The root [`plugin.json`](plugin.json) is a portable Agent Plugins manifest. Codex discovers `skills/ui-component-expert/SKILL.md` and the ten original `skills/<stage>/SKILL.md` files under root `skills/`. For a local marketplace, create `C:/dev/Plugins/ui-component-expert/.agents/plugins/marketplace.json` with the following contents (or choose another marketplace root and adjust the relative `source.path`):

```json
{
  "name": "local-ui-plugins",
  "plugins": [
    {
      "name": "ui-component-expert",
      "source": { "source": "local", "path": "./plugin" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity"
    }
  ]
}
```

Then the user can register that marketplace with `codex plugin marketplace add "C:/dev/Plugins/ui-component-expert"` and install/enable the plugin in a supported Codex client. Local marketplace support depends on the client; this plugin has **not** been installed or tested in a live Codex session here. Once enabled, invoke `$ui-component-expert` for routing or `$brief`, `$ingest`, `$contract`, `$build`, `$interface`, `$verify`, `$integrate`, `$update`, `$status`, `$run` for focused steps (subject to name collisions with other installed skills). Codex does not use the Kimi slash-command wrappers. Use the resolved installed plugin root two directories above each canonical SKILL.md in place of `<plugin-root>`; do not assume `CLAUDE_PLUGIN_ROOT` exists. Ensure Node.js >=22 and local dependencies exist in the copy actually loaded by Codex; no global install is needed.

### Shared boundaries
Claude Design exports still require manual approval, download, and an explicit local input path. In all hosts, the CLI generates a build worklist, not component code; a human reviews separately authored components before execution or integration. The CLI reports browser checks as `BLOCKED` and remains `NOT_VERIFIED`. Browser and axe evidence require a separately authorized runtime and must be reported independently; without it, report `BLOCKED`. Integration `--apply --allow-unverified` and rollback `--apply` require explicit, action-specific permission. No Kimi or Codex installation or live host invocation was performed while adding these files. See [Kimi plugin documentation](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins.html) and [Codex plugin packaging](https://developers.openai.com/codex/plugins/build).

---

## 2. Core Architecture & Mental Model

```
Claude Design (External Canvas)
       │
       │ [Manual Export & Download to Windows]
       ▼
Local Windows Path (.zip, .html, folder)
       │
       ▼  (/ui-component-expert:ingest)
Byte-Identical Quarantine & Static Inspection (Project-Owned Run Workspace)
       │
       ▼  (/ui-component-expert:contract)
Typed Normalized DesignContract (3-Tier Tokens + 8 States + WAI-ARIA)
       │
       │ [Human Review, Resolve Required Unknowns & Approve]
       ▼
Approved Contract Ready for Code Generation
       │
       ▼  (/ui-component-expert:build)
Target Inspection & Headless Selection (Base UI / React Aria / Zag.js / Native)
       │
       ▼  [Host Agent Authors; Human Reviews Bespoke TypeScript Components]
Generated Workspace Files (.tsx, .types.ts, .module.css, .harness.tsx, .test.tsx)
       │
       ▼  (/ui-component-expert:verify)
Multi-Stage QA (Target npm scripts; BrowserOS gate reported as BLOCKED)
       │
       ▼  (/ui-component-expert:integrate)
Additions-Only Preflight & Additive Apply (with Deletion Rollback)
```

### The Manual Claude Design Workflow
1. **Decoupled Design Environment**: Claude Design is an external design tool. There are no private APIs, automatic synchronization, or cloud couplings.
2. **Deterministic Handoff**: The workflow begins by generating a design brief (`design-brief-<uuid>.md` when `--workspace` is passed). You paste this brief into Claude Design, explore and approve the design, and download the export (.zip, .html, or folder) to your local Windows filesystem.
3. **Quarantine & Static Inspection Only**: The plugin ingests the file from your explicit Windows path, validates path bounds (blocking UNC network paths and `../` traversal), preserves files byte-identically in quarantine, statically inspects structure, and writes `receipt.json`.
4. **NO Raw Export Previews**: Raw export files remain untrusted and are NEVER rendered in iframes, browser sandboxes, or preview windows. Raw export HTML, SVG, JS, or TSX is NEVER copied into preview fixtures or target codebases. Previews and tests render ONLY separately authored and reviewed TypeScript components.

### Custom Generation vs. Headless Behavioral Primitives
`ui-component-expert` never dumps raw CDN HTML or copies off-the-shelf template clones. Instead:
- **Headless Behavioral Primitives**: Provide unstyled accessibility, keyboard navigation, focus management, and WAI-ARIA relationships.
  - **`Native HTML`**: Used for standard buttons, inputs, links, and text containers. Standard native HTML `<dialog>` provides browser-native focus containment and Escape dismissal (note: backdrop click dismissal is not automatic in native `<dialog>` and may be handled separately).
  - **`Base UI`** (`@base-ui/react`): Preferred default for unstyled, composable React overlays (dialogs, popovers, dropdowns, switches, tabs).
  - **`React Aria`** (`@react-aria/*` + `@react-stately/*`): Selected when deep internationalization (RTL, localized date/time), localized number parsing, or virtualized comboboxes are required. Excludes styled Adobe Spectrum visual skins.
  - **`Zag.js`** (`@zag-js/*`): Selected for complex multi-step state machines (wizards, steps, nested menus).
- **Single Composite Engine Invariant**: Exactly one headless primitive library is chosen per composite widget. We never mix Base UI and Zag.js in the same composite control.
- **Bespoke TypeScript Craft**: Claude Code writes custom TypeScript components matching the target codebase's exact styling system (Tailwind CSS v3/v4, CSS Modules), React version, and conventions.

---

## 3. End-to-End Walkthrough Example

```bash
# In Git Bash, set CLAUDE_PLUGIN_ROOT before running manual CLI commands:
export CLAUDE_PLUGIN_ROOT="C:/dev/Plugins/ui-component-expert/plugin"
```

*Note: Claude Code automatically sets `${CLAUDE_PLUGIN_ROOT}` when invoking registered skills. When executing manual terminal commands in Git Bash, export this variable first or use absolute script paths. Paths containing `<target-root>`, `<run-path>`, `<contract-path>`, or `<Username>` are illustrative template placeholders that must be substituted with your actual local project paths before execution.*

### Step 1: Generate Brief
Generate a structured design brief for your component or view:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" generate-brief --description "Analytics data table with filter chips and modal" --workspace "<target-root>/.ui-component-expert/runs"
```
Outputs `design-brief-<uuid>.md` specifying tokens, responsive viewports, and 8 canonical states. Copy the brief into Claude Design.

### Step 2: Download Export & Ingest
In Claude Design, approve the visual design and download the export archive to your Windows workstation (e.g. `C:/Users/<Username>/Downloads/analytics-export.zip`). Ingest it by passing the workspace parent directory:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" ingest-export --input "C:/Users/<Username>/Downloads/analytics-export.zip" --workspace "<target-root>/.ui-component-expert/runs"
```
`ingest-export` creates a unique nested run UUID directory under the parent and returns the exact run workspace path:
```json
{
  "ok": true,
  "status": "INGESTED",
  "workspace": "<target-root>/.ui-component-expert/runs/<run-uuid>",
  "runId": "<run-uuid>"
}
```
**Capture this exact run workspace path** as `<run-path>`. In all subsequent commands, substitute your actual `<run-path>`:

### Step 3: Extract & Validate Contract
Extract the draft contract from the quarantined export:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" extract-contract --workspace "<run-path>"
```
`extract-contract` emits a draft contract file: `<run-path>/contract-<uuid>.json`. Capture this path as `<contract-path>`.

Validating an unapproved draft:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" validate-contract --contract "<contract-path>" --workspace "<run-path>"
```
Draft validation exits non-zero with `CONTRACT_NOT_READY` (reporting `structuralValid: true`). This is expected: the contract requires human review, resolution of required unknowns, and explicit approval before advancing to ready status.

### Step 4: Build Bespoke Components
Inspect the target codebase and generate the component implementation worklist:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" inspect-target --target "<target-root>"

node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" generate-components --workspace "<run-path>" --contract "<contract-path>" --target "<target-root>"
```
`generate-components` outputs the implementation worklist JSON to stdout. The CLI does not write component files. Claude Code reads this worklist and authors bespoke TypeScript components into `<run-path>/generated/`:
- `DataTable.tsx` & `OrderDetailsModal.tsx`
- Strict TypeScript types (`.types.ts`) with zero `any`
- Tailwind classes or CSS modules matching target project conventions
- Dedicated 8-state preview harness (`.harness.tsx`)
- Behavioral unit tests (`.test.tsx`)

### Step 5: Multi-Stage QA Verification
Execute target declared npm scripts and evaluate accessibility:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" run-verification --workspace "<run-path>" --contract "<contract-path>" --target "<target-root>" --generated "<run-path>/generated" --run-checks
```
- **CLI Checks**: Executes declared npm scripts (`typecheck`, `test`, `build`, 120s limit per script). Reports `BLOCKED` for undeclared scripts.
- **Browser & Accessibility Scope**: An actual browser is not available in this environment. The CLI runner does not include an embedded browser or axe-core engine; in the verification report, `browser.status` is always `BLOCKED`. If `--browser-evidence` is passed from an external run, the evidence is retained as `untrustedReport` with an explicit reason stating that external reports cannot self-certify verification. The overall CLI verification report records `status: 'NOT_VERIFIED'`.
- **Four-Gate Vocabulary**: All checks report strictly using `PASS`, `FAIL`, `BLOCKED`, or `NOT_EVALUATED`. Never mark an unexecuted or blocked check as `PASS`.

### Step 6: Additions-Only Integration & Rollback
Preview proposed additions in dry-run mode:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" integrate-target --workspace "<run-path>" --contract "<contract-path>" --target "<target-root>" --generated "<run-path>/generated"
```
Preview outputs a JSON object containing proposed files and unified diff strings (`diff: "--- /dev/null\n+++ b/..."`). The additions-only preflight strictly halts if ANY destination file exists.

When explicitly authorized by the user, apply additions with risk bypass consent:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" integrate-target --workspace "<run-path>" --contract "<contract-path>" --target "<target-root>" --generated "<run-path>/generated" --apply --allow-unverified
```
Writes new files and logs a transaction journal (`<run-path>/integration-<uuid>.json`) alongside a companion integration proof file (`integration-<uuid>.proof.json`).

To rollback, deleting only the unchanged files that were created by the run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" integrate-target --rollback "<run-path>/integration-<uuid>.json" --apply
```
Rollback requires prior user permission and explicit `--apply`. The engine verifies the run receipt, checks the journal hash against the proof, sets a replay lock marker (`integration-<uuid>.rollback.lock`), and unlinks only the unchanged files created by that run. If any created file was modified post-integration, rollback strictly halts and refuses to delete it (`HUMAN_EDIT`). Note: this protects local operational integrity and prevents accidental deletion; it is not a cryptographic signature or guarantee against an actor rewriting all local records.

---

## 4. Deterministic CLI Reference

The CLI entrypoint is located at `${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs`. All commands support the `--json` flag for machine-readable output:

| CLI Command | Required Flags | Optional Flags | Description |
|---|---|---|---|
| `generate-brief` | `--description <text>` | `--workspace <path>` | Emits portable Markdown prompt (`design-brief-<uuid>.md` on `--workspace`). Sets state to `WAITING_FOR_DOWNLOAD`. |
| `ingest-export` | `--input <path>`, `--workspace <path>` | | Creates unique run UUID directory under parent workspace, verifies boundaries, preserves originals byte-identically in quarantine, writes `receipt.json`. |
| `extract-contract` | `--workspace <path>` | | Parses quarantined assets into draft `contract-<uuid>.json`. |
| `validate-contract` | `--contract <path>` | `--workspace <path>` | Validates token cycles, 8 states, and ARIA relationships; reports structural validity and readiness. |
| `inspect-target` | `--target <path>` | | Reads `package.json`, installed packages from `node_modules`, and JSONC `tsconfig.json`; does not execute code or parse lockfiles. Detects framework, React version, and declared scripts. |
| `generate-components` | `--workspace <path>`, `--contract <path>`, `--target <path>` | | Emits JSON implementation worklist to stdout. Does NOT write component files directly. |
| `run-verification` | `--workspace <path>`, `--contract <path>`, `--target <path>`, `--generated <path>` | `--run-checks`, `--browser-evidence <path>` | Runs declared target npm scripts (`typecheck`, `test`, `build`, 120s limit). Reports `BLOCKED` for undeclared scripts; `browser.status` is always `BLOCKED` (external evidence retained as `untrustedReport`). |
| `integrate-target` | `--workspace <path>`, `--contract <path>`, `--target <path>`, `--generated <path>` | `--apply`, `--allow-unverified`, `--rollback <path>` | Additions-only preflight. Preview outputs JSON with diff strings; `--apply --allow-unverified` requires explicit user instruction and writes new files only. |
| `diff-contract` | `--old <path>`, `--new <path>` | | Computes semantic diff between approved, ready contracts (tokens, anatomy, props, states). |
| `status` | | `--workspace <path>` | Reports lifecycle state (`WAITING_FOR_DOWNLOAD`, `INGESTED`, `CONTRACT_READY`, `IMPLEMENTED_UNVERIFIED`). |

---

## 5. Target Stack Implementation Guidance & Architecture Conventions

*Note on Tested Scope: The project inspector reads declared dependencies and scripts from `package.json`, checks installed packages in `node_modules`, and parses `tsconfig.json` compiler options. In this codebase, **only the React 18 + Vite synthetic fixture (`fixtures/showcase`) is covered by automated tests**. Next.js App/Pages Router and Tailwind configurations represent implementation guidance and architectural conventions for generated code, not platform-tested support.*

| Environment | Convention | Ref Pattern | Client Directive Rule | Notes |
|---|---|---|---|---|
| **Next.js (App Router)** | Guidance | React 18: `forwardRef`<br>React 19: direct `ref` | `"use client"` on interactive leaf components | Server layout components preserved; `useId()` for hydration-stable ARIA IDs. |
| **Next.js (Pages Router)** | Guidance | React 18: `forwardRef` | Not applicable | Zero top-level `window`/`document` access during initial SSR render. |
| **Vite + React** | Tested Fixture (v18.3.1) | React 18: `forwardRef`<br>React 19: direct `ref` | Not required | Strict ES module imports honoring `tsconfig.json` path aliases (`@/*`). |
| **Styling: Tailwind v4** | Guidance | N/A | N/A | `@theme` CSS custom properties and utility classes. |
| **Styling: Tailwind v3** | Guidance | N/A | N/A | `tailwind.config.js` semantic tokens and utility classes. |
| **Styling: CSS Modules** | Guidance | N/A | N/A | Scoped `[Component].module.css` with 3-tier CSS custom properties. |

---

## 6. Safety, Boundaries & Human Edit Protection

1. **Path Boundary Enforcement**: Accepts standard drive-letter Windows paths. Strips and rejects UNC paths (`\\server\share`) and path traversal sequences (`../`).
2. **Zip-Slip Defense**: Canonicalizes extracted paths to ensure entries cannot write outside the quarantine directory. Limits: max 500 entries, 50MB uncompressed size, 50:1 compression ratio. Rejects symlinks and junction points.
3. **Quarantine & Static Inspection**: Quarantines downloaded assets before parsing. Preserves raw files byte-identically without execution. Raw export HTML/SVG is never rendered in iframes, browser sandboxes, or preview windows, and never copied into target codebases.
4. **Additions-Only Preflight**: Before writing any file during integration, checks destination paths. If ANY destination file exists, integration strictly halts and refuses to proceed, preventing accidental overwrites of existing human-edited files.
5. **Deletion Rollback**: Logs newly created files to a transaction journal (`integration-<uuid>.json`). Rollback deletes only the unchanged files created by the run upon prior user instruction and explicit `--apply`.
6. **Zero Unauthorized Mutations**: Never executes `git commit`, `git push`, branch switching, global package installations, or unapproved dependency additions.
7. **Distribution Packaging Guard**: Hard pre-write and post-write ceiling of at most 500 ZIP entries for Claude platform compatibility, enforced via `package_distributions.py` with runtime-only `node_modules` scoping and validation against symlinks, path traversal, and case collisions.

---

## 7. Upstream Reference Monorepo Provenance

`ui-component-expert` synthesizes operational reference knowledge from nine curated local reference monorepos located in `C:/dev/Plugins/ui-component-expert/`. Licenses and copyright holders have been verified from the respective upstream `LICENSE` files:

1. `base-ui-master` (Material-UI SAS — MIT): Unstyled accessible React primitives reference for overlays, popovers, dropdowns, dialogs, sliders, and switches.
2. `react-spectrum-main` (Adobe Inc. — Apache-2.0): React Aria accessible hooks and React Stately state controllers for internationalization (i18n), RTL, and virtualized comboboxes. Excludes styled Adobe Spectrum visual skins.
3. `zag-main` (Chakra UI — MIT): Finite state machines for complex multi-step interactive widgets and cross-framework coordination.
4. `design-system-ops-main` (Murphy Trueman — MIT): 3-tier token architecture (primitive -> semantic -> component), design-to-code lifecycle contracts, and API governance.
5. `interface-design-main` (Damola Akinleye — MIT): Product UI craft, visual hierarchy, typography scale, information density, and `.interface-design/system.md` memory patterns.
6. `styleseed-main` (StyleSeed Contributors — MIT): Evidence-based grammar compilation and target stack token adaptation.
7. `taste-skill-main` (Leonxlnx — MIT): Anti-default design inference and Three Dials (variance, motion, density) applied conditionally to unstyled marketing briefs only.
8. `ui-skills-main` (Julien Thibeaut — MIT): Engineering baselines, visible focus indicators (2px solid 3:1 contrast), and safe-area mobile layouts.
9. `ux-ui-agent-skills-main` (Thientan Soparat — MIT): Mandatory 8-state quality bar (default, hover, focus, active, disabled, loading, error, selected), state test harnesses, and axe-core accessibility gates.
10. `SKILL (18).md` (Thientan Soparat — MIT): Verified bit-for-bit identical to `ux-ui-agent-skills-main/.claude/skills/design-component/SKILL.md` (SHA256: `e35325764a67028e7a92585303dbcd0ee90894933bdf92989e907c2041eb8fd6`), deduplicated in architecture and preserved intact on disk.

For full details on source routing, see [references/source-map.md](references/source-map.md) and [references/source-provenance.json](references/source-provenance.json).
