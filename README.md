<div align="center">

# Ultimate Claude Code

**Five plugins that make Claude Code write, debug, audit, plan and design like a senior team.**

![Plugins](https://img.shields.io/badge/plugins-5-0ECFE0?style=for-the-badge)
![Skills](https://img.shields.io/badge/skills-107-7C3AED?style=for-the-badge)
![Agents](https://img.shields.io/badge/agents-15-F59E0B?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-22C55E?style=for-the-badge)

[Plugins](#the-plugins) · [Install](#install) · [Repo layout](#repo-layout) · [Rebuild](#rebuild-the-upload-files) · [Credits](#credits-and-inspiration)

</div>

---

## Why this exists

A coding agent is only as good as the playbook it loads. Each plugin here packs one discipline into skills, slash commands and sub-agents that Claude Code picks up on demand:

- **Evidence over guesses.** Debugging starts with a hypothesis and runtime proof, not a patch.
- **Measured, not assumed.** Performance and accessibility claims come with numbers and WCAG criteria.
- **Specs before code.** Planning turns ideas into requirements with acceptance criteria and readiness scores.
- **Design that ships.** Design exports become typed contracts and accessible components.

Each plugin ships as a ready-to-upload `.plugin` file (claude.ai) and as a plain source folder (Claude Code, Codex, Kimi).

---

## The plugins

| | Plugin | What it does | Skills | Agents |
|---|---|---|---:|---:|
| 🛠️ | [**ult-engineer**](plugins/ult-engineer) | Write, debug, refactor, review and health-audit TypeScript, React and Node.js. Evidence-first debugging with DAP, NDJSON logs and LoAF traces. | 47 | 6 |
| ⚡ | [**ult-performance**](plugins/ult-performance) | Measured Core Web Vitals, loading, interaction, media, scroll and animation audits, with SEO and best-practice checks. | 11 | 1 |
| ♿ | [**ult-accessability**](plugins/ult-accessability) | WCAG 2.2 AA and AAA audits, contrast and color work, remediation, testing and before/after reports. | 7 | 1 |
| 📐 | [**ultimate-sdd**](plugins/ultimate-sdd) | Local-first spec-driven development: PRDs, EPICs, REQs, verifiable TASKs, change deltas and delivery pipelines. Python stdlib only. | 31 | 7 |
| 🧩 | [**ui-component-expert**](plugins/ui-component-expert) | Turns Claude Design exports into typed design contracts and bespoke TypeScript components on headless primitives. **Experimental (0.1.0).** | 11 | 0 |

Every plugin has a default skill that routes a plain-language request to the right specialist, so `ult-engineer`, `ult-performance` and `ult-accessability` work with no command memorization.

### Highlights

<details>
<summary><b>ult-engineer</b>: router-first engineering suite</summary>

- Default skill routes to `write`, `debug`, `refactor`, `review`, `health`, `typescript`, `react`, `nodejs`, `javascript`, `test`, `debt` or `code-polish`.
- Debugging engine: hypotheses first, then DAP breakpoints, NDJSON instrumentation or browser performance traces.
- Read-only code-health scanner bench: lint, anti-patterns, hidden failures, dead code, complexity, dependencies, test quality, docs.
- A once-per-session PostToolUse cue suggests a lint pre-flight after structural edits.
- Run `/ult-engineer:setup` to check the external tools it relies on (`ast-grep`, `semgrep`, `dap`, `knip`, `jq`).
</details>

<details>
<summary><b>ult-performance</b>: numbers before opinions</summary>

- Core Web Vitals (LCP, INP, CLS), loading, interaction, media and scroll playbooks.
- 49 Chrome DevTools measurement scripts with return-value schemas.
- A scroll auditor script for jank in source code.
</details>

<details>
<summary><b>ult-accessability</b>: WCAG 2.2 you can cite</summary>

- Audit from a URL, a screenshot or markup, with success-criterion citations and a severity model.
- Separate AA and AAA engineering guides, including the new 2.2 criteria.
- A contrast checker script backed by a large color-theory reference set.
</details>

<details>
<summary><b>ultimate-sdd</b>: specs that survive contact with code</summary>

- Layers: Context, PRD, Plan, Change, Pipeline. Commands include `frame`, `specify`, `decompose`, `apply`, `verify`, `checkpoint`, `handoff`.
- Independent spec review runs before quality review. Completion is tied to evidence, not claims.
- Non-destructive recovery with read-only rollback previews. Needs Python 3.10+.
</details>

<details>
<summary><b>ui-component-expert</b>: design export to component</summary>

- Ingests a design export into a typed `DesignContract`, picks a headless engine (Base UI, React Aria, Zag.js or native HTML), then emits a worklist for the host agent.
- Validated against synthetic fixtures and tests only. Live Claude Design exports and in-browser runs are untested.
</details>

---

## Install

### On claude.ai (upload)

1. Open the plugin upload dialog on claude.ai.
2. Upload a file from [`dist/`](dist), for example `dist/ult-engineer.plugin`.
3. Repeat for each plugin you want.

| File | Size |
|---|---:|
| [`dist/ult-engineer.plugin`](dist/ult-engineer.plugin) | 0.7 MB |
| [`dist/ult-performance.plugin`](dist/ult-performance.plugin) | 1.7 MB |
| [`dist/ult-accessability.plugin`](dist/ult-accessability.plugin) | 8.4 MB |
| [`dist/ultimate-sdd.plugin`](dist/ultimate-sdd.plugin) | 0.3 MB |
| [`dist/ui-component-expert.plugin`](dist/ui-component-expert.plugin) | 0.8 MB |

### In Claude Code (local folder)

```bash
git clone <this-repo-url> ultimate-claude-code
claude --plugin-dir ./ultimate-claude-code/plugins/ult-engineer
```

Repeat `--plugin-dir` for each plugin, or pass several at once.

### Other agents

`ult-engineer`, `ult-performance`, `ult-accessability`, `ultimate-sdd` and `ui-component-expert` also carry Codex and Kimi manifests inside their source folders. See each plugin's own README for those steps.

---

## Repo layout

```text
ultimate-claude-code/
├── dist/                      upload-ready .plugin files (one per plugin)
├── plugins/                   full source, one folder per plugin
│   ├── ult-engineer/
│   ├── ult-performance/
│   ├── ult-accessability/
│   ├── ultimate-sdd/
│   └── ui-component-expert/
├── scripts/
│   └── pack_plugin.py         builds and verifies a .plugin file
├── LICENSE
└── README.md
```

---

## Rebuild the upload files

`scripts/pack_plugin.py` turns a plugin folder into an upload-ready file and checks the result:

```bash
python scripts/pack_plugin.py plugins/ult-engineer dist
```

What it enforces, each learned from a real upload rejection:

| Rule | Why |
|---|---|
| Exactly one `plugin.json`, at `.claude-plugin/plugin.json` | The uploader rejects archives with several manifests. |
| Only `[A-Za-z0-9._-/]` in paths | Parentheses, `@` and spaces are rejected. Offending paths are renamed. |
| No `continueOnBlock` on command hooks | The field is only valid on `prompt` hooks. |
| Hook timeouts in seconds | `5000` would mean about 83 minutes. |
| No duplicate `hooks` path in the manifest | `hooks/hooks.json` is loaded automatically. |
| LF line endings and the executable bit on shell scripts | CRLF breaks hooks on Linux. |
| No `node_modules`, caches, nested archives or other-platform manifests | Keeps the upload small and valid. |

The source folders are unchanged copies of the working plugins, apart from removing `node_modules`, caches, and the redundant `.zip` copies of vendored folders under `ult-accessability`.

---

## Credits and inspiration

These plugins stand on other people's work. Vendored copies keep their original licenses inside each plugin's `vendor/` or `references/` folder, and each plugin's `ATTRIBUTION.md` or `THIRD_PARTY_NOTICES.md` has the detail. Thank you to every author below.

### ult-engineer

| Source | Author | License |
|---|---|---|
| [claude-plugins](https://github.com/laurigates/claude-plugins) (code-quality-plugin), via avr-debug | Lauri Gates | MIT |
| [debug-skill](https://github.com/AlmogBaku/debug-skill) | Almog Baku | MIT |
| [debug-agent](https://github.com/aidenybai/debug-agent) | Aiden Bai, Million Software, Inc. | MIT |
| javascript-typescript plugin | Seth Hobson | MIT |
| Effective TypeScript skill | Dan Vanderkam's items | MIT |
| [React Doctor](https://react.doctor) | React Doctor team | see plugin `vendor/react-doctor` |
| [Semgrep](https://github.com/semgrep/semgrep), [OpenRewrite](https://github.com/openrewrite/rewrite) | their maintainers | LGPL-2.1, Apache-2.0 (the skills here are original docs) |

### ult-performance

| Source | Author | License |
|---|---|---|
| [web-quality-skills](https://github.com/addyosmani/web-quality-skills) | Addy Osmani | MIT |
| [webperf-snippets](https://github.com/nucliweb/webperf-snippets) | Joan León | MIT |
| [zero-jank-scroll-agent-skill](https://github.com/harshavarma02/zero-jank-scroll-agent-skill) | Harsha Varma | MIT |
| elite-performance | community skill | as shipped in `vendor/` |

### ult-accessability

| Source | Author | License |
|---|---|---|
| [accessibility-agents](https://github.com/Community-Access/accessibility-agents) | Taylor Arndt and the Community-Access contributors | MIT |
| [accessibility-audit](https://github.com/humbleteam/accessibility-audit) | Humbleteam | MIT |
| [skill.color-expert](https://github.com/meodai/skill.color-expert) | meodai | CC-BY-4.0 |
| wcag-22-skills | 3lVv0w and contributors | MIT |

### ultimate-sdd

| Source | Author | License |
|---|---|---|
| OpenSpec Plus | sudokar | MIT |
| Conductor | the Conductor project and contributors | Apache-2.0 |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) (truth, change and delta model) | Fission-AI | MIT |
| rasen (pipeline, goal, review and handoff concepts) | DumoeDss | MIT |

Pilot Shell is deliberately not used: its license restricts reuse, and no code, prompts or assets from it are included.

### ui-component-expert

| Source | Author | License |
|---|---|---|
| [Base UI](https://github.com/mui/base-ui) | MUI | MIT |
| [React Spectrum and React Aria](https://github.com/adobe/react-spectrum) | Adobe | Apache-2.0 |
| [Zag.js](https://github.com/chakra-ui/zag) | Chakra UI | MIT |
| [design-system-ops](https://github.com/murphytrueman/design-system-ops) | Murphy Trueman | MIT |
| [interface-design](https://github.com/dammyjay93/interface-design) | Damola Akinleye | MIT |
| [styleseed](https://github.com/bitjaru/styleseed) | StyleSeed contributors | MIT |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) | Leonxlnx | MIT |
| [ui-skills](https://github.com/ibelick/ui-skills) | Julien Thibeaut | MIT |
| [ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills) | Thientan Soparat | MIT |

### Standing on the shoulders of

The plugin format and skill conventions come from [Claude Code](https://code.claude.com/docs/en/plugins-reference) and the [Anthropic skills repository](https://github.com/anthropics/skills).

If your work is used here and the credit is wrong or missing, open an issue and it will be fixed.

---

## License

The original work in this repository is released under the [MIT License](LICENSE). Vendored and adapted material stays under its own license, listed above and included next to the material.

<div align="center">

Built by Andrew Rodriguez

</div>
