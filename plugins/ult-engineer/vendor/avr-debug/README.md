<div align="center">
  <img src="assets/icon.svg" width="112" alt="AVR Debug icon">
  <h1>AVR Debug</h1>
  <p><strong>Debug with runtime evidence and keep the whole codebase healthy.</strong></p>
</div>

An all-in-one debugging and code-health suite combining interactive DAP debugging, evidence-based log instrumentation, browser performance tracing, TypeScript diagnostics, Semgrep and OpenRewrite passes, and a full code-quality scanner bench.

## What's inside

**25 skills, 3 commands, 2 agents, 1 hook** — merged from four debugging/quality toolkits plus two distilled tool guides, unified under one namespace.

### Debugging (runtime evidence)

| Skill | What it does |
|-------|--------------|
| `debugging-code` | Interactive debugging via the `dap` CLI — breakpoints (conditional/invariant), stepping, live eval, call-stack navigation for Python, Go, Node/TS, Rust, C/C++ |
| `debug-agent` | Evidence-based debugging: hypotheses → NDJSON log instrumentation → reproduction → cited-log analysis → verified fix. Local and remote modes |
| `web-performance` | Browser jank/INP/LCP/CLS debugging with `PerformanceObserver`, LoAF-first attribution to exact source functions |
| `debugging-methodology` | Hypothesis-driven methodology when no debugger is available — bisection, first divergence, minimal repro |
| `typescript-debugging` | Bun/Node inspector setup, `debug.bun.sh`, VSCode launch.json, heap snapshots, `--cpu-prof`, sourcemaps |
| `typescript-sentry` | Production error monitoring with Sentry — capture, spans, cron monitors, source maps, profiling |

### Code health (scanner bench)

| Skill | What it does |
|-------|--------------|
| `code-review` | Comprehensive review with automated fixes |
| `code-review-checklist` | Structured review rubric |
| `code-antipatterns` | ast-grep anti-pattern scan (bundled rules for JS/TS, Python, Vue) |
| `code-hidden-failures` | Swallowed errors (`\|\| true`, empty catch, floating promises, ignored Go/Rust errors) and silent degradation, with bundled rules for five languages |
| `code-lint` | Universal linter — auto-detects ruff/eslint/biome/clippy/gofmt/shellcheck, `--fix` support |
| `code-complexity` | Cyclomatic/cognitive complexity, function length, coupling hotspots |
| `code-dead-code` | Unused exports, unreachable branches, orphaned files |
| `code-dep-audit` | CVEs, outdated packages, license compliance (scripted, multi-ecosystem) |
| `code-test-quality` | Test smells, empty assertions, flaky patterns |
| `code-docs-quality` | PRD/ADR/README/CLAUDE.md quality analysis |
| `code-refactor` | Functional refactoring — pure functions, immutability, composition |
| `dry-consolidation` | Find duplicated code and extract shared, tested abstractions |
| `ast-grep-search` | Structural AST search/replace primitives |
| `bulk-sweep-classify` | Safe bulk renames/sweeps — structural routing for code, classify-then-transform for prose |
| `semgrep-scan` | Semantic scanning and taint mode across 30+ languages; custom YAML rules; CI wiring |
| `openrewrite-recipes` | Type-safe remediation at scale for JVM repos — migrations, static-analysis fixes, dry-run first |

### TypeScript/Node stack

| Skill | What it does |
|-------|--------------|
| `typescript-strict` | Strict tsconfig, flags, moduleResolution, verbatimModuleSyntax |
| `nodejs-development` | Bun, Vite, Vue 3, Pinia, modern JS/TS tooling |
| `knip-dead-code` | Knip for unused files, deps, exports, types in JS/TS; CI enforcement |

### Commands

| Command | What it does |
|---------|--------------|
| `/avr-debug:debug <bug>` | Triage the failure and route it to the right debugging discipline, then drive it to a verified root cause |
| `/avr-debug:health [path]` | Read-only sweep across all health dimensions → one prioritized scorecard |
| `/avr-debug:setup [--check-only]` | Verify/install the external toolchain (ast-grep, semgrep, dap, node, knip, jq) |

### Agents

| Agent | Role |
|-------|------|
| `avr-root-cause-debugger` | Evidence-first debugging specialist; fixes only what runtime proof convicts |
| `avr-health-auditor` | Read-only auditor; returns a scorecard and remediation order, changes nothing |

### Hook

A `PostToolUse` cue on Edit/Write: when a structural edit lands (public symbols, key manifests, 50+ line payloads in lintable files), it suggests a `/avr-debug:code-lint` pre-flight — once per session, never blocking. Silence it with `AVR_DEBUG_SKIP_HOOKS=1`. Regression-tested in `hooks/test-avr-debug-preflight-cue.sh`.

## External tools

Skills degrade gracefully when a tool is missing and tell you what to install; `/avr-debug:setup` automates the check. Optional: `ast-grep`, `semgrep`, `dap` (installer bundled at `skills/debugging-code/scripts/install-dap.sh`), `node`/`npx` (for `debug-agent`, `knip`), `jq`, plus per-language debug backends (`debugpy`, `dlv`, `js-debug`, `codelldb`) documented in `skills/debugging-code/references/installing-debuggers.md`.

## Install

Add the Codex Plugin Lab marketplace and install this plugin:

```
/plugin marketplace add andrewr303/claude-codex-plugin-lab
/plugin install avr-debug@codex-plugin-lab
```

## Use

Say what you want in plain language ("debug this crash", "why is this page janky", "audit this repo's health", "find dead code") and the matching skill activates — or reach for the commands above directly.

## Attribution

This plugin merges content from `code-quality-plugin` by Lauri Gates (MIT), `debug-skill` by Almog Baku (MIT), `debug-agent` by Million Software, Inc. (MIT), a TypeScript/Node skill collection, and original skills distilled from Semgrep and OpenRewrite documentation. Details in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
