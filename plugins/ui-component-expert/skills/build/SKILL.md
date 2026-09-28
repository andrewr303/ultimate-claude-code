---
name: build
description: Generate bespoke, accessible TypeScript components and 8-state harnesses from an approved DesignContract.
argument-hint: "--workspace <run-path> --contract <contract-path> --target <target-path>"
---

# Bespoke Component Generator

Replace `<plugin-root>` in CLI examples with the absolute directory two levels above this skill file (`skills/build/SKILL.md`); Claude Code may use `${CLAUDE_PLUGIN_ROOT}` instead. Never execute the literal placeholder.

Transforms an approved, validated `DesignContract` into custom TypeScript components, complete type definitions, styling files, 8-state test harnesses, and behavioral unit tests. 

No magical transpiler script or third-party kit clone is used: the CLI inspects the target codebase and emits the architectural build worklist; the active host agent authors bespoke component code adhering strictly to target stack constraints and contract specifications. Human review is required before executing it.

## CLI Commands

### 1. Inspect Target Codebase
```bash
node "<plugin-root>/scripts/cli.mjs" inspect-target --target "<target-project-path>"
```
Analyzes the target's `package.json`, lockfile, and `tsconfig.json` to detect:
- Framework: Next.js App Router, Next.js Pages Router, Vite, or pure React.
- React Version: React 18 vs React 19+.
- Styling Engine: Tailwind CSS v4, Tailwind CSS v3, CSS Modules, or vanilla CSS.
- TypeScript Configuration: path aliases (`@/*`), strict mode, JSX runtime.
- Installed Primitives: Base UI, React Aria, Zag.js.

### 2. Generate Implementation Worklist
```bash
node "<plugin-root>/scripts/cli.mjs" generate-components --workspace "<workspace-path>" --contract "<contract-path>" --target "<target-path>"
```
Emits the JSON implementation build worklist to stdout. The CLI does NOT write component files; Claude Code reads this worklist and authors the bespoke component code into `<workspace>/generated/`.

## Behavioral Backend Selection Invariants

For each component, assign exactly one primitive engine:
- **Native HTML Semantics**: Enforced for simple controls (standard buttons, native text inputs, links, semantic containers). Standard native HTML elements nested within a headless widget are supported and expected.
- **Base UI** (`@base-ui/react`): Selected for unstyled composite overlay components (popovers, dialogs, dropdown menus, tooltips, switches, accordions) when clean HTML and composable subcomponents fit the stack.
- **React Aria** (`@react-aria/*` + `@react-stately/*`): Selected for data-entry surfaces requiring deep internationalization (RTL, localized date/time), localized number parsing, or virtualized comboboxes. Excludes styled Adobe Spectrum visual skins.
- **Zag.js** (`@zag-js/*`): Selected for complex multi-step state machines (step-by-step wizards, split panes, multi-level cascade menus).
- **Single Composite Engine Invariant**: Never mix multiple headless behavioral primitive libraries (e.g. Base UI and Zag.js) within the same composite widget.
- **Zero Silent Installs**: If a primitive library is needed but not listed in `package.json`, generate an explicit installation notice; never run package manager install commands without user authorization.

## Component File Structure and Standards

Each component is written to `<workspace>/generated/<component-id>/`:
```
<component-id>/
├── [ComponentName].tsx           # Component implementation
├── [ComponentName].types.ts     # Public interfaces and prop types
├── [ComponentName].module.css   # Styling (or Tailwind classes matching target)
├── [ComponentName].harness.tsx  # Simultaneous 8-state preview harness
├── [ComponentName].test.tsx     # Behavioral and accessibility tests
└── README.md                    # Usage documentation and token mappings
```

### 1. Strict TypeScript Standards
- **Zero Any**: No `any`, `as any`, or unconstrained `Record<string, any>`.
- **Zero Diagnostic Suppression**: Banned `@ts-ignore` and `@ts-nocheck`. Purposeful `@ts-expect-error` is permitted strictly in negative type assertion tests, never to mask implementation defects.
- **Explicit Return Types**: Every component and exported helper function declares an explicit return type (e.g. `React.JSX.Element`).
- **Discriminated Unions**: State-dependent or variant-dependent props must use discriminated unions.

### 2. React Version Adaptation
- **React 18**:
  - Wrap components in `React.forwardRef<ExactElementType, Props>`.
  - Type the ref with the exact underlying DOM element (e.g. `HTMLButtonElement`, `HTMLDivElement`, `HTMLInputElement`), never generic `HTMLElement` or `any`.
- **React 19+**:
  - Pass `ref` directly as a standard prop in the component function parameter signature.
- **Hydration-Stable IDs**:
  - Use `React.useId()` for all internal ARIA relationship bindings (`aria-labelledby`, `aria-describedby`, `aria-controls`).

### 3. Next.js and Server Component Boundaries
- **Leaf Client Boundaries**: Add `"use client"` strictly at interactive leaf component boundaries (buttons, form inputs, dialog triggers).
- **SSR Safety**: No top-level access to `window`, `document`, or `localStorage` during component module evaluation or initial render.
- **Layout Preservation**: Data-fetching and layout wrappers remain React Server Components (RSC).

### 4. Working State & Interactive Behavior
- **No Dead Handlers**: Never emit placeholder handlers (e.g. `onClick={() => {}}`) or empty links (`href="#"`).
- **Functional State**:
  - Forms: Support both controlled and uncontrolled inputs, live client-side validation, and async submit handling with loading spinners and error banners.
  - Data tables: Implement client-side sorting, text filtering, and pagination over structured data.
- **Keyboard & Focus**:
  - Modal dialogs: Native HTML `<dialog>` provides browser-native focus trapping and Escape key dismissal without custom JS trap hacks. Headless primitives (Base UI, React Aria, Zag) provide accessible focus restoration to trigger elements.
  - Focus indicators: Visible focus indicator (2px solid with 3:1 contrast as an ergonomic baseline toward WCAG 2.2 AAA 2.4.13, satisfying AA 2.4.7 focus visible).
  - Clean implementation: Never copy raw export HTML/SVG/JS into generated code; author bespoke, typed TypeScript components adhering to contract.

### 5. Critical Code Review Security Boundary
- The engine computes SHA256 checksums to reject byte-identical copies of untrusted export files.
- However, modified or edited export code could bypass hash matching.
- **Strict Requirement**: Claude Code and the human developer must explicitly review all generated code before execution or target integration. Never claim a hash check alone guarantees safety without human review.
