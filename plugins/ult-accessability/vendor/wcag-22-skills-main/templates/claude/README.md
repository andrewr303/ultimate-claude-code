# Claude Code Setup Instructions: WCAG 2.2 Rules

Claude Code (the CLI coding agent by Anthropic) reads project memory and developer guidelines from `CLAUDE.md` in the root of your project.

## Quick Setup

### Option 1: Append WCAG 2.2 Level AA Rules (Recommended)

Append the Level AA snippet to your project's `CLAUDE.md`:

```bash
cat /path/to/wcag-22-skills/templates/claude/CLAUDE-wcag-22-aa.md >> /path/to/your-project/CLAUDE.md
```

### Option 2: Append WCAG 2.2 Level AAA Rules (High Accessibility)

Append the Level AAA snippet to your project's `CLAUDE.md`:

```bash
cat /path/to/wcag-22-skills/templates/claude/CLAUDE-wcag-22-aaa.md >> /path/to/your-project/CLAUDE.md
```

## How It Works in Claude Code

- Every command and query run through Claude Code automatically ingests `CLAUDE.md`.
- Claude Code will apply the accessibility principles when generating code, refactoring components, and writing tests.
