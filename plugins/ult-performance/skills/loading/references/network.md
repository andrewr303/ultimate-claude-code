# Network-aware loading

Use after `Network-Bandwidth-Connection-Quality.js`.

## After the snippet

- `effectiveType` slow-2g / 2g → inline critical CSS, aggressive image lazy-load, drop prefetch, skip webfonts if possible, run `core-web-vitals` LCP
- `effectiveType` 3g → cut render-blocking, responsive images, preconnect, check INP
- `saveData === true` → treat as worse than actual type; no autoplay; no prefetch; offer a "high quality" control
- RTT > 300ms → TTFB sub-parts, preconnect, service worker, fewer origins
- downlink < 1 Mbps → compress images, disable autoplay, drop prefetch
- API missing (Safari) → use TTFB as a proxy; do not invent a connection type

## Budgets by connection (starting point)

| Type | Page | Images | JS | Video |
|------|------|--------|----|-------|
| 2g / slow-2g | < 500KB | < 200KB | < 100KB | none |
| 3g | < 1.5MB | < 800KB | < 300KB | < 3MB if required |
| 4g+ | < 3MB | < 2MB | < 1MB | < 10MB |

Override with a project budget.

## Adaptive loading

```javascript
const conn = navigator.connection;
const saveData = conn?.saveData === true;
const slow = saveData || /2g/.test(conn?.effectiveType || "");
if (slow) {
  // skip autoplay, prefetch, extra font weights
}
```

Network Information values are estimates and can change mid-session. Re-check on long sessions.
