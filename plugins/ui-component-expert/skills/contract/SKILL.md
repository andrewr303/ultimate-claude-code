---
name: contract
description: Extract and validate a strongly typed DesignContract from quarantined Claude Design artifacts, verifying tokens, 8 states, and WAI-ARIA semantics.
argument-hint: "--workspace <run-path> [--contract <contract-path>]"
---

# DesignContract Extraction and Validation

Replace `<plugin-root>` in CLI examples with the absolute directory two levels above this skill file (`skills/contract/SKILL.md`); Claude Code may use `${CLAUDE_PLUGIN_ROOT}` instead. Never execute the literal placeholder.

Transforms statically inspected Claude Design tokens, layouts, and slot patterns from quarantined export artifacts into a strongly-typed, versioned `DesignContract`. The contract establishes the single source of truth for component generation, defining 3-tier tokens, component anatomy, 8 canonical states, and WAI-ARIA authoring practices.

## CLI Commands

### 1. Extract Contract Draft
```bash
node "<plugin-root>/scripts/cli.mjs" extract-contract --workspace "<workspace-path>"
```
Parses quarantined assets and outputs a draft contract at `<workspace>/contract-<uuid>.json`. Captures the exact output path printed by the CLI.

### 2. Validate Contract
```bash
node "<plugin-root>/scripts/cli.mjs" validate-contract --contract "<contract-file-path>" [--workspace "<workspace-path>"]
```
Validates the contract against the deterministic JSON schema and verifies that source hashes match the workspace `receipt.json`.

## Local DesignContract Data Model

The contract adheres to the local TypeScript interfaces defined in `contracts/types.d.ts` and validated by `contracts/schema.json`:

```typescript
import {
  CanonicalState, // 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading' | 'error' | 'selected'
  StateMatrix,    // Record<CanonicalState, ApplicableState<T> | NonApplicableState>
  ComponentDefinition,
  TokenArchitecture,
  ContractMetadata,
  UnknownEntry
} from './contracts/types.js';

export interface DesignContract {
  schemaVersion: 1;
  metadata: ContractMetadata; // runId, createdAt, sourceHashes, confidence, reviewStatus, approvedBy, approvedAt
  tokens: TokenArchitecture;   // primitive, semantic, component, themes
  assets: AssetManifestEntry[];
  hierarchy: ViewHierarchy;
  components: ComponentDefinition[]; // stableId, anatomy, props, events, backend, states, keyboard, accessibility
  themes?: ThemeContract | null;
  rtl?: RtlContract | null;
  reducedMotion?: ReducedMotionContract | null;
  responsive?: ResponsiveContract | null;
  unknowns: UnknownEntry[];
  evidence: Record<string, SourceEvidenceRef> | SourceEvidenceRef[];
  unmappedArtifacts?: UnmappedEntry[];
}
```

## Validation Rules & Quality Gates

### 1. Token Cycle & Reference Integrity
- Validates the 3-tier token hierarchy (Primitive -> Semantic -> Component).
- Detects and strictly rejects circular token references (direct cycles like `A -> B -> A` or multi-tier cycles like `primitive -> semantic -> component -> primitive`).
- Ensures all token references resolve to existing token definitions.

### 2. Mandatory 8-State Coverage & Justified Exclusions
- Interactive components must account for all 8 canonical states (`default`, `hover`, `focus`, `active`, `disabled`, `loading`, `error`, `selected`):
  - **Applicable states**: Must provide `applicable: true` and an explicit visual/token value object.
  - **Non-applicable states**: Must provide `applicable: false` with a non-empty `reason` explaining the exclusion (e.g. `NOT_A_TOGGLE` for a submit button).
- Semantic ARIA mapping constraints:
  - `aria-invalid="true"` applies strictly to input elements with validation failures.
  - Native HTML elements (buttons, inputs) do not require redundant `aria-disabled="true"` when native `disabled` attribute is present.
  - Selection states (`aria-selected`, `aria-checked`, `aria-pressed`) apply strictly to role-appropriate controls.

### 3. Draft Extraction Is Never Approved Automatically
- Extracting a contract creates a **`DRAFT`** (`reviewStatus: "draft"`).
- Structural validity alone does NOT make a contract ready for code generation.
- Running `validate-contract` on an unapproved draft exits non-zero with `CONTRACT_NOT_READY`, reporting `structuralValid: true` in the details. This is expected behavior reflecting the draft state, not an unexpected system failure.
- Extraction populates required `unknowns` representing inferred assumptions and missing design specifications.
- **Readiness Gate**: The contract transitions to approved readiness ONLY when:
  1. All required unknowns have been reviewed and marked `resolved: true`.
  2. All components have complete slot anatomy, prop specifications, and 8-state matrices.
  3. `reviewStatus` is set to `"approved"` with non-empty `approvedBy` and `approvedAt` values.

### 4. No Static ARIA Proof
Contract validation checks schema conformance and structural relationships. It does NOT claim to prove runtime accessibility. Full accessibility proof requires dynamic DOM tree inspection and axe-core execution in an authorized browser runtime (BrowserOS neo).
