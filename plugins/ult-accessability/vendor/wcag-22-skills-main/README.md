# WCAG 2.2 Web Development Standards & Skills (AA & AAA)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Definitive engineering standards, checklists, and code patterns for building web applications compliant with **WCAG 2.2 Level AA** and **Level AAA**.

---

## Repository Structure

```
wcag-22-skills/
├── LICENSE                               # MIT Open Source License
├── CONTRIBUTING.md                       # Contribution guidelines & workflow
├── README.md                             # Main documentation & IDE setup guide
├── install.sh                            # One-line installer script for any IDE & project
├── templates/                            # Ready-to-use rule & prompt templates
│   ├── cursor/                           # Cursor rules (.mdc)
│   │   ├── wcag-22-aa.mdc
│   │   ├── wcag-22-aaa.mdc
│   │   └── README.md
│   ├── copilot/                          # GitHub Copilot custom instructions
│   │   ├── wcag-22-aa.copilot-instructions.md
│   │   ├── wcag-22-aaa.copilot-instructions.md
│   │   └── README.md
│   ├── windsurf/                         # Windsurf Cascade rules (.windsurfrules)
│   │   ├── wcag-22-aa.windsurfrules
│   │   ├── wcag-22-aaa.windsurfrules
│   │   └── README.md
│   ├── cline/                            # Cline & Roo Code rules (.clinerules)
│   │   ├── wcag-22-aa.clinerules
│   │   ├── wcag-22-aaa.clinerules
│   │   └── README.md
│   └── claude/                           # Claude Code CLI memory snippet (CLAUDE.md)
│       ├── CLAUDE-wcag-22-aa.md
│       ├── CLAUDE-wcag-22-aaa.md
│       └── README.md
├── wcag-22-aa/
│   ├── SKILL.md                          # WCAG 2.2 Level AA Standard Guide
│   └── references/
│       ├── checklist-aa.md               # Complete Level A & AA Conformance Checklist
│       └── code-patterns-aa.md           # Accessible component library & UI patterns
└── wcag-22-aaa/
    ├── SKILL.md                          # WCAG 2.2 Level AAA Standard Guide
    └── references/
        ├── checklist-aaa.md              # Complete Level AAA Conformance Checklist
        └── code-patterns-aaa.md          # Enhanced AAA component & focus calculations
```

---

## 1. `wcag-22-aa` (Level AA Standard Guide)

- **Target Audience & Compliance**: Standard baseline for ADA Title II/III, EU European Accessibility Act (EN 301 549), US Section 508, and AODA.
- **Key Features**:
  - **New WCAG 2.2 Criteria (Level A & AA)**:
    - `2.4.11 Focus Not Obscured (Minimum)`: Sticky headers/footers cannot completely hide focused elements.
    - `2.5.7 Dragging Movements`: Reordering/sliders must have single-pointer button alternatives.
    - `2.5.8 Target Size (Minimum)`: Minimum 24×24 CSS px target area or spacing.
    - `3.2.6 Consistent Help`: Support links positioned consistently across pages.
    - `3.3.7 Redundant Entry`: Auto-populate or select previously entered information.
    - `3.3.8 Accessible Authentication (Minimum)`: No cognitive tests without alternatives; clipboard paste enabled.
    - Obsolescence of `4.1.1 Parsing`.
  - **Engineering Patterns**:
    - Accessible Modal Dialog (WAI-ARIA APG pattern with focus trap & escape restoration).
    - Accessible Form Validation with `aria-invalid` and `aria-describedby`.
    - Single-pointer reorder buttons for drag-and-drop lists.
    - Multi-step checkout address synchronizer.
  - **Automated Verification**: Playwright + `@axe-core/playwright` test runner template.

---

## 2. `wcag-22-aaa` (Level AAA Enhanced Standard Guide)

- **Target Audience & Compliance**: Enhanced accessibility for healthcare, government, specialized low-vision software, elderly & cognitive support, and maximum inclusion.
- **Key Features**:
  - **New WCAG 2.2 Criteria (Level AAA)**:
    - `2.4.12 Focus Not Obscured (Enhanced)`: Zero obscurity (100% full visibility).
    - `2.4.13 Focus Appearance`: Focus indicator area ≥ 2px perimeter, 3:1 contrast against unfocused state and adjacent background.
    - `3.3.9 Accessible Authentication (Enhanced)`: Strictly zero cognitive function tests (no object/image recognition, no CAPTCHAs).
  - **Enhanced POUR Requirements**:
    - `1.4.6 Contrast (Enhanced)`: 7:1 for normal text, 4.5:1 for large text.
    - `1.4.8 Visual Presentation`: Max 80-char line width, line height ≥ 1.5, paragraph spacing ≥ 2.25, no justified text, user theme controls.
    - `2.1.3 Keyboard (No Exception)`: Every single feature keyboard-operable without exception.
    - `2.5.5 Target Size (Enhanced)`: Minimum 44×44 CSS px for all interactive elements.
    - `3.1.3 & 3.1.4 Unusual Words & Abbreviations`: Jargon tooltips and `<abbr>` expansions.
    - `3.3.5 Error Prevention (All)`: Reversible submissions and mandatory review/confirmation steps for all forms.
    - `2.2.5 Re-authenticating`: Session expiry form state restoration.

---

## 3. Setup Instructions for Popular IDEs & Coding Assistants

Pre-configured rules and prompt templates are located in [`templates/`](templates/). You can install them into any project either using the automated `./install.sh` script or by manually copying the template file for your IDE.

### Fast Setup via `./install.sh`

Run `./install.sh <ide> <level> [project_directory]`:

```bash
# Install Level AA into current project for Cursor
./install.sh cursor aa

# Install Level AA into another project for GitHub Copilot
./install.sh copilot aa ~/projects/my-web-app

# Install Level AAA into current project for Windsurf
./install.sh windsurf aaa

# Install Level AA into Cline / Roo Code
./install.sh cline aa

# Install all IDE configs at once
./install.sh all aa ~/projects/my-web-app
```

---

### Manual Setup by IDE

#### 1. Cursor (`.cursor/rules/*.mdc`)
Cursor automatically applies rules matching file globs during generation and composer sessions.

- **Level AA**:
  ```bash
  mkdir -p .cursor/rules
  cp templates/cursor/wcag-22-aa.mdc .cursor/rules/
  ```
- **Level AAA**:
  ```bash
  mkdir -p .cursor/rules
  cp templates/cursor/wcag-22-aaa.mdc .cursor/rules/
  ```
- **Usage**: Automatically activates on `**/*.{html,jsx,tsx,vue,svelte,astro,css,scss,js,ts}`. You can also mention `@wcag-22-aa.mdc` directly in Cursor Chat or Composer.

---

#### 2. GitHub Copilot (VS Code, JetBrains, Visual Studio)
GitHub Copilot reads repository-wide instructions from `.github/copilot-instructions.md`.

- **Level AA**:
  ```bash
  mkdir -p .github
  cp templates/copilot/wcag-22-aa.copilot-instructions.md .github/copilot-instructions.md
  ```
- **Level AAA**:
  ```bash
  mkdir -p .github
  cp templates/copilot/wcag-22-aaa.copilot-instructions.md .github/copilot-instructions.md
  ```
- **Supported Environments**:
  - **VS Code**: Copilot Chat automatically loads `.github/copilot-instructions.md`.
  - **JetBrains (IntelliJ, WebStorm, PyCharm)**: Supported by GitHub Copilot plugin.
  - **Visual Studio 2022**: Automatically recognized in v17.10+.
  - **GitHub Pull Requests**: Copilot code review automatically reviews PRs against these rules.

---

#### 3. Windsurf by Codeium (`.windsurfrules`)
Windsurf's Cascade agent reads `.windsurfrules` from the workspace root.

- **Level AA**:
  ```bash
  cp templates/windsurf/wcag-22-aa.windsurfrules .windsurfrules
  ```
- **Level AAA**:
  ```bash
  cp templates/windsurf/wcag-22-aaa.windsurfrules .windsurfrules
  ```
- **Usage**: Cascade automatically incorporates these rules into its context whenever generating or modifying frontend code.

---

#### 4. Cline & Roo Code (`.clinerules`)
Autonomous coding extensions in VS Code read `.clinerules` in the workspace root.

- **Level AA**:
  ```bash
  cp templates/cline/wcag-22-aa.clinerules .clinerules
  ```
- **Level AAA**:
  ```bash
  cp templates/cline/wcag-22-aaa.clinerules .clinerules
  ```
- **Usage**: Injected into the agent's system prompt for all autonomous coding tasks and reviews.

---

#### 5. Claude Code CLI (`CLAUDE.md`)
Anthropic's Claude Code CLI uses `CLAUDE.md` in the project root for project instructions and conventions.

- **Level AA**:
  ```bash
  cat templates/claude/CLAUDE-wcag-22-aa.md >> CLAUDE.md
  ```
- **Level AAA**:
  ```bash
  cat templates/claude/CLAUDE-wcag-22-aaa.md >> CLAUDE.md
  ```

---

#### 6. Google Antigravity & Agent Skills
To use these skills directly in Antigravity or any agent using the Agent Skills specification:

- **Workspace Level**: Place in `<project>/.agents/skills/wcag-22-aa/` and `<project>/.agents/skills/wcag-22-aaa/`.
- **Global Level**: Place in `~/.gemini/config/skills/` (already pre-installed globally).

---

## 4. Contributing & Community

Contributions from accessibility advocates, frontend engineers, and tooling developers are warmly welcomed!
- Review our [Contributing Guidelines](CONTRIBUTING.md) to learn how to propose new accessible component patterns, add templates for additional AI assistants, or enhance automated audit scripts.
- To report bugs or suggest criteria updates, please open an issue or pull request.

---

## 5. License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details. You are free to use, modify, distribute, and integrate these skills and templates in open-source, personal, and commercial software.

