# Contributing to WCAG 2.2 Skills & Standards

Thank you for your interest in contributing! We welcome contributions to help improve accessibility tooling, component patterns, automated test suites, and IDE templates.

## How You Can Contribute

1. **New UI Component Patterns**: Add accessible, keyboard-operable, screen-reader-tested patterns (e.g., Combobox, Treeview, Mega Menus, Datepickers) for Level AA or AAA.
2. **Additional IDE / Tool Support**: Add templates or rules for other AI assistants, editors, or linting systems.
3. **Automated Testing Suites**: Contribute test runners, Playwright/Cypress recipes, or axe-core auditing rules.
4. **Clarifications & Updates**: Keep WCAG 2.2 criterion interpretations and legal standards up-to-date with current W3C recommendations and legal guidance (ADA, EAA, Section 508).

## Development Workflow

1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/your-username/wcag-22-skills.git
   cd wcag-22-skills
   ```
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/add-new-ide-template
   ```
3. **Make Your Changes**:
   - If adding a new IDE template:
     - Place files under `templates/<tool_name>/`.
     - Update `install.sh` to include the new tool.
     - Add a `README.md` inside `templates/<tool_name>/`.
     - Update the root `README.md` table and tree.
   - If improving skills:
     - Keep guidelines aligned with official [W3C WCAG 2.2 Recommendations](https://www.w3.org/TR/WCAG22/).
4. **Test Your Changes**:
   - Test `./install.sh` against a temporary directory:
     ```bash
     ./install.sh <ide> aa /tmp/test-project
     ```
5. **Commit and Push**:
   ```bash
   git add .
   git commit -m "feat: add support for <tool_name>"
   git push origin feature/add-new-ide-template
   ```
6. **Open a Pull Request**:
   - Describe what changed and provide examples or testing steps.

## Code of Conduct

Please be respectful, constructive, and inclusive in all discussions and contributions.

## License

By contributing to this repository, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
