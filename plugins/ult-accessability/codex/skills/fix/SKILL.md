---
name: fix
description: Remediate accessibility audit findings with minimal scoped edits — one fix per finding with file and line references, per-fix verification, and before/after evidence. Use when applying a11y fixes, resolving audit findings, or repairing WCAG failures without bundling unrelated refactors.
license: MIT
metadata:
  author: ult-accessability
  version: "1.0.0"
---

# Accessibility fix

Consume findings (from [audit](../audit/SKILL.md) or any scanner/manual report), apply one minimal verified fix per finding, and record before/after evidence for the [final report](../../references/REPORT-TEMPLATE.md).

## Input

Each finding must carry: severity (P0/P1/P2), location, observed failure, and a `WCAG 2.2 SC x.x.x (Name, Level)` citation. If a finding lacks any of these, send it back for clarification — never guess which criterion failed or where.

Order of work: P0 first (blocks use), then P1 (degrades use), then P2 (friction). Within a tier, fix shared components and CSS tokens before one-off instances — one token fix can clear a whole class of findings.

## Rules

- **One fix per finding.** Each finding gets its own change with its own `file:line` refs and its own verification. Never bundle refactors, renames, reformatting, or unrelated cleanup into a fix.
- **Minimal scoped edits.** Change the smallest surface that resolves the failure. Prefer existing project conventions; add no speculative generality, no new dependencies, no design-system rewrites.
- **Fix from patterns.** Implement via [A11Y-PATTERNS.md](../../references/A11Y-PATTERNS.md) — skip link, focus trap, focus rings, forms and errors, live regions, target size, auth inputs, reduced motion, content on hover, and the rest. Match the pattern, then adapt names to the codebase.
- **Ground in the criterion.** When the right fix is ambiguous, re-read the criterion in [wcag-aa](../wcag-aa/SKILL.md) or [wcag-aaa](../wcag-aaa/SKILL.md) and fix the traced failure, not a generic checklist item.
- **Contrast is measured.** Any fix touching color pairs is verified with [contrast-color](../contrast-color/SKILL.md) — never eyeballed, never assumed.

## Auto-fixable vs human-judgment

Apply directly (safe, deterministic):

| Issue | Fix |
|---|---|
| Missing `lang` on `<html>` | Add `lang` with the page language |
| Missing viewport meta | Add `width=device-width, initial-scale=1` (never `maximum-scale=1`) |
| `<img>` without `alt` | Decorative: `alt=""`; informative: ask for the text, then add it |
| Positive `tabindex` | Replace with `tabindex="0"` or remove |
| `outline: none` without replacement | Add a `:focus-visible` indicator per the focus-rings pattern |
| Input without `<label>` | Add explicit `for`/`id` label |
| Icon-only button without a name | Add `aria-label` or visually hidden text |
| Missing `autocomplete` on identity fields | Add the standard token |
| New-tab link without warning | Add a visually hidden "(opens in new tab)" suffix |
| `<th>` without `scope` | Add `scope="col"` or `scope="row"` |
| `<button>` without `type` | Add `type="button"` (prevents accidental form submission) |

Stop and ask (need context only the user has): alt text for meaningful images, heading-hierarchy restructuring, link-text rewrites, ARIA role assignment on custom widgets, ARIA role changes (they break JS selectors — multi-file impact check first), removing documented attributes (`aria-keyshortcuts`, `title`), live-region placement and politeness.

## Per-fix verification

Every fix is verified with the same check that failed, before moving to the next finding:

1. Re-run the failing check — same element, same viewport, same state, same tool.
2. Contrast fixes: measured ratio before → after. Target fixes: measured rects. Keyboard/focus fixes: tab-walk repro. Scanner findings: clean re-run on the affected page and state.
3. Full protocols live in [testing](../testing/SKILL.md); live-page re-checks follow [BROWSEROS-NEO.md](../../references/BROWSEROS-NEO.md).
4. Record: what changed (`file:line`), the passing evidence, and the method + date.

A fix without passing evidence is not done — it stays open and goes to the final report as Partial or Open.

## Output

Report fixes in the shape the [final before/after report](../../references/REPORT-TEMPLATE.md) consumes:

```markdown
### Finding n: <Short title> — ✅ Fixed | ⚠️ Partial | ❌ Open

- **WCAG:** `WCAG 2.2 SC x.x.x (Name, Level)`
- **Before:** <observed failure + evidence>
- **Change:** <what changed, with `path/to/file.ext:line` refs>
- **After:** <observed passing state + evidence>
- **Verified by:** <tool / manual method + date>
```

Partial fixes state exactly what remains and what unblocks it; Open fixes carry owner and next step. Residual and suppressed items are listed with owners — nothing is closed without evidence.

## Failure modes to avoid

- Do not fix a finding you cannot locate — ask for the location instead of editing the wrong component.
- Do not "fix" contrast by guessing a darker shade — measure the new pair.
- Do not close a P0 as P1 to make a report read better; severity is set at audit time.
- Do not bundle: one finding, one change, one verification.
- Do not claim a fix works without re-running the check — intent is not evidence.

## Next

- Re-run the audit pass: [audit](../audit/SKILL.md).
- Run the full verification suite: [testing](../testing/SKILL.md).
