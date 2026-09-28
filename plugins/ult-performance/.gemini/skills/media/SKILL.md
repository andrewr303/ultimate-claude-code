---
name: media
description: Audit and optimize images, video, and SVG. Detects LCP media, missing dimensions (CLS), lazy-load mistakes, format/sizing waste, and embedded bitmaps in SVG. Use when asked about image optimization, video loading, SVG weight, srcset, AVIF/WebP, lazy loading, or when LCP/CLS is a media element.
license: MIT
metadata:
  author: ult-performance
  version: "1.0.0"
  mcp-server: chrome-devtools
  category: web-performance
---

# Media

Read [execute-snippets.md](../../references/execute-snippets.md) and [schema.md](../../references/schema.md) before evaluating scripts.

## Scripts

- `scripts/Image-Element-Audit.js` — format, dimensions, lazy, fetchpriority, LCP candidate (async)
- `scripts/Video-Element-Audit.js` — poster, preload, autoplay, sources
- `scripts/SVG-Embedded-Bitmap-Analysis.js` — raster packed inside SVG

## Workflows

### Media audit

1. Image-Element-Audit.js
2. Video-Element-Audit.js
3. SVG-Embedded-Bitmap-Analysis.js

### LCP is an image

1. Load `core-web-vitals` LCP.js + LCP-Image-Entropy.js
2. Image-Element-Audit.js
3. Load `loading`: Find-Above-The-Fold-Lazy-Loaded-Images, Priority-Hints-Audit, Resource-Hints-Validation

### CLS from media

1. Image-Element-Audit.js (missing width/height)
2. `core-web-vitals` CLS.js
3. `interaction` Layout-Shift-Loading-and-Interaction.js

## Decision tree

- Missing width/height → CLS risk; add attributes or `aspect-ratio`
- Wrong format (JPEG icons, PNG photos, GIF motion) → AVIF/WebP/SVG/video as appropriate
- Intrinsic size > 2× display → `srcset`/`sizes` or CDN resize
- Above-fold `loading="lazy"` → remove lazy; measure LCP
- LCP image without `fetchpriority="high"` → add it
- Below-fold eager images → `loading="lazy"`
- `loading="lazy"` plus `fetchpriority="high"` → drop one
- Video as LCP → LCP-Video-Candidate + poster optimization
- `preload="auto"` on below-fold video → `metadata` or `none`
- Autoplay without `muted` → will be blocked
- SVG with embedded bitmap > 100KB → extract to a real image

Budgets (starting point): single image > 500KB warn, > 1MB critical; > 5MB images on first load → lazy-load; video > 10MB warn.

Encode, responsive, and CDN patterns: [asset-optimization.md](references/asset-optimization.md).

Snippet descriptions: [snippets.md](references/snippets.md)
