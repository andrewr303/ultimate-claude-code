---
name: performance
description: Apply loading, runtime, bundle, caching, and Vite performance fixes from source after measurement. Use when asked to speed up a site, reduce bundle size, optimize Vite, set performance budgets, fix caching, cut third-parties, or when only source is available and findings must be labeled hypotheses.
license: MIT
metadata:
  author: ult-performance
  version: "1.0.0"
  category: web-performance
---

# Performance playbook

Evidence-led code fixes. If a URL can run, read [MEASUREMENT.md](references/MEASUREMENT.md) and establish a field-plus-lab baseline before editing. Prefer a performance trace (`performance_start_trace` / `performance_analyze_insight`). Do not use `lighthouse_audit` for performance.

When no page can run, call findings **hypotheses** and include the command or snippet that would verify each one.

For metric-specific work, load `core-web-vitals`, `loading`, `interaction`, or `media` instead of staying here.

## Starting budgets

Override with a project budget if one exists.

| Resource | Budget |
|----------|--------|
| Total page weight | < 1.5 MB |
| JS compressed | < 300 KB |
| CSS compressed | < 100 KB |
| Above-fold images | < 500 KB |
| Fonts | < 100 KB |
| Third-party | < 200 KB |
| Initial JS (animated marketing pages) | < 100 KB gzipped |

## Critical path

- TTFB < 800ms: CDN, cache, efficient origin. Consider HTTP 103 Early Hints only for proven critical subresources.
- Brotli (or gzip) for text.
- HTTP/2 or HTTP/3.
- `preconnect` required third-party origins; `preload` only resources the trace shows as late-discovered.
- Defer non-critical CSS; inline ≤ 14KB critical CSS.
- `defer` / `type="module"` for app JS; `async` for independent third-parties.
- Route- and component-level code splitting; import only used library paths.

Speculation Rules and View Transitions: see LCP notes in `core-web-vitals` / [LCP.md](../core-web-vitals/references/LCP.md). Gate analytics on `prerenderingchange`.

## Caching

```
HTML:    Cache-Control: no-cache, must-revalidate
Hashed:  Cache-Control: public, max-age=31536000, immutable
API:     Cache-Control: private, max-age=0, must-revalidate
```

Service worker: cache-first for hashed static assets; Navigation Preload if SW adds TTFB. Verify with `loading` Service-Worker-Analysis and Back-Forward-Cache snippets.

## Runtime

- Batch DOM reads then writes.
- Passive scroll/touch listeners.
- `content-visibility: auto` for offscreen sections.
- Virtualize lists > ~100 rows.
- Facade pattern for embeds (YouTube, maps, chat).

Animation/GPU/GSAP: load `interaction`.

## Third-parties

Load on interaction or when in view. One tag manager max. Treat each third-party as a budget line.

## Vite / GSAP projects

Read [vite-setup.md](references/vite-setup.md) when the repo uses Vite or GSAP. Split GSAP into its own chunk; dynamic-import ScrollTrigger and plugins; production minify; modulepreload for the entry.

Jank debugging in DevTools: [debugging.md](references/debugging.md).

Production RUM: [RUM.md](references/RUM.md). Prefer `web-vitals` over a hand-rolled observer.

## After the change

Re-run the same lab path. Report before/after, conditions, and that field CWV is still pending.
