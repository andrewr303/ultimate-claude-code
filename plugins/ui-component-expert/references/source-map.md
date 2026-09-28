# Source Guidance and Reference Routing Map

This document establishes the authoritative routing and operational knowledge adaptation map for `ui-component-expert`. It maps the nine local reference monorepos and the deduplicated root asset into the plugin's workflow stages, detailing exactly when and why each source is consulted, what architectural principles are extracted, and what upstream defaults are explicitly rejected.

---

## 1. Executive Reference Routing Matrix

| Source Repository | Primary Role in Pipeline | Workflow Stages | Key Applicable Artifacts | Upstream Defaults Explicitly Rejected |
|---|---|---|---|---|
| `base-ui-master` | Default headless primitive engine | `contract`, `build`, `verify` | Unstyled overlays, popovers, dialogs, dropdowns, switches, tabs | Monorepo build tools, docs site skin |
| `react-spectrum-main` | Internationalization & complex collections | `contract`, `build`, `interface` | React Aria hooks (`useDialog`, `useComboBox`, `useTable`), Stately state | Adobe Spectrum visual skin and palette |
| `zag-main` | Finite state machines for multi-step widgets | `contract`, `build`, `verify` | State machines for dialog, combobox, menu, tabs, accordion | Monorepo framework wrappers |
| `design-system-ops-main` | Token architecture & contract governance | `brief`, `contract`, `update`, `integrate` | 3-tier token model, design-to-code contract, API validator | Wholesale script execution, external MCP |
| `interface-design-main` | Product UI craft & visual hierarchy | `brief`, `contract`, `build`, `interface` | Information-dense layouts, typography hierarchy, memory patterns | Generic AI template layouts, purple glows |
| `styleseed-main` | Evidence-based grammar & local adaptation | `brief`, `contract`, `build` | Reference compilation, token adaptation, registry-first rules | Universal component kits, root mirror editing |
| `taste-skill-main` | Anti-default marketing brief inference | `brief` (conditional marketing only) | Three Dials (variance, motion, density), anti-slop rules | Off-the-shelf kit recommendations (shadcn), overriding exports |
| `ui-skills-main` | Engineering baselines & mobile safe-areas | `brief`, `build`, `verify` | Visible focus (2px solid), safe-area insets, compositor-only motion | Remote registry fetching, unverified mobile claims |
| `ux-ui-agent-skills-main` | 8-state quality bar & axe-core gates | `brief`, `contract`, `build`, `verify` | 8-state matrix, component anatomy, state harnesses, WCAG checklist | 100% test pass claims without execution |
| `SKILL (18).md` | Loose deduplicated root asset | (Deduplicated) | Verified bit-for-bit identical to ux-ui `design-component/SKILL.md` | Competing duplicate skill definitions |

---

## 2. In-Depth Operational Knowledge Adaptation

### A. `base-ui-master` (Material-UI SAS — MIT)
- **Snapshot Path**: `references/upstream/base-ui-master/`
- **Captured Version**: `@base-ui/monorepo` v1.8.0
- **Operational Knowledge Adapted**:
  - Unstyled, fully accessible React primitive architecture where the host application retains 100% control over CSS class names and styling tokens.
  - Clean semantic HTML element output without wrapper `div` pollution.
  - Composable subcomponent and slot patterns (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Backdrop`, `Dialog.Popup`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close`).
  - Robust overlay behavior: automatic focus trapping inside modal dialogs, outside click / pointer down dismissal, Escape key dismissal, and scroll lock on the document body with layout shift compensation.
- **Upstream Patterns Rejected**:
  - Never vendor the monorepo build pipeline or install `@base-ui/react` globally.
  - Base UI is an unstyled behavioral option, not a forced visual style or mandatory dependency for simple native controls.

### B. `react-spectrum-main` (Adobe Inc. — Apache-2.0)
- **Snapshot Path**: `references/upstream/react-spectrum-main/`
- **Captured Version**: `react-spectrum-monorepo` v2.21.0-beta.0
- **Operational Knowledge Adapted**:
  - Behavior-only hooks (`@react-aria/*`) and headless state controllers (`@react-stately/*`).
  - Deep internationalization (i18n): right-to-left (RTL) layout adaptation, localized date/time parsing, and locale-aware number formatting.
  - Accessible complex collections: virtualized listboxes, combobox autocomplete with keyboard navigation (Arrow Up/Down, Home, End, PageUp, PageDown), and data table keyboard cell/row navigation.
  - Focus containment and visible focus ring indicators (`useFocusRing`, `FocusScope`).
- **Upstream Patterns Rejected**:
  - The styled Adobe Spectrum visual theme, Spectrum CSS, and Spectrum icons are strictly excluded.
  - Only unstyled React Aria hooks and React Stately state controllers are referenced when i18n or complex collection virtualization is explicitly required.

### C. `zag-main` (Chakra UI — MIT)
- **Snapshot Path**: `references/upstream/zag-main/`
- **Captured Version**: `@zag-js/org` v1.44.0
- **Operational Knowledge Adapted**:
  - Declarative finite state machines (FSM) defining explicit state transitions, context, and actions for complex interactive controls.
  - Clean separation between state machine logic and UI rendering.
  - Multi-step interactive flows (e.g. multi-step wizard, steps, tour, split-pane, nested cascade menus) where transition integrity prevents race conditions and inconsistent UI states.
- **Upstream Patterns Rejected**:
  - Do not introduce Zag machine wrappers for simple static controls (native buttons, plain inputs).
  - Single composite primitive invariant: never mix Zag with Base UI or React Aria within the same composite widget.

### D. `design-system-ops-main` (Murphy Trueman — MIT)
- **Snapshot Path**: `references/upstream/design-system-ops-main/`
- **Operational Knowledge Adapted**:
  - Three-tier token architecture:
    1. **Tier 1 (Primitive)**: Raw values (`--color-blue-500: #3b82f6`, `--space-4: 1rem`, `--radius-md: 0.375rem`).
    2. **Tier 2 (Semantic)**: Intent-mapped tokens (`--background-surface`, `--text-primary`, `--border-subtle`, `--focus-ring`, `--status-error`).
    3. **Tier 3 (Component)**: Component-specific bindings (`--btn-primary-bg`, `--table-header-font`).
  - Design-to-code contracts: formal interface definitions declaring props, slots, token bindings, and event signatures.
  - API validation: enforcing explicit prop typing, banning `any`, and validating semantic versioning and deprecation paths.
  - Knowledge graph preservation: full suite of 13 markdown knowledge notes maintained locally for offline retrieval.
- **Upstream Patterns Rejected**:
  - No external MCP server requirements or automatic daemon orchestration.
  - Contract validation is performed locally and deterministically.

### E. `interface-design-main` (Damola Akinleye — MIT)
- **Snapshot Path**: `references/upstream/interface-design-main/`
- **Operational Knowledge Adapted**:
  - Product domain craft: designing high-density productivity tools, analytics dashboards, data tables, and settings views.
  - Visual hierarchy: purposeful typographic contrast, strict vertical rhythm, and structured content grouping over floating card soup.
  - Memory persistence: maintaining `.interface-design/system.md` to record project-specific design signatures, component conventions, and layout rules across turns.
- **Upstream Patterns Rejected**:
  - Generic AI aesthetics: purple gradient glows, floating cards with excessive drop shadows, low-contrast grey text on dark backgrounds, and oversized pill badges.

### F. `styleseed-main` (StyleSeed Contributors — MIT)
- **Snapshot Path**: `references/upstream/styleseed-main/`
- **Operational Knowledge Adapted**:
  - Evidence-based grammar compilation: extracting concrete, measurable design rules (spacing scale, type scale, corner radiuses, color relationships) from design artifacts rather than subjective descriptions.
  - Target stack adaptation: translating abstract token definitions into the target codebase's styling format (Tailwind CSS v3/v4 classes, CSS Modules, CSS Custom Properties).
  - Registry-first invariant: `engine/.claude/skills/` is canonical; root `skills/` is a generated mirror that must not be edited or loaded as an independent canon.
  - Local target identity preservation: generated components reflect the specific design export and host application, never forcing a universal component library.
- **Upstream Patterns Rejected**:
  - StyleSeed's internal build scripts and compiler execution are not run as live tools; their methodology is adapted as static engineering rules.

### G. `taste-skill-main` (Leonxlnx — MIT)
- **Snapshot Path**: `references/upstream/taste-skill-main/`
- **Operational Knowledge Adapted**:
  - Anti-default design inference: avoiding generic template clichés when generating initial, unspecified design briefs.
  - Three Dials framework (variance, motion, density) applied **strictly and conditionally** to initial unstyled public marketing / landing page briefs before design approval.
- **Crucial Invariants & Rejections**:
  - **APPROVED EXPORT AUTHORITATIVE**: Banning aesthetic defaults applies strictly to initial, unconstrained marketing briefs. Once a Claude Design export is approved and ingested, its visual identity, color palette, and design tokens are authoritative. Taste-skill heuristics NEVER override an approved design export.
  - **BESPOKE CRAFTSMANSHIP**: Taste-skill recommendations for off-the-shelf component kits (e.g. shadcn/ui forks) are explicitly overridden. `ui-component-expert` creates bespoke, custom TypeScript components tailored to the target stack.

### H. `ui-skills-main` (Julien Thibeaut — MIT)
- **Snapshot Path**: `references/upstream/ui-skills-main/`
- **Captured Version**: `ui-skills` v0.2.4
- **Operational Knowledge Adapted**:
  - Visible focus indicators: 2px solid focus rings with at least 3:1 contrast against surrounding surface as an ergonomic design baseline (working toward WCAG 2.2 AAA 2.4.13, satisfying AA 2.4.7 focus visible).
  - Safe-area mobile layout engineering: honoring `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` on mobile viewports.
  - GPU compositor animation rules: restricting high-frequency transitions to `transform` and `opacity` to maintain 60fps rendering without layout thrashing.
  - Offline registry: `src/data/registry.ts` is snapshotted as static reference data; remote registry fetches are strictly blocked.

### I. `ux-ui-agent-skills-main` (Thientan Soparat — MIT)
- **Snapshot Path**: `references/upstream/ux-ui-agent-skills-main/`
- **Captured Version**: `ux-ui-agent-skills` v2.8.0
- **Operational Knowledge Adapted**:
  - Mandatory 8-state quality bar: every interactive component must account for:
    1. `default`: Rest state with baseline tokens.
    2. `hover`: Pointer hover state with subtle visual elevation or contrast shift.
    3. `focus`: Keyboard focus state with visible focus indicator (ergonomic 2px solid 3:1 contrast baseline).
    4. `active`: Pointer down / pressed state with active feedback.
    5. `disabled`: Inactive state with native `disabled` attribute (no redundant `aria-disabled="true"` on native elements), and pointer-events blocked.
    6. `loading`: Busy state displaying spinner/skeleton with `aria-busy="true"`.
    7. `error`: Validation failure state on form inputs with `aria-invalid="true"` bound to error text via `aria-describedby`.
    8. `selected`: Role-specific selection state (`aria-selected` on tabs/options, `aria-pressed` on toggle buttons, `aria-checked` on checkboxes/radios).
  - Justified exclusions: if any state does not apply to a control (e.g. `selected` on a simple submit button), an explicit non-empty `reason` must be documented in the contract.
  - Dedicated 8-state test harness rendering all 8 states simultaneously for visual and automated verification.
  - axe-core accessibility gates: automated validation against WCAG 2.2 AA standards (color contrast >= 4.5:1, accessible names, valid ARIA relationships) running in an authorized browser runtime (BrowserOS neo). Static code checks are not proof of accessibility.

### J. `SKILL (18).md` (Loose Root File — MIT)
- **File Location**: `C:/dev/Plugins/ui-component-expert/SKILL (18).md`
- **Status**: Deduplicated reference asset; preserved unmodified on disk.
- **SHA256**: `e35325764a67028e7a92585303dbcd0ee90894933bdf92989e907c2041eb8fd6`
- **Deduplication Analysis**: Exact byte-for-byte duplicate of `ux-ui-agent-skills-main/.claude/skills/design-component/SKILL.md`. To eliminate competing duplicate skills within the plugin, `ui-component-expert` routes all component design rules to the canonical `ux-ui-agent-skills` snapshot while preserving the root file intact.

---

## 3. Progressive Disclosure Architecture

To protect Claude Code context windows from token bloat:
1. **Skill Frontmatter**: Skill definitions contain concise triggers, descriptions, and argument hints. They do NOT embed hundreds of lines of reference text.
2. **Selective Reading**: Skills instruct the agent to read specific reference files only when that precise knowledge domain is needed during a workflow step.
3. **No Dynamic Execution**: Reference files are read-only reference data. Scripts, CLI tools, or build commands inside upstream reference directories are never executed.
