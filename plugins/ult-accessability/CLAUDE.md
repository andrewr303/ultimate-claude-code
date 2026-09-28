# CLAUDE.md

Plugin: **ult-accessability**. Default skill and slash command: `ult-accessability`.

## Skills

| Skill | Path | Triggers |
|-------|------|----------|
| ult-accessability | `skills/ult-accessability/` | audit accessibility, is this accessible, mixed a11y request |
| audit | `skills/audit/` | a11y audit, full review, before/after report |
| wcag-aa | `skills/wcag-aa/` | WCAG AA, keyboard, focus, ARIA, forms |
| wcag-aaa | `skills/wcag-aaa/` | WCAG AAA, enhanced contrast, sign language |
| contrast-color | `skills/contrast-color/` | contrast, color, palette, ramps |
| fix | `skills/fix/` | remediate, fix a11y, apply findings |
| testing | `skills/testing/` | axe, screen reader, test plan, verify fix |

## Live tools

- Live page: BrowserOS neo (navigate, keyboard-walk, capture states)
- Automated pass: axe CLI, Lighthouse a11y category
- Contrast: `skills/contrast-color/scripts/contrast-check.mjs`

## Contrast thresholds

AA text 4.5:1 (large text 3:1) · AAA text 7:1 (large text 4.5:1) · non-text UI 3:1
