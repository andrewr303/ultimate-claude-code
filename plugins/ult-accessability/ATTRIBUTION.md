# Attribution

This plugin distills five upstream sources into its skills and references. Original licenses are MIT and CC-BY-4.0. Vendored copies are unmodified at the paths below.

## accessibility-agents

MIT License. Copyright (c) 2026 Taylor Arndt
Vendored at `vendor/accessibility-agents-main/` (LICENSE verified: MIT header, "Copyright (c) 2026 Taylor Arndt")

Multi-agent audit workflow, agent/skill/command templates, and accessibility review guidance. Distilled into `skills/audit/` (audit workflow, severity model) and `agents/accessibility-auditor.md`.

## accessibility-audit

MIT License. Copyright (c) 2026 Humbleteam
Vendored at `vendor/accessibility-audit-main/` (LICENSE verified: MIT header, "Copyright (c) 2026 Humbleteam")

WCAG 2.2 checklist (`references/wcag22-checklist.md`, 18 success criteria) and the screenshot/URL/markup audit skill. Distilled into `skills/audit/` (input handling, SC citations) and `references/WCAG.md`.

## color-expert

CC-BY-4.0 (LICENSE verified: "Attribution 4.0 International", Creative Commons public license header)
Vendored at `vendor/skill.color-expert-main/`

140+ color reference files (INDEX, contemporary, historical, techniques): color theory, spaces, conversions, palettes, ramps, and accessibility contrast guidance. Distilled into `skills/contrast-color/` and its `scripts/contrast-check.mjs`.

## wcag-22-skills

MIT License. Copyright (c) 2026 3lVv0w and contributors
Vendored at `vendor/wcag-22-skills-main/` (LICENSE verified: MIT header, "Copyright (c) 2026 3lVv0w and contributors")

WCAG 2.2 Level AA and AAA engineering guides (`wcag-22-aa/SKILL.md`, `wcag-22-aaa/SKILL.md` plus references), including the new 2.2 criteria. Distilled into `skills/wcag-aa/` and `skills/wcag-aaa/`.

## ult-performance accessibility skill

MIT. Upstream MIT code from Addy Osmani (web-quality-skills) and guidance per the ult-performance LICENSE.
Reference only: `C:/Users/Andrew/.andrewcode/plugins/managed/ult-performance/skills/accessibility/` (read-only, never copied verbatim)

WCAG 2.2 quick checks, `references/WCAG.md`, and `references/A11Y-PATTERNS.md` structure. Adapted into this plugin's `references/` layout and the `fix` / `testing` skill split.
