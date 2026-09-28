# GitHub Copilot Custom Instructions: WCAG 2.2 Level AA

Apply these rules whenever writing, refactoring, or reviewing web frontend code, markup, CSS styles, and UI components.

## Compliance Baseline
Enforce **WCAG 2.2 Level AA** compliance (global standard for ADA Title II/III, EU EN 301 549 / European Accessibility Act, Section 508, and AODA).

## Mandatory WCAG 2.2 Criteria

1. **2.4.11 Focus Not Obscured (Minimum) (Level AA)**:
   - Elements receiving keyboard focus must never be completely hidden by fixed/sticky elements (headers, banners, toolbars).
   - Use `scroll-padding-top` on the root container and `scroll-margin-top` on focusable elements:
     ```css
     html { scroll-padding-top: 5rem; }
     :target, [tabindex]:focus, input:focus, button:focus, a:focus { scroll-margin-top: 5.5rem; }
     ```

2. **2.5.7 Dragging Movements (Level AA)**:
   - Any drag-and-drop feature (sortable lists, kanban boards, sliders) must provide single-pointer alternative controls (e.g., Up/Down buttons or action menus).

3. **2.5.8 Target Size (Minimum) (Level AA)**:
   - Interactive pointer targets must have an area of at least **24×24 CSS pixels**, or sufficient spacing so a 24px diameter circle centered on each target does not overlap adjacent targets.

4. **3.2.6 Consistent Help (Level A)**:
   - Help mechanisms (contact info, live chat button, FAQ link, contact form) must appear in the same relative position across pages.

5. **3.3.7 Redundant Entry (Level A)**:
   - Do not require users to re-enter previously submitted information within the same process (provide pre-filling or selection options, such as "Billing matches shipping").

6. **3.3.8 Accessible Authentication (Minimum) (Level AA)**:
   - Never require cognitive tests (memorizing complex passwords, solving math puzzles, transcribing CAPTCHAs).
   - Ensure password fields allow clipboard paste and support password managers without blocking events.
   - Prefer WebAuthn / Passkeys or email magic links.

7. **4.1.1 Parsing (Obsolete)**:
   - Obsolete in WCAG 2.2. Focus on **4.1.2 Name, Role, Value**.

## Core Accessibility Standards

### HTML & Semantic Structure
- Use native HTML elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`, `<button>`, `<table>`).
- Never use `<div>` or `<span>` for interactive controls without proper `role`, `tabindex="0"`, and keyboard handlers.
- All non-decorative `<img>` and `<svg>` elements require descriptive `alt` or `aria-label`. Decorative elements must have `alt=""` and `aria-hidden="true"`.
- Icon buttons must have accessible names via `aria-label` or visually-hidden text.

### Color & Focus Visibility
- Normal text (< 24px or < 18.66px bold) must have at least **4.5:1** contrast against its background.
- Large text (≥ 24px or ≥ 18.66px bold) must have at least **3:1** contrast.
- User interface components and borders must meet **3:1** contrast.
- Never use color alone to communicate state, warnings, or errors.
- Never remove focus outlines (`outline: none`) without supplying an equivalent high-contrast focus style (`outline: 2px solid #005fcc; outline-offset: 2px;`).

### Forms & Error Handling
- Explicitly pair inputs with `<label for="...">`.
- Associate form errors using `aria-invalid="true"` and `aria-describedby="[hint-id] [error-id]"`.
- Wrap asynchronous errors or announcements in `role="alert"` or `aria-live="polite"`.

### Modals & Dialogs
- Use `<dialog>` or `role="dialog"` with `aria-modal="true"`.
- Trap focus inside active dialogs.
- Close dialogs on `Escape` key press and restore focus to the opening trigger element.
