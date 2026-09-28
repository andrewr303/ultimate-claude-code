# Audit Report Templates

Two templates: file an **initial report** after auditing, then a **final report** after fixes land. Cite criteria as `WCAG 2.2 SC x.x.x (Name, Level)` — see [WCAG.md](WCAG.md) for the full table.

Severity: **P0** blocks access to core function (keyboard trap, missing auth alternative, unreadable text); **P1** is a WCAG A/AA failure on a common path; **P2** is an edge-case failure, AAA gap, or minor usability barrier.

---

## Initial audit report

```markdown
# Accessibility Audit — Initial Findings

- **Target:** <page(s) / component(s) / URL(s)>
- **Date:** <YYYY-MM-DD>
- **Scope:** WCAG 2.2 Level <A / AA / AAA>
- **Method:** <automated tools + manual checks performed>
- **Inputs:** <screenshot / DOM / live page — determines what was verifiable>

## Summary

| Severity | Count |
|----------|-------|
| P0 | n |
| P1 | n |
| P2 | n |

## Findings

### 1. <Short title>

- **Severity:** P0 | P1 | P2
- **WCAG:** `WCAG 2.2 SC x.x.x (Name, Level)`
- **Location:** <file:line, selector, or page region>
- **Evidence:** <what was observed — measured ratio, screenshot note, repro steps>
- **Impact:** <what a user with a disability experiences>
- **Suggested fix:** <concrete change, with pattern link if applicable>

### 2. …

## Not verifiable from this input

List criteria that could not receive a verdict (e.g. keyboard-only criteria from a
screenshot, auth flow without the login page):

- `WCAG 2.2 SC 2.1.1 (Keyboard, A)` — needs keyboard interaction or code
- …

## Suppressed (with justification)

Only pre-existing, explicitly accepted issues may be listed here:

- <finding> — <reason + owner + expiry/revisit date>
```

---

## Final before/after report

File after fixes are implemented and re-verified. Every initial finding must appear exactly once.

```markdown
# Accessibility Audit — Final Report

- **Target:** <page(s) / component(s) / URL(s)>
- **Date:** <YYYY-MM-DD>
- **Scope:** WCAG 2.2 Level <A / AA / AAA>
- **Initial findings:** n (P0: a, P1: b, P2: c)

## Before / after

### Finding 1: <Short title> — ✅ Fixed | ⚠️ Partial | ❌ Open

- **WCAG:** `WCAG 2.2 SC x.x.x (Name, Level)`
- **Before:** <observed failure + evidence>
- **Change:** <what was changed, with file refs: `path/to/file.ext:line`>
- **After:** <observed passing state + evidence: re-run tool output, measured ratio, manual check>
- **Verified by:** <tool / manual method + date>

### Finding 2: …

## Residual issues

Open or partial findings carried forward, each with owner and next step:

- <finding> — <status, owner, planned fix / accepted risk>

## Suppressed (with justification)

- <finding> — <reason + owner + expiry/revisit date>

## Not verifiable

Criteria that still could not be checked, and what input would unblock them:

- `WCAG 2.2 SC x.x.x (Name, Level)` — <missing input>

## Evidence table

| # | Finding | Severity | WCAG | Status | Evidence |
|---|---------|----------|------|--------|----------|
| 1 | <title> | P1 | `WCAG 2.2 SC 1.4.3 (Contrast (Minimum), AA)` | ✅ Fixed | <ratio before → after> |
| 2 | … | … | … | … | … |

## Verification statement

<Scope> re-tested on <date> with <tools + manual methods>. <n/m> findings fixed,
<r> residual, <s> suppressed, <u> not verifiable. Residual + suppressed items are
listed above with owners; nothing was closed without evidence.
```
