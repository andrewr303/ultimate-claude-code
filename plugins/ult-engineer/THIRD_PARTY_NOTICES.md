# Third-Party Notices

Ult Engineer bundles and adapts work from the skill collections in this workspace. Skill text was adapted where needed (command namespaces, cross-references, router wrappers); substantive content is theirs.

## Bundled skill content

| Component in this plugin | Upstream | License |
|---|---|---|
| `skills/ast-grep-search`, `bulk-sweep-classify`, `code-antipatterns`, `code-complexity`, `code-dead-code`, `code-dep-audit`, `code-docs-quality`, `code-hidden-failures`, `code-lint`, `code-refactor`, `code-review`, `code-review-checklist`, `code-test-quality`, `debugging-methodology`, `dry-consolidation`, plus `hooks/ult-engineer-preflight-cue.sh` and its test | `code-quality-plugin` v1.22.1 by Lauri Gates — https://github.com/laurigates/claude-plugins, via `avr-debug` | MIT |
| `skills/debugging-code` (including `references/` and `scripts/install-dap.sh`) | `debug-skill` v1.1.2 by Almog Baku — https://github.com/AlmogBaku/debug-skill | MIT — Copyright (c) 2025 Almog Baku |
| `skills/debug-agent`, `skills/web-performance` | `debug-agent` by Million Software, Inc. / Aiden Bai — https://github.com/aidenybai/debug-agent | MIT — Copyright (c) 2026 Million Software, Inc. |
| `skills/knip-dead-code`, `nodejs-development`, `typescript-debugging`, `typescript-sentry`, `typescript-strict` | Bundled via `avr-debug`; the archives carried no license or author metadata | Unspecified |
| `skills/javascript`, `test`, `nodejs` (pattern catalogs), `commands/scaffold.md` | `javascript-typescript` plugin (Seth Hobson) | MIT |
| `skills/effective-typescript` | Effective TypeScript skill (Dan Vanderkam items) | MIT |
| `skills/react-doctor`, `improve-react`, `improve-threejs`, `react-runtime` | React Doctor (https://react.doctor) | See `vendor/react-doctor` |
| `skills/react-patterns`, `react-ui-patterns`, `nodejs-best-practices`, `code-polish`, `typescript-expert`, `debt` playbooks, `refactor` playbooks | Community skills in this workspace | As shipped in `vendor/` |

## Distilled skills (no upstream engine vendored)

| Component | Upstream the skill teaches | Upstream license |
|---|---|---|
| `skills/semgrep-scan` | Semgrep — https://github.com/semgrep/semgrep | LGPL-2.1 (engine); the skill is original documentation |
| `skills/openrewrite-recipes` | OpenRewrite — https://github.com/openrewrite/rewrite | Apache-2.0 (framework); the skill is original documentation |

External tools invoked by skills (`dap`, `semgrep`, `ast-grep`, `knip`, `debug-agent`, `react-doctor`, debug backends like `debugpy`/`dlv`/`js-debug`) are installed by the user from their official distribution channels and remain under their own licenses.

Original copies live in `vendor/`.
