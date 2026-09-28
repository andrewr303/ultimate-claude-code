# Ult Accessability

Ultimate web accessibility plugin for **Claude Code**, **Codex**, and **Kimi Code**.

One default entry — `ult-accessability` — routes the agent to the specialist skill for WCAG 2.2 AA/AAA audits, contrast and color, remediation, testing, or a full before/after report.

Distills upstream accessibility guidance: [accessibility-agents](https://github.com/Community-Access/accessibility-agents) (multi-agent audit workflow), [accessibility-audit](https://github.com/humbleteam/accessibility-audit) (WCAG 2.2 checklist), [color-expert](https://github.com/meodai/skill.color-expert) (140+ color references), wcag-22-skills (AA/AAA criteria), and the ult-performance accessibility skill.

## Skills

| Skill | Use when |
|-------|----------|
| **ult-accessability** | Default router. Broad "is this accessible" / "audit this page" |
| **audit** | WCAG 2.2 audit with severity, SC citations, before/after reports |
| **wcag-aa** | Level A + AA criteria: keyboard, focus, ARIA, forms, motion |
| **wcag-aaa** | Level AAA criteria: enhanced contrast, sign language, timing |
| **contrast-color** | Contrast ratios, palettes, ramps, color tokens |
| **fix** | Remediation workflow: apply findings, verify, report |
| **testing** | axe, screen readers, keyboard test plans, regression checks |

## Install

### Claude Code

From this folder:

```text
/plugin marketplace add .
/plugin install ult-accessability@ult-accessability
```

Or copy `skills/` into `~/.claude/skills/` / `.claude/skills/`.

Slash commands: `/ult-accessability`, `/audit`, `/wcag-aa`, `/wcag-aaa`, `/contrast`, `/fix`, `/testing`.

### Codex (CLI v0.122+)

```bash
codex plugin marketplace add /path/to/Accessability
```

Invoke with `@ult-accessability`, `@audit`, `@wcag-aa`, and so on.

The Codex adapter lives in `codex/` (`codex/skills` is a copy of `skills/`, kept in sync; same for `.gemini/skills/`). If you edit `skills/` later, re-sync with:

```powershell
Remove-Item -Recurse -Force codex\skills
Copy-Item -Recurse skills codex\skills
```

### Kimi Code

Install this directory as a plugin. `kimi.plugin.json` sets `sessionStart.skill` to `ult-accessability`, so every session starts on the router.

```text
/skill:ult-accessability
```

### Gemini CLI

```bash
gemini extensions install /path/to/Accessability
```

## How the agent should work

1. Load **ult-accessability** and route.
2. If a URL can run, drive it live (BrowserOS neo) before judging markup or screenshots.
3. Label evidence: live page, markup, screenshot, or hypothesis.
4. FULL-RUN PIPELINE: audit → initial report → fix → re-verify → final before/after report.
5. Never invent ratios or findings; never claim legal certification.

Live tools: BrowserOS neo, axe CLI, Lighthouse a11y. Contrast thresholds: AA 4.5:1/3:1, AAA 7:1/4.5:1, non-text 3:1.

## Layout

```
skills/<name>/SKILL.md   canonical skills
commands/                Claude slash commands
agents/                  accessibility-auditor
references/              WCAG, patterns, report template, BrowserOS neo
scripts/                 validate-plugin.mjs
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

MIT. Upstream MIT/CC-BY accessibility guidance distilled into skills. See [ATTRIBUTION.md](ATTRIBUTION.md).
