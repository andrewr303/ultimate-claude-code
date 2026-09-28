---
name: audit
description: Run an evidence-led WCAG 2.2 accessibility audit of a screenshot, URL, live page, or HTML/JSX and report findings by severity with criterion citations. Use when asked to check accessibility, run an a11y audit, review a page or component, audit contrast and keyboard support, or verify WCAG conformance before fixing.
license: MIT
metadata:
  author: ult-accessability
  version: "1.0.0"
---

# Accessibility audit

Evidence-led audit: identify the input, check only what the input can prove, file every criterion in exactly one home. Criterion details live in [WCAG.md](../../references/WCAG.md); filed reports follow [REPORT-TEMPLATE.md](../../references/REPORT-TEMPLATE.md).

## Step 1: identify the input

Determine what was actually provided before checking anything:

- **A screenshot or image** — proceed with screenshot-only scope (see Step 3).
- **A URL** — fetch the page if a fetch tool is available and use the rendered HTML as the source of truth. If a screenshot is also available, use both. If no fetch tool is available, ask the user to paste the page's HTML instead of guessing at markup.
- **HTML, JSX, or another markup/component snippet** — read it directly as the source of truth.
- **A live page via BrowserOS neo** — drive the real page per [BROWSEROS-NEO.md](../../references/BROWSEROS-NEO.md): keyboard walk, focus states, target sizes, zoom/reflow. Live evidence widens scope but never relaxes the accounting.
- **Anything else** (a plain description, a Figma link with no exported image, a vague "check our app") — stop and ask for a screenshot, URL, or markup. Do not guess at a UI you cannot see.

If more than one input type is given (for example a URL plus a screenshot of one of its states), use both and check against the wider scope.

## Step 2: criteria this audit covers

The core set checked directly on every audit:

| SC | Name | Level |
|---|---|---|
| 1.1.1 | Non-text Content | A |
| 1.3.1 | Info and Relationships | A |
| 1.4.3 | Contrast (Minimum) | AA |
| 1.4.4 | Resize Text | AA |
| 1.4.10 | Reflow | AA |
| 1.4.11 | Non-text Contrast | AA |
| 2.1.1 | Keyboard | A |
| 2.1.2 | No Keyboard Trap | A |
| 2.4.4 | Link Purpose (In Context) | A |
| 2.4.6 | Headings and Labels | AA |
| 2.4.7 | Focus Visible | AA |
| 2.4.11 | Focus Not Obscured (Minimum) | AA |
| 2.5.8 | Target Size (Minimum) | AA |
| 3.2.2 | On Input | A |
| 3.3.1 | Error Identification | A |
| 3.3.2 | Labels or Instructions | A |
| 3.3.8 | Accessible Authentication (Minimum) | AA |
| 4.1.2 | Name, Role, Value | A |

Scanner output (axe, Lighthouse) may surface failures outside this set — file those too, with the tool named as evidence. Criteria outside the set that no input reached belong in "Not verifiable from this input", never in silence.

## Step 3: separate what the input can prove from what it can't

This is the rule that keeps the audit honest. Never claim a pass or a fail on a criterion the input cannot demonstrate.

**Every criterion leaves the audit somewhere.** Each of the 18 above must end up in exactly one of four homes: a finding under P0, P1, or P2; the scope line, for a criterion that was checked and came back clean; "Suppressed", for a pre-existing accepted issue with owner and revisit date; or a line under "Not verifiable from this input". A criterion in none of the four has been dropped, and a dropped criterion reads as a silent pass. The count runs per audited screen, not per report: a criterion can fail on one screen and come back clean on the next, so each screen carries its own complete set of the four homes.

From a **screenshot alone**, you CAN check (5 criteria):

- 1.4.3 Contrast (Minimum) — measure the rendered text and background colors.
- 1.4.11 Non-text Contrast — measure icons, borders, and visible focus indicators.
- 2.4.6 Headings and Labels — confirm headings and form labels are visually present and make sense out of context.
- 2.5.8 Target Size (Minimum) — measure tappable dimensions against 24×24 CSS px, only when the viewport scale is known or stated.
- 3.3.2 Labels or Instructions — confirm visible instructions exist next to inputs that need them.

From a **screenshot alone**, you can check these only when the matching state was supplied (7 criteria). Check what the image actually shows, and put the rest under "Not verifiable from this input" naming the state you would need:

- 1.3.1 Info and Relationships — a visible heading hierarchy, list, or table is readable from the pixels; whether the DOM carries the same relationships is not.
- 1.4.4 Resize Text — needs a screenshot of the page at 200% text size.
- 1.4.10 Reflow — needs a screenshot at a 320px-wide viewport.
- 2.4.4 Link Purpose (In Context) — link text and its surrounding sentence are visible; purpose that depends on programmatic context is not.
- 2.4.7 Focus Visible and 2.4.11 Focus Not Obscured — both need a focus-state screenshot.
- 3.3.1 Error Identification — needs an error-state screenshot, and then shows only whether the error is described in text rather than by color alone.

From a **screenshot alone**, you CANNOT check, and must list under "Not verifiable from this input" (6 criteria):

- 1.1.1 Non-text Content (alt text lives in the DOM, not the pixels).
- 2.1.1 / 2.1.2 keyboard behavior and keyboard traps.
- 3.2.2 On Input, 3.3.8 Accessible Authentication — both need interaction or a flow, not a static image.
- 4.1.2 Name, Role, Value (needs the accessibility tree).

From **HTML, JSX, or a fetched page**, check all 18 directly against the markup: alt attributes, heading and landmark structure, label associations, ARIA roles and states, tabindex and focus-management code, and any inline color values you can resolve to compute contrast.

Styles are a separate input from markup. When they do not arrive with it, every criterion that needs a computed value or a rendered page stays in "Not verifiable from this input": 1.4.3, 1.4.11, 1.4.4, 1.4.10, 2.4.7, 2.4.11, and 2.5.8. A component snippet whose class names point at a stylesheet nobody pasted is the common case, so the markup path has two ledger lengths: empty when the styles came with the markup, and those seven plus anything the snippet's own scope cannot reach when they did not. Resolvable inline colors or stated computed values move a criterion back out of the ledger one at a time; a class name does not.

From a **live page**, keyboard (2.1.1, 2.1.2), focus (2.4.3 behavior, 2.4.7, 2.4.11), input behavior (3.2.2), auth flow (3.3.8), and measured targets/reflow/zoom all become checkable — see [BROWSEROS-NEO.md](../../references/BROWSEROS-NEO.md). Live evidence moves criteria out of the ledger; it never moves a checked criterion to the scope line without the check actually being run.

## Step 4: assign severity

- **P0 — blocks use.** A user cannot complete the task at all. Missing accessible name on a primary action, a keyboard trap, contrast so low the text is unreadable, a form control with no label at all.
- **P1 — degrades use.** The task is possible but harder. Contrast below the AA threshold but still legible, missing visible focus indicator, a target below the 24×24 CSS px minimum, vague link text ("click here") with no surrounding context.
- **P2 — friction.** Minor confusion or inefficiency. Inconsistent heading levels read off markup, low contrast on a decorative element, redundant instructions. Heading levels belong here only where they are readable: markup carries them, a screenshot carries only the visual hierarchy, so a level skip filed from an image is an inference and Step 5 rules it out.

## Step 5: write each finding

Every finding needs three parts, in this order:

1. **Observed** — what you actually saw or read, not an inference. ("The 'Submit' button renders white text (#FFFFFF) on a #7A9CC6 background.")
2. **Fix** — concrete, not generic. ("Darken the background to #3D5A80 or below to reach a 4.5:1 ratio against white text.")
3. **Citation** — `WCAG 2.2 SC <number> (<name>, Level <A/AA/AAA>)`.

When filing into [REPORT-TEMPLATE.md](../../references/REPORT-TEMPLATE.md): Observed maps to Evidence, Fix maps to Suggested fix, Citation maps to the WCAG line; add Impact (what a user with a disability experiences) and Location (`file:line`, selector, or page region).

## Scanner integration

Automated scans catch roughly a third of barriers — they localize work, they never certify. Run them first, then complete the manual checks:

```bash
# axe-core CLI against WCAG 2.2 AA tags
npx @axe-core/cli https://example.com --tags wcag2a,wcag2aa,wcag22aa

# Lighthouse accessibility category
npx lighthouse https://example.com --only-categories=accessibility
```

```ts
// Playwright + axe spot-check for the audited page and its key states
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('audited page has no axe violations', async ({ page }) => {
  await page.goto(process.env.AUDIT_URL ?? 'http://localhost:3000');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Feed scanner violations into Steps 4–5 as findings with the tool named in Evidence. Full verification suites live in [testing](../testing/SKILL.md).

## Before/after verification protocol

A second audit of the same screen after fixes re-runs the full process — never assume prior findings still hold:

1. Re-run the exact checks that failed: same elements, same viewports, same states, same tools.
2. Record before/after evidence per finding (re-run tool output, measured ratio, manual repro).
3. File the [final before/after report](../../references/REPORT-TEMPLATE.md): every initial finding appears exactly once as Fixed, Partial, or Open.
4. Anything still failing is residual with owner and next step — never closed without a passing re-check.

## Edge cases

- **Multiple screens in one screenshot** — audit each screen under its own heading inside the same report, each with its own complete set of the four homes. Findings are never merged across screens; no screen inherits a verdict from another.
- **Several states of one screen in one image** — one screen with more evidence, not multiple screens. The extra state unlocks the partial criteria it covers: an error state reaches 3.3.1, a focus state reaches 2.4.7 and 2.4.11.
- **A screenshot with an unknown scale** — target size is defined in CSS pixels, but a screenshot from a 2x/3x display stores device pixels. Ask for the device pixel ratio or CSS viewport width (a 1170px-wide iPhone screenshot is 390 CSS px at 3x). Until the scale is settled, 2.5.8 goes under "Not verifiable from this input". Contrast is unaffected — colors do not change with scale.
- **Text over a photo, gradient, or video background** — do not estimate a pass. File a P1 finding for indeterminate contrast and recommend testing the worst-case pixel region against the text color.
- **A component with no visible content** (empty state, loading skeleton) — note it and ask whether a populated state is available, since headings, labels, and link purpose cannot be judged from an empty shell.
- **HTML/JSX with inline styles or unresolved CSS variables** — treat contrast and target size as not verifiable rather than guessing computed values.
- **A "quick check" or "just the big ones" request** — still run the full criteria list, still write up P0 in full, and hold back the P1/P2 write-ups. Every criterion with a withheld finding gets one line under "Suppressed" naming its SC number and tier; the scope line says the depth was limited. Never drop them (reads as a pass) and never put them on the scope line (reserved for checked-and-clean). Offer to write up any suppressed line on request.

## Failure modes to avoid

- Do not invent a contrast ratio you did not compute from actual colors.
- Do not mark a criterion "pass" because nothing looked obviously wrong — if it was not checked, it is "not verifiable", not a pass.
- Do not let a criterion leave the report without landing in one of the four homes. Do not file a checked-and-passed criterion in the ledger either — the ledger claims the input could not reach it, and that claim would be false.
- Do not cite a WCAG success criterion you have not actually checked against.
- Do not soften a P0 finding into P1 to make a report read better.

## Next

- Fix the findings: [fix](../fix/SKILL.md).
- Verify fixes or run the full check suite: [testing](../testing/SKILL.md).
