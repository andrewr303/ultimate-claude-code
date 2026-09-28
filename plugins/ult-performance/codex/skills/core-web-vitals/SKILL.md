---
name: core-web-vitals
description: Measure and fix Core Web Vitals (LCP, INP, CLS) with field/lab evidence, Chrome DevTools snippets, and optimization patterns. Use when asked to improve Core Web Vitals, debug LCP, reduce CLS, optimize INP, fix layout shifts, or inspect a slow hero/image/video LCP candidate.
license: MIT
metadata:
  author: ult-performance
  version: "1.0.0"
  mcp-server: chrome-devtools
  category: web-performance
---

# Core Web Vitals

Measure, then fix. Read [execute-snippets.md](../../references/execute-snippets.md) and [schema.md](../../references/schema.md) before running scripts.

If a URL can run, also read [MEASUREMENT.md](../performance/references/MEASUREMENT.md). Field p75 decides impact. Traces and snippets diagnose the session.

## Thresholds (p75)

| Metric | Good | Needs work | Poor |
|--------|------|------------|------|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |

A snippet or trace is lab, not field.

## Scripts

- `scripts/LCP.js` — Largest Contentful Paint
- `scripts/LCP-Subparts.js` — TTFB / resource / render-delay split
- `scripts/LCP-Trail.js` — LCP candidate changes
- `scripts/LCP-Image-Entropy.js` — LCP image complexity
- `scripts/LCP-Video-Candidate.js` — Video/poster as LCP
- `scripts/CLS.js` — Cumulative Layout Shift (`getCLS()` after interaction)
- `scripts/INP.js` — Interaction to Next Paint (`getINP()` / `getINPDetails()` after interaction)

## Workflows

### Full CWV audit

1. `LCP.js` → `CLS.js` → `INP.js` (INP needs a click/key after inject)
2. `LCP-Subparts.js` + `LCP-Trail.js`
3. Route with the decision tree

### LCP deep dive (LCP > 2.5s or "why is LCP slow")

1. `LCP.js` baseline
2. `LCP-Subparts.js` — which phase
3. `LCP-Trail.js` — candidate churn
4. If image: `LCP-Image-Entropy.js` + load `media` (`Image-Element-Audit.js`)
5. If video: `LCP-Video-Candidate.js` + load `media` (`Video-Element-Audit.js`)

### CLS investigation

1. `CLS.js`
2. Load `interaction` (`Layout-Shift-Loading-and-Interaction.js`)
3. Load `loading` for late fonts/lazy above-fold images; load `media` for missing dimensions

### INP debugging

1. `INP.js` then `getINP()` after interaction
2. Load `interaction`: `Interactions.js`, `Input-Latency-Breakdown.js`, `Long-Animation-Frames.js`, `Long-Animation-Frames-Script-Attribution.js`

## Decision tree

### After LCP.js

- LCP > 2.5s → `LCP-Subparts.js`
- LCP > 4.0s → full LCP deep dive
- Candidate is image → `LCP-Image-Entropy.js` + `media`
- Candidate is video → `LCP-Video-Candidate.js` + `media`
- Always → `LCP-Trail.js`

### After LCP-Subparts.js

- TTFB phase > 600ms → load `loading` (`TTFB.js`, `TTFB-Sub-Parts.js`)
- Resource load > 1500ms → `loading`: Resource-Hints-Validation, Priority-Hints-Audit, Find-render-blocking-resources
- Render delay > 200ms → `loading` render-blocking/scripts + `interaction` Long-Animation-Frames

### After LCP-Trail.js

- >3 candidate changes → late above-fold images/fonts (`loading`) and `CLS.js`
- Final candidate appears late → Resource-Hints-Validation

### After CLS.js

- CLS > 0.1 → `interaction` Layout-Shift-Loading-and-Interaction
- CLS > 0.25 → also `loading` (lazy ATF images, fonts, critical CSS) + `media` Image-Element-Audit

### After INP.js

- INP > 200ms → `interaction` Interactions.js
- INP > 500ms → full INP workflow in `interaction`
- `getINP()` errors → prompt a real click/type/scroll, retry `getINP()`

### Multi-metric

- Poor LCP and CLS → LCP-Trail + layout-shift timing (shared late content)
- Poor LCP and INP → main-thread congestion (`interaction` LoAF + `loading` Script-Loading)
- Poor CLS and INP → interaction-triggered shifts

## Fix patterns

Load the matching reference; do not guess a checklist:

- LCP discovery, preload, SSR, Speculation Rules → [LCP.md](references/LCP.md)
- INP yielding, third-parties, input delay → [INP.md](references/INP.md)
- CLS reserved space, fonts, ads → [CLS.md](references/CLS.md)

Snippet descriptions: [snippets.md](references/snippets.md)

Prefer a discoverable `<img fetchpriority="high">` for image LCP. Add `<link rel="preload">` only when the trace shows late discovery.
