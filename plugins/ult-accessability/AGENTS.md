# AGENTS.md

Ult Accessability is an evidence-led accessibility plugin. The default skill is `ult-accessability`.

## Route first

Load `skills/ult-accessability/SKILL.md` and follow its table. Load only the named specialists.

## Live workflow (BrowserOS neo)

When a URL can run, drive the real page with BrowserOS neo: navigate, keyboard-walk (Tab / Shift+Tab / Enter / Escape), toggle reduced motion, and capture states before judging.

- Live page beats markup; markup beats screenshot.
- Run axe CLI or the Lighthouse a11y category as the automated pass, then complete the manual checks.
- Compute contrast with `skills/contrast-color/scripts/contrast-check.mjs` — never eyeball a ratio.

## Evidence labels

Tag every finding: live | markup | screenshot | hypothesis. Never mix them in one claim.

Each WCAG success criterion lives in exactly one home skill (`wcag-aa` or `wcag-aaa`); cross-link, do not duplicate.

## Do not

- Invent contrast ratios or audit findings
- Treat an axe/Lighthouse pass as proof of accessibility
- Claim ADA/Section 508 compliance or legal certification
- Audit a UI you cannot see, fetch, or read — ask for a URL, markup, or screenshot first
