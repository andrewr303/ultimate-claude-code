# WCAG 2.2 Success Criteria Reference

Full WCAG 2.2 criterion table (86 criteria: 31 A + 24 AA + 31 AAA). Citation format used across this plugin: `WCAG 2.2 SC x.x.x (Name, Level)`.

Related: [A11Y-PATTERNS.md](A11Y-PATTERNS.md) for production code patterns, [REPORT-TEMPLATE.md](REPORT-TEMPLATE.md) for audit reporting.

## Level A (31 criteria)

| SC | Name | Level | New in 2.2 | What to check | Verification method |
|---|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | — | Every informative image/icon has a meaningful text alternative; decorative images use `alt=""` | Automated scan + manual DOM check; not screenshot-verifiable |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | — | Prerecorded audio-only has a transcript; video-only has a text or audio alternative | Manual media review |
| 1.2.2 | Captions (Prerecorded) | A | — | Prerecorded video with audio has accurate synchronized captions | Video inspection (`<track kind="captions">`) |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | — | Prerecorded video has audio description or a full text alternative | Video inspection |
| 1.3.1 | Info and Relationships | A | — | Structure conveyed visually (headings, lists, table headers, labels) is also programmatic | DOM inspection + screen reader; partial from screenshot |
| 1.3.2 | Meaningful Sequence | A | — | DOM reading order matches the logical/visual order (no confusing CSS `order`/positioning) | Screen reader navigation |
| 1.3.3 | Sensory Characteristics | A | — | Instructions don't rely solely on shape, color, size, location, orientation, or sound | Content review |
| 1.4.1 | Use of Color | A | — | Color is not the only means of conveying information (errors, links, status need a second cue) | Grayscale visual inspection |
| 1.4.2 | Audio Control | A | — | Audio auto-playing > 3s has pause/stop or independent volume control | Media player test |
| 2.1.1 | Keyboard | A | — | All functionality is operable via keyboard alone (no mouse-only handlers) | Keyboard-only test; needs interaction or code |
| 2.1.2 | No Keyboard Trap | A | — | Focus can always be moved away from any component | Keyboard-only test; needs interaction |
| 2.1.4 | Character Key Shortcuts | A | — | Single-character shortcuts can be turned off, remapped, or require a modifier | Single-key test |
| 2.2.1 | Timing Adjustable | A | — | Time limits can be turned off, adjusted, or extended (with warning) | Timer inspection |
| 2.2.2 | Pause, Stop, Hide | A | — | Moving/blinking/scrolling/auto-updating content has pause, stop, or hide | Motion test |
| 2.3.1 | Three Flashes or Below Threshold | A | — | Nothing flashes more than 3 times per second (below general/seizure thresholds) | PEAT analysis |
| 2.4.1 | Bypass Blocks | A | — | Skip link or landmark navigation bypasses repeated blocks | Keyboard tab test (first focusable element) |
| 2.4.2 | Page Titled | A | — | Each page has a descriptive, unique `<title>` (updated on SPA route changes) | Title inspection |
| 2.4.3 | Focus Order | A | — | Tab order is logical and preserves meaning (modals move focus, no erratic jumps) | Keyboard tab test |
| 2.4.4 | Link Purpose (In Context) | A | — | Link purpose is clear from text or its programmatic context (no bare "click here") | Screen reader link list; partial from screenshot |
| 2.5.1 | Pointer Gestures | A | — | Multipoint/path gestures have single-pointer alternatives (e.g. +/- buttons) | Touch test |
| 2.5.2 | Pointer Cancellation | A | — | Actions fire on up-event/`click`, so users can abort by moving the pointer away | Click-and-drag test |
| 2.5.3 | Label in Name | A | — | Accessible name contains the visible label text (voice-control match) | Voice control / speech test |
| 2.5.4 | Motion Actuation | A | — | Shake/tilt-triggered actions have a UI alternative and can be disabled | Accelerometer test |
| 3.1.1 | Language of Page | A | — | `<html lang="…">` declares the default language | HTML inspection |
| 3.2.1 | On Focus | A | — | Focusing a control doesn't trigger an unexpected context change | Keyboard tab test |
| 3.2.2 | On Input | A | — | Changing an input doesn't auto-submit/redirect without warning | Form interaction; needs interaction |
| 3.2.6 | Consistent Help | A | ✅ | Help mechanisms (contact, chat, docs) appear in the same relative order on every page | Multi-page check |
| 3.3.1 | Error Identification | A | — | Errors are described in text, identifying the field and reason | Form validation test; needs error-state screenshot |
| 3.3.2 | Labels or Instructions | A | — | Inputs have visible labels or instructions (placeholders are not labels) | Form audit; screenshot-checkable |
| 3.3.7 | Redundant Entry | A | ✅ | Previously entered info is auto-populated or selectable (no retyping in multi-step flows) | Multi-step form test |
| 4.1.2 | Name, Role, Value | A | — | Custom controls expose name, role, and state in the accessibility tree | Accessibility-tree inspection; needs DOM |

## Level AA (24 criteria)

| SC | Name | Level | New in 2.2 | What to check | Verification method |
|---|---|---|---|---|---|
| 1.2.4 | Captions (Live) | AA | — | Live synchronized media has live captions | Live stream inspection |
| 1.2.5 | Audio Description (Prerecorded) | AA | — | Prerecorded video has a descriptive audio track | Video inspection |
| 1.3.4 | Orientation | AA | — | Content isn't locked to one orientation unless essential | Device rotation test |
| 1.3.5 | Identify Input Purpose | AA | — | Personal-data fields use `autocomplete` tokens (`email`, `tel`, …) | Form code inspection |
| 1.4.3 | Contrast (Minimum) | AA | — | Text ≥ 4.5:1 (normal) or ≥ 3:1 (large: ≥24px, or ≥18.66px bold) | Contrast analyzer / axe-core; screenshot-checkable |
| 1.4.4 | Resize Text | AA | — | Text resizes to 200% without clipping or loss of function (relative units, no fixed heights) | Browser zoom 200%; needs 200%-text screenshot |
| 1.4.5 | Images of Text | AA | — | Live text is used instead of text baked into images | Code inspection |
| 1.4.10 | Reflow | AA | — | No horizontal scrolling at 320px width (400% zoom at 1280px); responsive layouts | 320px viewport test; needs 320px screenshot |
| 1.4.11 | Non-text Contrast | AA | — | UI boundaries, icons, and focus indicators ≥ 3:1 against adjacent colors | Contrast analyzer; screenshot-checkable |
| 1.4.12 | Text Spacing | AA | — | No clipping with line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph-spacing 2em | Text-spacing bookmarklet |
| 1.4.13 | Content on Hover or Focus | AA | — | Extra content on hover/focus is dismissible (Esc), hoverable, and persistent | Pointer/keyboard hover test |
| 2.4.5 | Multiple Ways | AA | — | More than one way to locate pages (nav + search/sitemap) | Site architecture review |
| 2.4.6 | Headings and Labels | AA | — | Headings and labels are descriptive, not generic filler | Visual + DOM inspection; screenshot-checkable |
| 2.4.7 | Focus Visible | AA | — | Every interactive element shows a visible focus indicator (no bare `outline: none`) | Keyboard tab test; needs focus-state screenshot |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | ✅ | Focused element isn't *entirely* hidden by sticky headers/banners/drawers | Tab through sticky areas; needs focus-state screenshot |
| 2.5.7 | Dragging Movements | AA | ✅ | Drag actions have a single-pointer alternative (buttons, click-to-move) | Single-pointer / keyboard test |
| 2.5.8 | Target Size (Minimum) | AA | ✅ | Targets ≥ 24×24 CSS px, or spaced so 24px circles don't overlap (inline/essential exceptions) | CSS inspection / target ruler; screenshot-checkable |
| 3.1.2 | Language of Parts | AA | — | Language changes are marked (`<span lang="…">`) | DOM inspection |
| 3.2.3 | Consistent Navigation | AA | — | Navigation order is consistent across pages | Multi-page check |
| 3.2.4 | Consistent Identification | AA | — | Same functionality uses the same labels/icons everywhere | Component audit |
| 3.3.3 | Error Suggestion | AA | — | Errors suggest corrections when the expected format is known | Form validation test |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | — | Consequential submissions are reversible, verified, or confirmed | Transaction flow test |
| 3.3.8 | Accessible Authentication (Minimum) | AA | ✅ | Login needs no cognitive-function test (or offers an alternative); paste allowed, WebAuthn/magic links OK | Login flow test; needs the flow |
| 4.1.3 | Status Messages | AA | — | Status updates are announced via `role="status"` / `aria-live` without moving focus | Screen reader test |

## Level AAA (31 criteria)

| SC | Name | Level | New in 2.2 | What to check | Verification method |
|---|---|---|---|---|---|
| 1.2.6 | Sign Language (Prerecorded) | AAA | — | Prerecorded audio has sign-language interpretation | Video review |
| 1.2.7 | Extended Audio Description (Prerecorded) | AAA | — | Extended description where pauses are too short | Video review |
| 1.2.8 | Media Alternative (Prerecorded) | AAA | — | Full text alternative for prerecorded synchronized media | Document review |
| 1.2.9 | Audio-only (Live) | AAA | — | Live audio-only has a real-time text alternative | Live broadcast check |
| 1.3.6 | Identify Purpose | AAA | — | UI regions and controls expose purpose programmatically (landmarks, ARIA) | Accessibility-tree inspection |
| 1.4.6 | Contrast (Enhanced) | AAA | — | Text ≥ 7:1 (normal) or ≥ 4.5:1 (large) | Contrast analyzer |
| 1.4.7 | Low or No Background Audio | AAA | — | Background audio is ≥ 20 dB below speech, off, or avoidable | Audio analyzer |
| 1.4.8 | Visual Presentation | AAA | — | ≤ 80 chars/line, ≥ 1.5 line height, ≥ 2.25 paragraph spacing, no full justification, user-selectable colors | Typography inspection |
| 1.4.9 | Images of Text (No Exception) | AAA | — | No text in images (logos/essential only) | Code inspection |
| 2.1.3 | Keyboard (No Exception) | AAA | — | All functionality keyboard-operable, zero exceptions | Keyboard test |
| 2.2.3 | No Timing | AAA | — | No time limits (except non-interactive/real-time essentials) | Timer audit |
| 2.2.4 | Interruptions | AAA | — | Interruptions can be postponed or suppressed | Alert inspection |
| 2.2.5 | Re-authenticating | AAA | — | Form data survives session expiry + re-login | Session-expiry test |
| 2.2.6 | Timeouts | AAA | — | Users are warned up front about inactivity timeouts and data loss | Inactivity test |
| 2.3.2 | Three Flashes | AAA | — | Nothing flashes more than 3 times in any 1-second period, no exceptions | PEAT analyzer |
| 2.3.3 | Animation from Interactions | AAA | — | Motion animation from interaction can be disabled (honor `prefers-reduced-motion`) | Motion test |
| 2.4.8 | Location | AAA | — | Breadcrumbs/sitemap show where the user is | Site navigation review |
| 2.4.9 | Link Purpose (Link Only) | AAA | — | Link text alone (no context) identifies the destination | Link list review |
| 2.4.10 | Section Headings | AAA | — | Content sections have descriptive headings | Heading hierarchy check |
| 2.4.12 | Focus Not Obscured (Enhanced) | AAA | ✅ | *No part* of the focused element is obscured by author content | Tab through sticky regions |
| 2.4.13 | Focus Appearance | AAA | ✅ | Focus indicator ≥ 2px perimeter, 3:1 vs unfocused state and adjacent colors, not obscured | Visual measurement / CSS check |
| 2.5.5 | Target Size (Enhanced) | AAA | — | Targets ≥ 44×44 CSS px | Touch-target measurement |
| 2.5.6 | Concurrent Input Mechanisms | AAA | — | Users can mix input modes (touch + mouse + keyboard) freely | Device test |
| 3.1.3 | Unusual Words | AAA | — | Jargon/idioms have inline definitions or glossary links (`<dfn>`) | Content review |
| 3.1.4 | Abbreviations | AAA | — | Abbreviations expanded on first use (`<abbr title="…">`) | HTML inspection |
| 3.1.5 | Reading Level | AAA | — | Complex text has a plain-language summary (≤ lower-secondary level) | Readability analyzer |
| 3.1.6 | Pronunciation | AAA | — | Ambiguous pronunciations get guides (`<ruby>`) | Linguistic check |
| 3.2.5 | Change on Request | AAA | — | Context changes only on explicit user request | Interaction test |
| 3.3.5 | Help | AAA | — | Context-sensitive help is available for inputs | Form field review |
| 3.3.6 | Error Prevention (All) | AAA | — | All submissions are reversible, checked, or confirmed | Form flow test |
| 3.3.9 | Accessible Authentication (Enhanced) | AAA | ✅ | No cognitive-function test at all for login (no object/personal-content recognition step) | Auth flow test |

## Removed in 2.2

| SC | Name | Note |
|---|---|---|
| 4.1.1 | Parsing | Removed from WCAG 2.2 — HTML parsing is now reliably handled by browsers; do not cite it as a failure. Validate HTML only as a hygiene check. |

## What changed from 2.1 to 2.2

| Change | Criterion | Level |
|---|---|---|
| Removed | 4.1.1 Parsing | A |
| Added | 2.4.11 Focus Not Obscured (Minimum) | AA |
| Added | 2.4.12 Focus Not Obscured (Enhanced) | AAA |
| Added | 2.4.13 Focus Appearance | AAA |
| Added | 2.5.7 Dragging Movements | AA |
| Added | 2.5.8 Target Size (Minimum) | AA |
| Added | 3.2.6 Consistent Help | A |
| Added | 3.3.7 Redundant Entry | A |
| Added | 3.3.8 Accessible Authentication (Minimum) | AA |
| Added | 3.3.9 Accessible Authentication (Enhanced) | AAA |

## Static-input verification grades

When auditing from a screenshot alone (no DOM, no interaction), each criterion falls into one grade:

- **Screenshot-checkable** — verdict possible from a static image: 1.4.3, 1.4.11, 2.4.6, 2.5.8, 3.3.2.
- **Partial** — verdict needs a qualifying state: focus state (2.4.7, 2.4.11), error state (3.3.1), 320px-wide viewport (1.4.10), 200% text size (1.4.4); visual layer readable but DOM not (1.3.1, 2.4.4).
- **Not verifiable** — needs DOM, code, or interaction: 1.1.1, 2.1.1, 2.1.2, 3.2.2, 3.3.8, 4.1.2 (plus everything else not listed above).

File anything outside its grade under "Not verifiable from this input" rather than guessing.

## Testing tools

| Tool | Type | URL |
|---|---|---|
| axe DevTools | Browser extension | [deque.com/axe](https://www.deque.com/axe/) |
| WAVE | Browser extension | [wave.webaim.org](https://wave.webaim.org/) |
| Lighthouse | Built into Chrome | DevTools → Lighthouse |
| NVDA | Screen reader (Windows) | [nvaccess.org](https://www.nvaccess.org/) |
| VoiceOver | Screen reader (Mac) | Built into macOS |
| Colour Contrast Analyser | Desktop app | [tpgi.com](https://www.tpgi.com/color-contrast-checker/) |

## Sources

- [WCAG 2.2 W3C Recommendation](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
