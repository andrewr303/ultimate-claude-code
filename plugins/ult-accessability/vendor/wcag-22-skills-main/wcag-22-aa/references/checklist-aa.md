# WCAG 2.2 Level A & AA Conformance Checklist

Complete verification checklist for all WCAG 2.2 Level A and Level AA success criteria.

| ID | Criterion | Level | Verification Method | Common Failure Points & Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **1.1.1** | Non-text Content | A | Automated scan + manual check | `<img>` missing `alt`, empty button without label, non-text CAPTCHA without audio. Set `alt=""` for decorative images, provide descriptive labels for icons. |
| **1.2.1** | Audio-only and Video-only (Prerecorded) | A | Manual review | Podcasts missing text transcripts, silent videos missing descriptive text alternatives. Provide transcript next to media. |
| **1.2.2** | Captions (Prerecorded) | A | Video inspection | Videos missing accurate synchronized captions (VTT track). Add `<track kind="captions">`. |
| **1.2.3** | Audio Description or Media Alternative | A | Video inspection | Visual actions not described in dialogue. Provide secondary audio track with voice-over description or text transcript. |
| **1.2.4** | Captions (Live) | AA | Live stream inspection | Live broadcast lacking live CART/AI captions. |
| **1.2.5** | Audio Description (Prerecorded) | AA | Video inspection | Video lacks dedicated descriptive audio track for visual story elements. |
| **1.3.1** | Info and Relationships | A | DOM inspection + Screen Reader | Using `<b>` instead of `<strong>`, `<div>` instead of `<h2>`, tables without `<th>`/`scope`, inputs lacking `<label for="...">`. Use semantic HTML elements. |
| **1.3.2** | Meaningful Sequence | A | Screen reader navigation | Visual order altered by CSS flex/grid `order` or negative margins that conflict with DOM reading order. |
| **1.3.3** | Sensory Characteristics | A | Content review | Instructions referencing only shape, color, or location ("Click the red circle on the right"). Add textual identifiers. |
| **1.3.4** | Orientation | AA | Device rotation test | App locks screen to portrait or landscape via CSS or screen orientation API without essential reason. |
| **1.3.5** | Identify Input Purpose | AA | Form code inspection | Missing `autocomplete` attribute on common personal fields (`name`, `email`, `tel`, `address-line1`, `postal-code`). |
| **1.4.1** | Use of Color | A | Visual inspection (grayscale) | Form errors indicated only by red borders with no icon or text message; links indistinguishable from body text without color. |
| **1.4.2** | Audio Control | A | Media player test | Audio auto-plays for >3 seconds without an immediate pause/stop button or volume control independent of system volume. |
| **1.4.3** | Contrast (Minimum) | AA | Contrast analyzer / axe-core | Text under 4.5:1 ratio (normal) or 3:1 (large ≥ 24px or ≥ 18.66px bold). Adjust CSS color tokens. |
| **1.4.4** | Resize Text | AA | Browser zoom 200% | Text clips, overlaps, or disappears when zooming browser text to 200%. Use relative units (`rem`/`em`/`%`) instead of fixed `px` heights. |
| **1.4.5** | Images of Text | AA | Code inspection | Text rendered inside PNG/JPEG banners instead of live HTML text styled with CSS. |
| **1.4.10** | Reflow | AA | Viewport at 320px width | Horizontal scrollbars appear at 320px width (or 400% zoom at 1280px). Replace fixed container widths with responsive layouts (`max-width: 100%`, CSS Grid, Flexbox). |
| **1.4.11** | Non-text Contrast | AA | Contrast analyzer | Active tab boundaries, input borders in unfocused state, checkboxes, and rating stars having < 3:1 contrast against adjacent background. |
| **1.4.12** | Text Spacing | AA | Text spacing bookmarklet | Content truncates or overflows when applying: line-height: 1.5, letter-spacing: 0.12em, word-spacing: 0.16em, paragraph-spacing: 2em. Avoid `max-height` or `overflow: hidden` on text containers. |
| **1.4.13** | Content on Hover or Focus | AA | Pointer/Keyboard hover | Tooltip disappears when mouse moves toward tooltip, or cannot be dismissed with `Esc` key without moving pointer. Ensure hoverable and persistent. |
| **2.1.1** | Keyboard | A | Keyboard-only test | Custom dropdowns, carousels, or drag widgets only respond to `mousedown`/`pointerdown`. Bind `keydown` handlers (`Enter`, `Space`, `Arrows`). |
| **2.1.2** | No Keyboard Trap | A | Keyboard-only test | Tabbing into an editor, widget, or iframe makes it impossible to Tab out. Provide `Esc` shortcut and documented key escapes. |
| **2.1.4** | Character Key Shortcuts | A | Single-key test | Pressing `m` to mute or `k` to pause interferes with voice input or screen reader shortcuts. Provide setting to turn off or remap shortcuts. |
| **2.2.1** | Timing Adjustable | A | Timer inspection | User logged out after 15 minutes of inactivity without a 20-second warning and ability to extend time at least 10 times. |
| **2.2.2** | Pause, Stop, Hide | A | Motion test | Carousel, ticker, or animated GIF moves automatically for >5 seconds without a prominent Pause button. |
| **2.3.1** | Three Flashes or Below | A | PEAT analysis | Animations or strobe effects flashing more than 3 times per second. |
| **2.4.1** | Bypass Blocks | A | Keyboard tab test | Missing "Skip to content" link as the first focusable element on pages with repetitive header navigation. |
| **2.4.2** | Page Titled | A | Title inspection | `<title>` missing, generic ("Untitled"), or not updating on route changes in single-page apps. Title format: `[Page Name] - [Site Name]`. |
| **2.4.3** | Focus Order | A | Keyboard tab test | Modal dialog opens but keyboard focus stays on the background page, or tab jumps erratically across columns. Focus must move logically. |
| **2.4.4** | Link Purpose (In Context) | A | Screen reader link list | Multiple links labeled "Read More", "Learn More", or "Click Here" without aria-label or surrounding context disambiguating them. |
| **2.4.5** | Multiple Ways | AA | Site architecture review | Single way to find content (e.g. only search bar, or only nested menu). Provide both site search and navigation menu/sitemap. |
| **2.4.6** | Headings and Labels | AA | Visual & DOM inspection | Vague headings ("Details", "Section 1") or unlabeled form fields. |
| **2.4.7** | Focus Visible | AA | Keyboard tab test | CSS reset uses `* { outline: none; }` without replacing it with visible outline/box-shadow. |
| **2.4.11** | Focus Not Obscured (Minimum) | **AA (2.2)** | Tab through sticky areas | Focused form inputs or buttons completely hidden underneath a fixed sticky header, sticky cookie banner, or bottom drawer. Use `scroll-padding-top` and `scroll-margin-top`. |
| **2.5.1** | Pointer Gestures | A | Touch test | Operations requiring multi-finger pinch-to-zoom or complex path swipes without a single-tap button alternative (+/- zoom buttons). |
| **2.5.2** | Pointer Cancellation | A | Mouse click-and-drag | Actions execute on `pointerdown` rather than `pointerup`/`click`, preventing user from dragging away to cancel accidental taps. |
| **2.5.3** | Label in Name | A | Voice control / speech test | Visual button text says "Search", but `aria-label="Find articles"`. Accessible name must start with or match the visible text string. |
| **2.5.4** | Motion Actuation | A | Accelerometer test | Shaking mobile phone to undo without an on-screen button alternative, or inability to disable shake action. |
| **2.5.7** | Dragging Movements | **AA (2.2)** | Single pointer / keyboard test | Reordering items in a list, slider adjustment, or kanban column movement can only be performed via dragging. Provide up/down buttons or click-to-move menus. |
| **2.5.8** | Target Size (Minimum) | **AA (2.2)** | CSS inspection / Target ruler | Clickable icons, links, or buttons smaller than 24×24px without at least 24px center-to-center spacing from adjacent targets. Expand hit areas with pseudo-elements. |
| **3.1.1** | Language of Page | A | HTML inspection | Missing `<html lang="en">` (or appropriate ISO 639-1 language code). |
| **3.1.2** | Language of Parts | AA | DOM inspection | Words or phrases in another language not wrapped with `<span lang="fr">...</span>`. |
| **3.2.1** | On Focus | A | Keyboard tab test | Focusing an `<input>` or `<select>` triggers immediate form submission or navigates to a new page. |
| **3.2.2** | On Input | A | Form interaction | Changing a radio button or dropdown option immediately redirects page without explicit user submission ("Submit" button). |
| **3.2.3** | Consistent Navigation | AA | Multi-page check | Main header navigation changes order or disappears between different subpages. |
| **3.2.4** | Consistent Identification | AA | Component audit | The shopping cart icon is a basket on one page and a bag on another, or labeled "Cart" vs "Shopping Bag" inconsistently. |
| **3.2.6** | Consistent Help | **A (2.2)** | Multi-page check | Support phone number, help link, or chat widget placed in the footer on page A, but inside the header or side menu on page B. |
| **3.3.1** | Error Identification | A | Form validation test | Form errors displayed only with a general "There are errors" message at top, without identifying which field failed and why. |
| **3.3.2** | Labels or Instructions | A | Form audit | Placeholders used as replacement for labels (`<input placeholder="Phone">` with no `<label>`). |
| **3.3.3** | Error Suggestion | AA | Form validation test | System reports "Invalid date" without providing the expected format requirement (`YYYY-MM-DD`). |
| **3.3.4** | Error Prevention (Legal, Financial, Data) | AA | Transaction flow | Purchasing or deleting personal data happens instantly upon clicking a button without a confirmation dialog or review step. |
| **3.3.7** | Redundant Entry | **A (2.2)** | Multi-step form test | Multi-step checkout forces user to type delivery address, and re-type the exact same address for billing. Provide auto-fill or selection option. |
| **3.3.8** | Accessible Authentication (Minimum) | **AA (2.2)** | Login flow test | Login requires solving CAPTCHA, memorizing passphrases, or blocks pasting from password managers. Support paste, WebAuthn, or magic links. |
| **4.1.2** | Name, Role, Value | A | Accessibility tree inspection | Custom dropdown built with `<div>` lacks `role="combobox"`, `aria-expanded`, and `aria-controls`. |
| **4.1.3** | Status Messages | AA | Screen reader test | Cart count update or live filtering results change silently on screen without being announced via `role="status"` / `aria-live="polite"`. |
