# Ult Performance

Ultimate web performance plugin for **Claude Code**, **Codex**, and **Kimi Code**.

One default entry — `ult-performance` — routes the agent to the specialist skill for Core Web Vitals, loading, interaction/animation, scroll smoothness, media, source-level fixes, accessibility, SEO, or a full quality audit.

Merges [web-quality-skills](https://github.com/addyosmani/web-quality-skills), [webperf-snippets](https://github.com/nucliweb/webperf-snippets) (49 DevTools measurement scripts), and elite animation/Vite performance guidance.

## Skills

| Skill | Use when |
|-------|----------|
| **ult-performance** | Default router. Broad "speed this up" / "audit this page" |
| **audit** | Lighthouse-style quality review across categories |
| **core-web-vitals** | LCP, INP, CLS measure + fix |
| **loading** | TTFB, FCP, render-blocking, fonts, scripts, hints, network |
| **interaction** | INP debug, jank, LoAF, scroll, 60fps, GSAP/GPU |
| **scroll** | Sticky sections, scrollytelling, parallax, scroll-linked animation build/audit/repair |
| **media** | Images, video, SVG |
| **performance** | Source fixes, budgets, Vite, caching (after measurement) |
| **accessibility** | WCAG 2.2 |
| **seo** | Crawl, metadata, structured data |
| **best-practices** | Security headers, deprecated APIs |

## Install

### Claude Code

From this folder:

```text
/plugin marketplace add .
/plugin install ult-performance@ult-performance
```

Or copy `skills/` into `~/.claude/skills/` / `.claude/skills/`.

Slash commands: `/ult-performance`, `/audit`, `/cwv`, `/loading`, `/interaction`, `/scroll`, `/media`, `/performance`, `/a11y`, `/seo`.

### Codex (CLI v0.122+)

```bash
codex plugin marketplace add /path/to/Performance
```

Invoke with `@ult-performance`, `@core-web-vitals`, `@loading`, and so on.

The Codex adapter lives in `codex/` (`codex/skills` is a junction to `skills/`). On a machine that cannot create junctions:

```powershell
Remove-Item -Recurse -Force codex\skills
Copy-Item -Recurse skills codex\skills
```

### Kimi Code

Install this directory as a plugin. `kimi.plugin.json` sets `sessionStart.skill` to `ult-performance`, so every session starts on the router.

```text
/skill:ult-performance
```

### Gemini CLI

```bash
gemini extensions install /path/to/Performance
```

## How the agent should work

1. Load **ult-performance** and route.
2. If a URL can run, measure (trace + snippets) before editing.
3. Label evidence: field (CrUX/RUM), lab (trace/Lighthouse/snippet), or hypothesis (source only).
4. Re-run the same lab path after a fix.

Snippet protocol: [`references/execute-snippets.md`](references/execute-snippets.md).

Chrome DevTools MCP is optional. Without it, use Lighthouse CLI, PageSpeed Insights, or paste snippets into DevTools.

## Layout

```
skills/<name>/SKILL.md   canonical skills
commands/                Claude slash commands
agents/                  performance-auditor
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

MIT. Upstream MIT code from Addy Osmani (web-quality-skills) and Joan León (webperf-snippets). See [ATTRIBUTION.md](ATTRIBUTION.md).
