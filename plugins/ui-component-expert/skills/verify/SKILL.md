---
name: verify
description: Execute multi-stage QA verification across target npm scripts, 8-state harnesses, axe-core accessibility, and real-browser visual checks.
argument-hint: "--workspace <run-path> --contract <contract-path> --target <target-path> --generated <generated-path> [--run-checks]"
---

# Multi-Stage Component Verification

Replace `<plugin-root>` in CLI examples with the absolute directory two levels above this skill file (`skills/verify/SKILL.md`); Claude Code may use `${CLAUDE_PLUGIN_ROOT}` instead. Never execute the literal placeholder.

Coordinates quality assurance across target npm build scripts, 8-state harness preview, and browser-gated accessibility checks.

Verification executes **ONLY on separately authored and reviewed TypeScript components** within `<workspace>/generated/`. Untrusted raw design export files are NEVER rendered or executed.

## CLI Command

```bash
node "<plugin-root>/scripts/cli.mjs" run-verification --workspace "<run-path>" --contract "<contract-path>" --target "<target-path>" --generated "<generated-path>" [--run-checks] [--browser-evidence "<evidence-path>"]
```

### CLI Execution Scope
- By default (`--run-checks` omitted), script checks are recorded as `NOT_EVALUATED`.
- When `--run-checks` is supplied, the CLI executes **only the target project's declared npm scripts** (`typecheck`, `test`, `build`) with a 120-second timeout per script. If a script is not declared in `package.json`, it reports `BLOCKED`.
- The CLI does NOT include a built-in browser engine or embedded axe-core. In the verification report, `browser.status` is always `BLOCKED`. If `--browser-evidence` is supplied from an external run, the evidence is retained as `untrustedReport` with `status: 'BLOCKED'` and an explicit explanation that an external report cannot self-certify browser verification.
- The overall CLI verification report records `status: 'NOT_VERIFIED'`.

## Responsibilities of the Active Host Agent

Because the CLI engine does not include an embedded browser, the host agent performs the following checks when an authorized runtime is available. Browser evidence is reported separately from the CLI's `BLOCKED` result:

### 1. 8-State Harness Inspection
- Inspect the generated `[ComponentName].harness.tsx` file to confirm that all 8 canonical states (`default`, `hover`, `focus`, `active`, `disabled`, `loading`, `error`, `selected`) are accounted for:
  - Applicable states render appropriate visual tokens.
  - Non-applicable states carry explicit, justified non-empty `reason` strings.
  - Native controls (buttons, inputs) rely on native `disabled` without redundant `aria-disabled="true"`.
  - `aria-invalid="true"` is applied strictly to invalid form inputs.
  - Selection states are role-appropriate (`aria-selected` on tabs/options, `aria-pressed` on toggle buttons, `aria-checked` on checkboxes/radios).
  - Focus indicator: 2px solid with 3:1 contrast as an ergonomic baseline working toward WCAG 2.2 AAA 2.4.13, satisfying AA 2.4.7 focus visible.

### 2. Browser-Gated Visual & axe-core Audits
- **Browser Runtime**: In Claude Code, use **BrowserOS neo** (skill `browseros-neo`) as required by that host's workflow. Kimi and Codex may use only a browser runtime explicitly available and authorized in their host; no browser is bundled by this plugin.
- **Connection Gate**: If the host's authorized browser runtime is unavailable, report visual rendering and DOM axe checks as **`BLOCKED`**. Having a browser alone does not prove axe ran; report axe separately if it was not executed.
- **No Silent Fallback**: Never silently switch to Playwright, Puppeteer, or headless Chrome.
- **No Static axe Proof**: Static code analysis cannot certify accessibility; color contrast, accessible name computation, and live ARIA trees require a computed browser DOM.

## Gate Reporting Vocabulary

All checks report strictly using four categorical verdicts:
- **`PASS`**: The check was actively executed by a tool and observed to succeed without errors.
- **`FAIL`**: The check was actively executed and one or more criteria failed (with cited diagnostics).
- **`BLOCKED`**: The check could not execute because an essential prerequisite was missing (e.g. script not declared in `package.json`, or BrowserOS neo disconnected).
- **`NOT_EVALUATED`**: The check was omitted from the current pass.

Never mark an unexecuted or blocked check as `PASS`.

## Correction Loop

If any stage reports `FAIL`:
1. Analyze the exact failure diagnostic from the test output or browser inspection.
2. Apply a focused code correction to the generated component in `<workspace>/generated/`.
3. Re-run verification on the corrected file.
4. Bounded limit: Maximum 3 correction iterations. If errors persist after 3 attempts, halt and write diagnostics to `<workspace>/verification-report.json`.
