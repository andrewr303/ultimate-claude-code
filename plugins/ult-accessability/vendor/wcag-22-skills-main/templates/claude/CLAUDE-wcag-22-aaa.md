# WCAG 2.2 Level AAA Guidelines for Claude Code

Add this section to your project's `CLAUDE.md`:

```markdown
## Enhanced Accessibility Engineering Standards (WCAG 2.2 Level AAA)

All frontend code, UI components, HTML templates, and CSS stylesheets must strictly comply with WCAG 2.2 Level AAA (enhanced high-accessibility standard):

### Enhanced WCAG 2.2 Success Criteria
- **2.4.12 Focus Not Obscured (Enhanced)**: Elements receiving focus must have zero percent (0%) obscurity from sticky navigation or floating widgets.
- **2.4.13 Focus Appearance**: Focus indicator area must be at least as large as a 2px perimeter around the control, with at least 3:1 contrast against both unfocused state and adjacent background (dual-ring focus pattern).
- **2.5.5 Target Size (Enhanced)**: All interactive targets must be at least 44×44 CSS pixels.
- **3.3.9 Accessible Authentication (Enhanced)**: Zero cognitive function tests (no CAPTCHAs, no math puzzles, and strictly no object/image recognition tests). Use passwordless WebAuthn / Passkeys or magic links.

### Enhanced Principles
- **Contrast (Enhanced) (1.4.6)**: Minimum 7:1 for normal text (< 24px) and 4.5:1 for large text (≥ 24px).
- **Visual Presentation (1.4.8)**: Max line length 80 characters (`max-width: 75ch;`), line height ≥ 1.5, paragraph spacing ≥ 2.25 times font size, never use `text-align: justify`, provide user theme controls.
- **Keyboard (No Exception) (2.1.3)**: 100% of all features and widgets operable via keyboard with zero exceptions.
- **Jargon & Abbreviations (3.1.3 & 3.1.4)**: Wrap technical terms in `<dfn>` with glossaries; expand all abbreviations using `<abbr title="...">`.
- **Error Prevention (All) (3.3.5)**: Reversible actions, real-time error checking, or a mandatory confirmation review step for all forms.
```
