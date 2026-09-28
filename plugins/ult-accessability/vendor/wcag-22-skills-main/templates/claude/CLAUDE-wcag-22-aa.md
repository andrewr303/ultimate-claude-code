# WCAG 2.2 Level AA Guidelines for Claude Code

Add this section to your project's `CLAUDE.md`:

```markdown
## Accessibility Engineering Standards (WCAG 2.2 Level AA)

All frontend code, UI components, HTML templates, and CSS stylesheets must strictly comply with WCAG 2.2 Level AA:

### New WCAG 2.2 Success Criteria
- **2.4.11 Focus Not Obscured (Minimum)**: Ensure elements receiving focus are not fully hidden by sticky navigation. Configure `scroll-padding-top` on root and `scroll-margin-top` on interactive elements.
- **2.5.7 Dragging Movements**: Provide non-dragging single-pointer alternatives (e.g. Up/Down buttons) for all drag-and-drop actions.
- **2.5.8 Target Size (Minimum)**: All pointer targets must have an area of at least 24×24 CSS pixels or sufficient spacing.
- **3.2.6 Consistent Help**: Position help links, forms, and chatbots consistently across pages.
- **3.3.7 Redundant Entry**: Re-use previously entered information across steps (e.g., "Billing matches shipping").
- **3.3.8 Accessible Authentication (Minimum)**: No cognitive tests (memorizing passwords without paste support, solving puzzles). Enable clipboard paste and password managers; prefer WebAuthn / Passkeys.
- **4.1.1 Parsing**: Obsolete in WCAG 2.2. Focus on valid attributes and 4.1.2 Name, Role, Value.

### Core Standards
- **Semantic HTML**: Use `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`, `<button>`, `<table>`, `<dialog>`. Never use plain `<div>` for buttons without ARIA roles and keyboard handlers.
- **Color & Contrast**: Minimum 4.5:1 for normal text (< 24px) and 3:1 for large text (≥ 24px) and UI components. Never convey information through color alone.
- **Focus Visibility**: Never use `outline: none` without providing an equivalent high-contrast focus ring (e.g., `outline: 2px solid #005fcc; outline-offset: 2px;`).
- **Forms**: Explicitly connect labels (`<label for="...">`) and error messages (`aria-invalid="true"`, `aria-describedby="[error-id]"`).
- **Modals**: Implement focus trapping, `Escape` key close, and focus restoration to the trigger element.
- **Automated Testing**: Test with `@axe-core/playwright` or `@axe-core/react` with zero violations.
```
