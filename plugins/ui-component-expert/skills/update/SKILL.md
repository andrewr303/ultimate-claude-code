---
name: update
description: Compute semantic diffs between DesignContract versions and generate surgical migration patches while preserving human edits.
argument-hint: "--old <old-contract-path> --new <new-contract-path>"
---

# DesignContract Version Diff and Migration

Replace `<plugin-root>` in CLI examples with the absolute directory two levels above this skill file (`skills/update/SKILL.md`); Claude Code may use `${CLAUDE_PLUGIN_ROOT}` instead. Never execute the literal placeholder.

Computes a semantic difference analysis between two versions of a `DesignContract` (e.g. an updated Claude Design export vs a previously integrated baseline). Rather than blindly overwriting existing components in the target codebase, the update engine categorizes changes across tokens, anatomy, props, and states to generate non-destructive migration patches.

## CLI Command

```bash
node "<plugin-root>/scripts/cli.mjs" diff-contract --old "<old-contract-path>" --new "<new-contract-path>"
```

Both contracts must be approved and ready (`ready: true`, with resolved unknowns). If either contract is an unapproved draft, `diff-contract` halts with `CONTRACT_NOT_READY`.

Outputs a structured semantic diff report detailing:
- Added, modified, and removed design tokens across all three tiers.
- Structural anatomy changes (added slots, removed inner parts).
- Prop interface alterations (new required/optional props, changed types).
- State matrix diffs (modified visual states, altered ARIA bindings).
- Asset inventory updates (new or updated SVG glyphs).

## Migration Protocol & Human Edit Preservation

### 1. Semantic Change Classification
- **Non-Breaking Additions**: New optional props, new component tokens, or additional slots. These can be merged incrementally into existing component definitions.
- **Breaking Modifications**: Removed props, altered prop types, renamed slots, or removed tokens. These are flagged with explicit migration instructions.
- **Visual Style Updates**: Altered color, typography, or spacing token values. These update the CSS module or Tailwind classes without touching component logic.

### 2. Preserving Existing Human Edits
- When applying updates to an already-integrated codebase:
  1. Inspect the target component implementation to identify manual modifications (custom event handlers, analytics hooks, business logic).
  2. Apply token and anatomy changes surgically via focused edits, preserving existing function bodies and custom handlers.
  3. Never perform wholesale file replacements of components that have received post-integration human modifications.

### 3. Re-Verification Gate
Following any contract migration:
- Follow the `verify` skill (Claude Code/Kimi: `/ui-component-expert:verify`; Codex: `$verify`) to check TypeScript, the 8-state harness, and available accessibility audits. Report unavailable browser checks as `BLOCKED`.
- Use the `integrate` skill's dry-run preflight to inspect proposed additions. Already-integrated files cannot pass additions-only preflight; update them only with authorized surgical edits, not `integrate-target --apply`.
