# AGENTS.md

Ult Performance is a measurement-first plugin. The default skill is `ult-performance`.

## Route first

Load `skills/ult-performance/SKILL.md` and follow its table. Load only the named specialists.

## Measure

When a page can run, read `references/execute-snippets.md` and `skills/performance/references/MEASUREMENT.md`.

- Field p75 (CrUX/RUM) decides user impact.
- A DevTools trace or snippet is one lab session.
- Source-only findings are hypotheses.

Chrome DevTools MCP: `performance_start_trace` / `performance_analyze_insight` for performance. `lighthouse_audit` for a11y, SEO, best practices, agentic browsing — not performance.

## Scripts

Skill `scripts/*.js` are IIFEs. Use the JSON **return value**. If `status` is `tracking`, call `getDataFn()` after the user interacts.

## Do not

- Invent metric numbers
- Treat a Lighthouse score as CWV field data
- Claim field vitals improved before a new CrUX/RUM window
