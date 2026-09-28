---
name: testing
description: Verify web accessibility with automated scans and manual protocols — axe, Lighthouse, Playwright checks, keyboard walkthroughs, screen reader commands, zoom, reflow, forced colors, and target-size measurement. Use when testing a11y, verifying fixes, running regression checks, or validating keyboard and assistive-technology support.
license: MIT
metadata:
  author: ult-accessability
  version: "1.0.0"
---

# Accessibility testing

Verification protocols for fixes and releases. Automated scans catch roughly a third of barriers — every automated pass below is followed by the manual protocols. Findings feed [audit](../audit/SKILL.md); failures route to [fix](../fix/SKILL.md); live-page walkthroughs follow [BROWSEROS-NEO.md](../../references/BROWSEROS-NEO.md). Results are recorded per [REPORT-TEMPLATE.md](../../references/REPORT-TEMPLATE.md).

## Automated

### axe CLI

```bash
# WCAG 2.2 A + AA
npx @axe-core/cli https://example.com --tags wcag2a,wcag2aa,wcag22aa

# Include AAA
npx @axe-core/cli https://example.com --tags wcag2a,wcag2aa,wcag22aa,wcag2aaa
```

If `@axe-core/cli` is not installed: `npm install -g @axe-core/cli`. Map each violation to its criterion, explain it in plain language, and file it as a finding — a clean scan is not conformance.

### Lighthouse

```bash
npx lighthouse https://example.com --only-categories=accessibility
```

Use failed audit nodes to localize the component or template — do not go hunting the whole repository for generic patterns. A score of 100 is not WCAG conformance.

### Playwright + axe template

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];

test.describe('accessibility verification', () => {
  test('page has no axe violations', async ({ page }) => {
    await page.goto(process.env.TEST_URL ?? 'http://localhost:3000');
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('revealed states have no axe violations', async ({ page }) => {
    await page.goto(process.env.TEST_URL ?? 'http://localhost:3000');
    // Open each disclosure on the page, then scan the revealed state
    for (const trigger of await page.locator('[aria-expanded="false"]').all()) {
      await trigger.click();
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(results.violations).toEqual([]);
      await page.keyboard.press('Escape');
    }
  });

  test('modal traps and releases focus', async ({ page }) => {
    await page.goto(process.env.TEST_URL ?? 'http://localhost:3000');
    await page.click('#open-dialog');
    const dialog = page.locator('#dialog');
    await expect(dialog).toBeVisible();
    const inside = await page.evaluate(() =>
      document.getElementById('dialog')?.contains(document.activeElement));
    expect(inside).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('no horizontal scroll at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(process.env.TEST_URL ?? 'http://localhost:3000');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});
```

## Manual protocols

### Keyboard script

Unplug the mouse. Tab start to finish: skip link first, every interactive element reachable and operable (Tab / Shift+Tab / Enter / Space / arrows / Esc), order matches visual layout (left-to-right, top-to-bottom), nothing skipped, nothing unexpected focused, no traps, Esc exits every modal/menu/disclosure, no context change on focus or input. SPA route changes move focus to the new H1/main.

### Screen readers

Simulation and reading-order walkthroughs are no substitute for a real screen reader on a real page.

NVDA (Windows; NVDA key = Insert on desktop, Caps Lock on laptop):

| Action | Keys |
|---|---|
| Read from here | Insert + Down |
| Headings list | NVDA + F7, then Alt+H |
| Links list | NVDA + F7, then Alt+K |
| Landmarks list | NVDA + F7, then Alt+D |
| By heading / landmark / field / button | H / D / F / B (Shift reverses) |
| Read current line | NVDA + L |

VoiceOver (macOS/iOS; VO = Ctrl+Option; enable with Cmd+F5):

| Action | Keys |
|---|---|
| Next / previous item | VO + Right / Left |
| Activate | VO + Space |
| Rotor (headings, links, landmarks, controls) | VO + U, then Left/Right to switch lists |
| Enter / exit web area | VO + Shift + Down / Up |
| Read from here | VO + A |

Pass bar: every interactive element announces role + name + state; headings form a logical outline (single H1, no skipped levels); landmarks present with unique labels; form fields announce labels; errors announce on appearance; the full user journey completes eyes-closed.

### Zoom and reflow

- 200% text size: no clipping, overlap, or lost function.
- 320px-wide viewport (or 400% zoom at 1280px): single column, no horizontal scrolling.
- Text-spacing overrides (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph-spacing 2em): no truncation.

### Forced colors and preferences

- Windows Contrast Themes / `forced-colors: active`: custom controls visible, SVGs use `currentColor`, no information lost.
- `prefers-reduced-motion: reduce`: parallax, scroll animation, auto-advance, and morphing stop.
- `prefers-contrast: more` and dark mode: all ratios still pass.

### Target size

Measure interactive-element rects (DevTools or `getBoundingClientRect`): AA ≥ 24×24 CSS px or 24px-circle spacing; AAA ≥ 44×44. Flag dense icon-button rows, filter chips, and pagination dots. Screenshot scale is unknown until the device pixel ratio or CSS viewport width is stated — never measure targets off raw image pixels.

## BrowserOS neo checks

On a live page, run the full keyboard walk, focus-visibility and obscurity checks, target measurement, contrast sampling (computed styles), zoom/reflow, and forced-colors passes per [BROWSEROS-NEO.md](../../references/BROWSEROS-NEO.md): snapshot → act → verify, own tab, `name_session` early. Screenshot focus, hover, error, and forced-colors states as evidence; quote snapshot excerpts for name/role/state.

## Recording results

File results per [REPORT-TEMPLATE.md](../../references/REPORT-TEMPLATE.md): each check names its method (tool + version or manual protocol), input/conditions, and pass/fail evidence. Failures become findings for [fix](../fix/SKILL.md) with Observed/Fix/Citation; anything the available inputs could not reach goes under "Not verifiable" with the missing input named.

## Failure modes to avoid

- Do not treat an axe/Lighthouse pass as proof of accessibility — automated tools detect a subset of barriers.
- Do not mark untested criteria as passing — untested is "not verifiable", not a pass.
- Do not simulate a screen reader in your head and call it tested — run NVDA or VoiceOver for production validation.
- Do not verify a fix with a different check than the one that failed — same elements, same viewports, same states.

## Next

- File failures as findings: [audit](../audit/SKILL.md).
- Remediate failures: [fix](../fix/SKILL.md).
