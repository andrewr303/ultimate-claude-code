# Third-Party Notices

AVR Debug bundles and adapts work from several upstream projects. Skill text was
adapted where needed (command namespaces, cross-references); substantive content
is theirs.

## Bundled skill content

| Component in this plugin | Upstream | License |
|---|---|---|
| `skills/ast-grep-search`, `bulk-sweep-classify`, `code-antipatterns`, `code-complexity`, `code-dead-code`, `code-dep-audit`, `code-docs-quality`, `code-hidden-failures`, `code-lint`, `code-refactor`, `code-review`, `code-review-checklist`, `code-test-quality`, `debugging-methodology`, `dry-consolidation`, plus `hooks/avr-debug-preflight-cue.sh` and its test | `code-quality-plugin` v1.22.1 by Lauri Gates — https://github.com/laurigates/claude-plugins | MIT |
| `skills/debugging-code` (including `references/` and `scripts/install-dap.sh`) | `debug-skill` v1.1.2 by Almog Baku — https://github.com/AlmogBaku/debug-skill (the `dap` CLI it drives is installed separately from that repo's releases) | MIT — Copyright (c) 2025 Almog Baku |
| `skills/debug-agent`, `skills/web-performance` | `debug-agent` by Million Software, Inc. / Aiden Bai — https://github.com/aidenybai/debug-agent (the `debug-agent` server runs via `npx debug-agent`) | MIT — Copyright (c) 2026 Million Software, Inc. |
| `skills/knip-dead-code`, `nodejs-development`, `typescript-debugging`, `typescript-sentry`, `typescript-strict` | Bundled from the source archives provided for this plugin; the archives carried no license or author metadata | Unspecified |

## Distilled skills (no upstream code vendored)

| Component | Upstream the skill teaches | Upstream license |
|---|---|---|
| `skills/semgrep-scan` | Semgrep — https://github.com/semgrep/semgrep | LGPL-2.1 (engine); the skill is original documentation, no engine code included |
| `skills/openrewrite-recipes` | OpenRewrite — https://github.com/openrewrite/rewrite | Apache-2.0 (framework); the skill is original documentation, no framework code included |

External tools invoked by skills (`dap`, `semgrep`, `ast-grep`, `knip`,
`debug-agent`, OpenRewrite build plugins, debug backends like `debugpy`/`dlv`)
are installed by the user from their official distribution channels and remain
under their own licenses.
