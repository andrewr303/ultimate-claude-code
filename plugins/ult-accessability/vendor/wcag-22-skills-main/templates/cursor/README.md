# Cursor Setup Instructions: WCAG 2.2 Rules

Cursor supports project-level rules stored as `.mdc` files in `.cursor/rules/`.

## Quick Setup

Choose either **Level AA** (the standard baseline for ADA, Section 508, and EN 301 549) or **Level AAA** (enhanced accessibility):

### Option 1: WCAG 2.2 Level AA (Recommended for most projects)

Copy `wcag-22-aa.mdc` into your project's `.cursor/rules/` directory:

```bash
mkdir -p .cursor/rules
cp /path/to/wcag-22-skills/templates/cursor/wcag-22-aa.mdc .cursor/rules/
```

### Option 2: WCAG 2.2 Level AAA (For healthcare, government & high-accessibility)

Copy `wcag-22-aaa.mdc` into your project's `.cursor/rules/` directory:

```bash
mkdir -p .cursor/rules
cp /path/to/wcag-22-skills/templates/cursor/wcag-22-aaa.mdc .cursor/rules/
```

## How It Works in Cursor

- **File Matching**: The rule automatically activates whenever you open, edit, or generate files matching:
  `**/*.{html,htm,jsx,tsx,vue,svelte,astro,css,scss,less,js,ts}`
- **Cursor Composer & Chat**: Cursor will reference these accessibility rules when generating components, styles, forms, and dialogs.
- **Manual Invocation**: You can explicitly reference the rule in chat or composer by typing `@wcag-22-aa.mdc` or `@wcag-22-aaa.mdc`.
