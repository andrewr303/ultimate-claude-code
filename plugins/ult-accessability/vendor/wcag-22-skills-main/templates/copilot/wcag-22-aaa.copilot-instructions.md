# GitHub Copilot Custom Instructions: WCAG 2.2 Level AAA

Apply these enhanced accessibility rules whenever writing, refactoring, or reviewing web frontend code, markup, CSS styles, and UI components.

## Compliance Baseline
Enforce **WCAG 2.2 Level AAA** compliance (the highest tier of accessibility for specialized healthcare, government portals, low-vision software, and cognitive support).

## Mandatory WCAG 2.2 AAA Criteria

1. **2.4.12 Focus Not Obscured (Enhanced) (Level AAA)**:
   - When any interactive component receives keyboard focus, **no part (0%)** of it may be covered by sticky headers, footers, or floating elements.
   - Configure generous scroll offsets:
     ```css
     html { scroll-padding-top: 6rem; scroll-padding-bottom: 4rem; }
     :target, [tabindex]:focus-visible, input:focus-visible, button:focus-visible, a:focus-visible {
       scroll-margin-top: 6.5rem;
       scroll-margin-bottom: 4.5rem;
     }
     ```

2. **2.4.13 Focus Appearance (Level AAA)**:
   - Visible focus indicators MUST meet all 3 conditions:
     1. Area at least as large as a **2 CSS pixel perimeter** around the element.
     2. Contrast ratio of at least **3:1** between focused and unfocused pixel states.
     3. Contrast ratio of at least **3:1** against adjacent background colors.
   - Standard double-outline implementation:
     ```css
     :focus-visible {
       outline: 3px solid #005fcc;
       outline-offset: 2px;
       box-shadow: 0 0 0 2px #ffffff;
     }
     ```

3. **2.5.5 Target Size (Enhanced) (Level AAA)**:
   - Interactive pointer targets must have an area of at least **44×44 CSS pixels** (`min-width: 44px; min-height: 44px;`).

4. **3.3.9 Accessible Authentication (Enhanced) (Level AAA)**:
   - Strictly prohibit all cognitive function tests (no memorizing passwords, no puzzles, no CAPTCHAs, and **no image/object recognition puzzles**).
   - Require WebAuthn / Passkeys, biometric login, or email magic links.

## Enhanced POUR Standards

### Perceivable (Enhanced)
- **Contrast (Enhanced) (1.4.6)**:
  - Normal text (< 24px or < 18.66px bold): Minimum **7:1** contrast ratio.
  - Large text (≥ 24px or ≥ 18.66px bold): Minimum **4.5:1** contrast ratio.
- **Visual Presentation (1.4.8)**:
  - Maximum line length of **80 characters** (`max-width: 75ch;`).
  - Line height at least **1.5** within paragraphs (`line-height: 1.6;`).
  - Paragraph spacing at least **2.25 times font size** (`margin-top: 2.25em;`).
  - **Never use `text-align: justify`**.
  - Provide user theme controls (dark/light/high contrast).
- **Images of Text (1.4.9)**:
  - Never use images containing text (except logos). Use real typography or accessible SVG.

### Operable (Enhanced)
- **Keyboard (No Exception) (2.1.3)**:
  - Every single feature and widget must be operable via keyboard alone with **zero exceptions**.
- **Timing & Timeouts (2.2.3 & 2.2.6)**:
  - No un-extendable timers. Warn users upfront about any session expiration.
  - Re-authenticating (2.2.5) must preserve all entered form data.
- **Animations (2.3.2 & 2.3.3)**:
  - No content flashes more than 3 times per second.
  - Respect `prefers-reduced-motion` and allow disabling interactive animations.

### Understandable (Enhanced)
- **Unusual Words & Abbreviations (3.1.3 & 3.1.4)**:
  - Mark idioms/jargon with `<dfn>` and provide definitions.
  - Expand abbreviations using `<abbr title="...">` or explain on first mention.
- **Reading Level (3.1.5)**:
  - Provide clear summaries when content exceeds 9th grade reading level.
- **Error Prevention (All) (3.3.5)**:
  - Every form submission must provide reversible actions, real-time validation, or a mandatory confirmation review screen.
- **Context-Sensitive Help (3.3.6)**:
  - Provide clear guidance text or accessible help popovers for every input field.
