# GitHub Copilot Setup Instructions: WCAG 2.2 Rules

GitHub Copilot supports repository-wide custom instructions using `.github/copilot-instructions.md`.

## Quick Setup

Choose either **Level AA** or **Level AAA** for your repository:

### Option 1: WCAG 2.2 Level AA (Recommended for standard compliance)

Copy `wcag-22-aa.copilot-instructions.md` into your repository root as `.github/copilot-instructions.md`:

```bash
mkdir -p .github
cp /path/to/wcag-22-skills/templates/copilot/wcag-22-aa.copilot-instructions.md .github/copilot-instructions.md
```

### Option 2: WCAG 2.2 Level AAA (For enhanced accessibility)

Copy `wcag-22-aaa.copilot-instructions.md` into your repository root as `.github/copilot-instructions.md`:

```bash
mkdir -p .github
cp /path/to/wcag-22-skills/templates/copilot/wcag-22-aaa.copilot-instructions.md .github/copilot-instructions.md
```

## How It Works

- **Automatic Inclusion**: Whenever you ask GitHub Copilot Chat questions, use code generation, or trigger inline suggestions, Copilot automatically includes the content of `.github/copilot-instructions.md` in its prompt context.
- **Supported IDEs**:
  - **VS Code**: Built-in support when GitHub Copilot Chat extension is enabled.
  - **JetBrains IDEs (IntelliJ, WebStorm, PyCharm)**: GitHub Copilot plugin automatically respects `.github/copilot-instructions.md`.
  - **Visual Studio**: Supported in Visual Studio 2022 v17.10+.
  - **GitHub PR Reviews**: Copilot code review automatically reviews pull requests against these instructions.

### VS Code Settings Alternative
If you prefer user-level or workspace settings instead of committing a file:
In `.vscode/settings.json`:
```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": ".github/copilot-instructions.md"
    }
  ]
}
```
