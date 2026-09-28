---
name: interaction
description: Measure and fix interaction, animation, and main-thread performance. Covers INP debugging, long tasks, long animation frames, scroll jank, forced sync layout, GPU compositor rules, GSAP cleanup, and 60fps budgets. Use when asked about slow interactions, jank, unresponsive pages, INP, scroll performance, 60fps, will-change, layout thrashing, or GSAP/ScrollTrigger performance.
license: MIT
metadata:
  author: ult-performance
  version: "1.0.0"
  mcp-server: chrome-devtools
  category: web-performance
---

# Interaction and animation

Read [execute-snippets.md](../../references/execute-snippets.md) and [schema.md](../../references/schema.md) before evaluating scripts.

Lab targets: 60fps (16.67ms/frame), JS+layout < 10ms/frame, INP ≤ 200ms.

## Scripts

- `scripts/Interactions.js` — `getInteractionSummary()` after input
- `scripts/Input-Latency-Breakdown.js` — `getInputLatencyBreakdown()`
- `scripts/Long-Animation-Frames.js` — LoAF; `getLoAFSummary()`
- `scripts/Long-Animation-Frames-Script-Attribution.js`
- `scripts/Long-Animation-Frames-Helpers.js`
- `scripts/LongTask.js` — `getLongTaskSummary()`
- `scripts/Scroll-Performance.js` — `getScrollSummary()` after scroll
- `scripts/Forced-Synchronous-Layout.js`
- `scripts/Layout-Shift-Loading-and-Interaction.js` — `getLayoutShiftSummary()`

## Workflows

### Interaction audit

1. Interactions.js → Input-Latency-Breakdown.js
2. Long-Animation-Frames.js → LongTask.js → Scroll-Performance.js

### INP > 200ms

1. Interactions.js (which event)
2. Input-Latency-Breakdown.js (input delay vs processing vs presentation)
3. Long-Animation-Frames.js + Script-Attribution
4. If load-time blocking, load `loading` (JS-Execution-Time-Breakdown, First-And-Third-Party-Script-Info)

### Scroll jank

1. Scroll-Performance.js
2. Long-Animation-Frames.js + attribution
3. Layout-Shift-Loading-and-Interaction.js
4. Forced-Synchronous-Layout.js if the trace shows forced reflow

### Frozen page

1. LongTask.js → LoAF attribution
2. Load `loading` for parse/execute cost and third-party scripts

## Decision tree

- Any interaction > 200ms → Input-Latency-Breakdown; also `core-web-vitals` INP.js
- Many slow interactions → LoAF + LongTask + attribution
- Input delay > 50ms → LoAF + LongTask (main thread busy before the handler)
- Processing > 100ms → attribution + `loading` third-party script info
- Presentation delay > 50ms → LoAF + layout-shift snippet
- LoAF > 50ms → attribution; > 100ms → full blocking workflow
- Scroll FPS < 30 → LoAF + attribution + layout-shift; 30–50 → passive listeners + compositor properties
- Shifts during load → `core-web-vitals` CLS.js; during interaction → dynamic insert / missing dimensions (`media`)
- Forced sync layout detected → batch reads/writes; animate transform/opacity only

## GPU and animation rules

Animate only compositor properties: `transform`, `opacity`, `filter`.

Do not animate `top/left/width/height/margin/padding/font-size` or per-frame `box-shadow`.

```css
.card:hover { will-change: transform; }
/* never { * { will-change: transform; } } */
```

```javascript
window.addEventListener("scroll", onScroll, { passive: true });
const ctx = gsap.context(() => { /* tweens + ScrollTrigger */ });
// unmount:
ctx.revert();
```

Respect `prefers-reduced-motion`. Isolate animated subtrees with `contain: layout style paint`.

Full compositor, will-change, GSAP, and scroll notes: [animation-performance.md](references/animation-performance.md).

Scroll-architecture and build work (sticky, scrollytelling, parallax, observer vs CSS timelines vs Motion vs GSAP choice) → [scroll](../scroll/SKILL.md). This skill owns runtime measurement; `scroll` owns scroll-UI architecture/implementation.

Snippet descriptions: [snippets.md](references/snippets.md)
