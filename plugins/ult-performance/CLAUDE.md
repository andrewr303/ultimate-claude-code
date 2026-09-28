# CLAUDE.md

Plugin: **ult-performance**. Default skill and slash command: `ult-performance`.

## Skills

| Skill | Path | Triggers |
|-------|------|----------|
| ult-performance | `skills/ult-performance/` | audit performance, speed up, mixed request |
| audit | `skills/audit/` | lighthouse, quality review |
| core-web-vitals | `skills/core-web-vitals/` | LCP, INP, CLS |
| loading | `skills/loading/` | TTFB, FCP, render-blocking, fonts, hints |
| interaction | `skills/interaction/` | jank, LoAF, scroll, 60fps, GSAP |
| media | `skills/media/` | images, video, SVG |
| performance | `skills/performance/` | bundle, Vite, cache, source-only |
| accessibility | `skills/accessibility/` | a11y, WCAG |
| seo | `skills/seo/` | SEO, schema |
| best-practices | `skills/best-practices/` | CSP, headers, deprecated APIs |

## Live tools

- Performance: `performance_start_trace` then `performance_analyze_insight`
- Other Lighthouse categories: `lighthouse_audit`
- Snippets: `evaluate_script` on `skills/<skill>/scripts/*.js` — see `references/execute-snippets.md`

## Thresholds (field p75)

LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1
