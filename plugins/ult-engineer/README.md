# Ult Engineer

Ultimate TypeScript / React / Node.js engineering plugin for **Claude Code**, **Codex**, and **Kimi Code**.

One default entry — `ult-engineer` — routes the agent to the specialist for writing features, evidence-based debugging, behavior-preserving refactors, structured review, repo health, types, React, Node, tests, or tech debt.

Debugging and the scanner bench come from **AVR Debug**: DAP stepping, NDJSON instrumentation, LoAF traces, ast-grep, hidden-failure scans, knip, Semgrep.

## Skills

| Skill | Use when |
|-------|----------|
| **ult-engineer** | Default router. Broad "help with this code" / mixed request |
| **write** | New feature, implement, scaffold |
| **debug** | Bug, crash, wrong output, why is this broken |
| **refactor** | Cleanup, DRY, extract, SOLID, no behavior change |
| **review** | PR review, is this safe |
| **health** | Full repo scorecard (read-only) |
| **typescript** | Types, tsconfig, `any`, migrate to TS |
| **react** | Components, hooks, UI states, React Doctor |
| **nodejs** | APIs, workers, Express/Fastify/Nest/Hono |
| **javascript** | ES6+, promises, modernize JS |
| **test** | Vitest, Jest, Testing Library, TDD |
| **debt** | Tech debt inventory, CVEs, upgrades |
| **code-polish** | Comments / whitespace only |

Deeper AVR / scanner skills (`debug-agent`, `debugging-code`, `code-hidden-failures`, `code-antipatterns`, `knip-dead-code`, …) load only when a specialist names them.

## Commands

| Command | What it does |
|---------|--------------|
| `/ult-engineer` | Router |
| `/ult-engineer:debug <bug>` | Evidence-first debug |
| `/ult-engineer:health [path]` | Read-only scorecard |
| `/ult-engineer:refactor <target>` | Behavior-preserving refactor |
| `/ult-engineer:review [path]` | Structured review |
| `/ult-engineer:write <feature>` | Implement in-repo style |
| `/ult-engineer:typescript` | Types / tsconfig |
| `/ult-engineer:react` | React / React Doctor |
| `/ult-engineer:nodejs` | Node backends |
| `/ult-engineer:setup [--check-only]` | Toolchain probe |
| `/ult-engineer:scaffold` | New TS project |

## Agents

| Agent | Role |
|-------|------|
| `root-cause-debugger` | Evidence-first; fixes only what runtime proof convicts |
| `health-auditor` | Read-only scorecard; changes nothing |
| `refactor-engineer` | Characterization tests, one smell per slice |
| `typescript-engineer` | Types, tsconfig, migration |
| `react-engineer` | Components, UI states, React Doctor |
| `nodejs-engineer` | APIs, auth, jobs |

## Hook

A `PostToolUse` cue on Edit/Write: when a structural edit lands (public symbols, key manifests, 50+ line payloads in lintable files), it suggests `/ult-engineer:code-lint` — once per session, never blocking. Silence it with `ULT_ENGINEER_SKIP_HOOKS=1`. Regression-tested in `hooks/test-ult-engineer-preflight-cue.sh`.

## Install

### Claude Code

From this folder:

```text
/plugin marketplace add .
/plugin install ult-engineer@ult-engineer
```

Slash commands: `/ult-engineer`, `/ult-engineer:debug`, `/ult-engineer:health`, `/ult-engineer:refactor`, `/ult-engineer:review`.

### Codex (CLI v0.122+)

```bash
codex plugin marketplace add /path/to/ult-engineer
```

Invoke with `@ult-engineer`, `@debug`, `@refactor`, and so on.

The Codex adapter lives in `codex/` (`codex/skills` is a junction to `skills/`). On a machine that cannot create junctions:

```powershell
Remove-Item -Recurse -Force codex\skills
Copy-Item -Recurse skills codex\skills
```

### Kimi Code

Install this directory as a plugin. `kimi.plugin.json` sets `sessionStart.skill` to `ult-engineer`.

```text
/skill:ult-engineer
```

### Gemini CLI

```bash
gemini extensions install /path/to/ult-engineer
```

## How the agent should work

1. Load **ult-engineer** and route.
2. Detect stack from `package.json` / `tsconfig.json` / neighboring files.
3. Bugs: hypotheses, then runtime evidence, then a minimal fix.
4. Refactors: characterize, slice, keep the contract, run tests.
5. Do not invent scanner or compiler numbers.

## Layout

```
skills/<name>/SKILL.md   canonical skills
commands/                Claude slash commands
agents/                  debugger, auditor, language specialists
hooks/                   pre-flight lint cue
codex/                   Codex plugin adapter
kimi.plugin.json         Kimi plugin manifest
.claude-plugin/          Claude plugin + marketplace
.codex-plugin/           Codex manifest (repo-root install)
vendor/                  unmodified upstream sources
```

## Validate

```bash
node scripts/validate-plugin.mjs
```

## License

MIT. Upstream notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
