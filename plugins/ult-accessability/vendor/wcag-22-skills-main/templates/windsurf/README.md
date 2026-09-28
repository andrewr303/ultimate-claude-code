# Windsurf Setup Instructions: WCAG 2.2 Rules

Windsurf (by Codeium) supports workspace-level rules for its Cascade AI agent through a `.windsurfrules` file in the root of your project.

## Quick Setup

Choose either **Level AA** (recommended standard) or **Level AAA** (enhanced):

### Option 1: WCAG 2.2 Level AA (Standard Baseline)

Copy `wcag-22-aa.windsurfrules` to `.windsurfrules` in your project root:

```bash
cp /path/to/wcag-22-skills/templates/windsurf/wcag-22-aa.windsurfrules /path/to/your-project/.windsurfrules
```

### Option 2: WCAG 2.2 Level AAA (High Accessibility)

Copy `wcag-22-aaa.windsurfrules` to `.windsurfrules` in your project root:

```bash
cp /path/to/wcag-22-skills/templates/windsurf/wcag-22-aaa.windsurfrules /path/to/your-project/.windsurfrules
```

## How It Works in Windsurf

- **Cascade AI Agent**: Whenever Cascade plans, writes code, edits components, or generates UI, it reads `.windsurfrules` and enforces these accessibility standards automatically.
- **Global Rules Option**: Alternatively, you can copy the contents of these rule files into Windsurf's global memories:
  `~/.codeium/windsurf/memories/global_rules.md`
