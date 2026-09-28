# Cline & Roo Code Setup Instructions: WCAG 2.2 Rules

Cline and Roo Code are autonomous AI coding extensions for VS Code that read workspace-level system rules from `.clinerules` in the root of the project.

## Quick Setup

Choose either **Level AA** (recommended legal standard) or **Level AAA** (enhanced):

### Option 1: WCAG 2.2 Level AA (Standard Baseline)

Copy `wcag-22-aa.clinerules` to `.clinerules` in your project root:

```bash
cp /path/to/wcag-22-skills/templates/cline/wcag-22-aa.clinerules /path/to/your-project/.clinerules
```

### Option 2: WCAG 2.2 Level AAA (High Accessibility)

Copy `wcag-22-aaa.clinerules` to `.clinerules` in your project root:

```bash
cp /path/to/wcag-22-skills/templates/cline/wcag-22-aaa.clinerules /path/to/your-project/.clinerules
```

## How It Works in Cline & Roo Code

- **System Prompt Injection**: Whenever Cline executes a task or generates code in your workspace, it injects the contents of `.clinerules` into its core system prompt.
- **Roo Code Support**: Roo Code also supports `.clinerules` or mode-specific rules in `.roomodes`.
