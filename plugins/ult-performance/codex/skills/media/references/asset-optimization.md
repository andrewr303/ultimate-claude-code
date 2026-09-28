# Asset Optimization

Optimize images, fonts, and media for fast loading.

## Table of Contents

1. [Image Optimization](#image-optimization)
2. [Font Optimization](#font-optimization)
3. [Lazy Loading](#lazy-loading)
4. [Critical Path](#critical-path)

---

## Image Optimization

### Format Selection

| Format   | Use Case                                 | Browser Support         |
| -------- | ---------------------------------------- | ----------------------- |
| **AVIF** | Photos, illustrations (best compression) | Chrome 85+, Firefox 93+ |
| **WebP** | Photos, illustrations (good fallback)    | All modern browsers     |
| **PNG**  | Transparency, screenshots                | Universal               |
| **SVG**  | Icons, logos, illustrations              | Universal               |
| **JPEG** | Photos (legacy fallback)                 | Universal               |

### Picture Element with Fallbacks

```html
<picture>
  <!-- Best quality: AVIF -->
  <source srcset="image.avif 1x, image@2x.avif 2x" type="image/avif" />
  <!-- Good fallback: WebP -->
  <source srcset="image.webp 1x, image@2x.webp 2x" type="image/webp" />
  <!-- Universal fallback: JPEG -->
  <img
    src="image.jpg"
    srcset="image.jpg 1x, image@2x.jpg 2x"
    alt="Description"
    width="800"
    height="600"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### Responsive Images

```html
<img
  src="image-800.jpg"
  srcset="
    image-400.jpg   400w,
    image-800.jpg   800w,
    image-1200.jpg 1200w,
    image-1600.jpg 1600w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1200px) 50vw,
    800px
  "
  alt="Description"
  loading="lazy"
  decoding="async"
/>
```

### Image Compression Targets

| Image Type     | Quality   | Max File Size |
| -------------- | --------- | ------------- |
| Hero images    | 80-85%    | < 200KB       |
| Product images | 75-80%    | < 100KB       |
| Thumbnails     | 70-75%    | < 30KB        |
| Icons (PNG)    | Lossless  | < 10KB        |
| Icons (SVG)    | Optimized | < 5KB         |

### Build-Time Optimization

```javascript
// vite.config.js
import viteImagemin from "vite-plugin-imagemin";

export default {
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.7, 0.9] },
      webp: { quality: 80 },
      avif: { quality: 65 },
    }),
  ],
};
```

### SVG Optimization

```javascript
// vite.config.js
import svgo from "vite-plugin-svgo";

export default {
  plugins: [
    svgo({
      plugins: [
        { name: "removeViewBox", active: false },
        { name: "removeDimensions", active: true },
        { name: "removeUselessStrokeAndFill", active: true },
      ],
    }),
  ],
};
```

### Background Images

```css
/* Use modern formats in CSS */
.hero {
  background-image: url("hero.jpg");
}

@supports (background-image: url("test.avif")) {
  .hero {
    background-image: url("hero.avif");
  }
}

/* Or use image-set */
.hero {
  background-image: image-set(
    url("hero.avif") type("image/avif"),
    url("hero.webp") type("image/webp"),
    url("hero.jpg") type("image/jpeg")
  );
}
```

---

## Font Optimization

### Subset Fonts

Only include characters you need:

```bash
# Using glyphhanger
glyphhanger --whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?'\"()-" --subset=font.woff2
```

### Font Loading Strategy

```css
/* Use font-display */
@font-face {
  font-family: "CustomFont";
  src: url("font.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* Show fallback immediately, swap when loaded */
}
```

### font-display Values

| Value      | Behavior                                        |
| ---------- | ----------------------------------------------- |
| `swap`     | Show fallback immediately, swap when ready      |
| `fallback` | Short block (100ms), short swap (3s)            |
| `optional` | Short block, no swap (may not show custom font) |
| `block`    | Long invisible period (not recommended)         |

### Preload Critical Fonts

```html
<head>
  <link
    rel="preload"
    href="/fonts/heading.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />
  <link
    rel="preload"
    href="/fonts/body.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />
</head>
```

### Variable Fonts

```css
/* Single file for all weights */
@font-face {
  font-family: "Inter";
  src: url("Inter-Variable.woff2") format("woff2-variations");
  font-weight: 100 900; /* Full range */
  font-display: swap;
}

/* Use any weight */
.light {
  font-weight: 300;
}
.regular {
  font-weight: 400;
}
.semibold {
  font-weight: 600;
}
.bold {
  font-weight: 700;
}
```

### System Font Stack (Fastest)

```css
/* Zero font loading */
body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
}
```

---

## Lazy Loading

### Native Lazy Loading

```html
<!-- Images -->
<img src="image.jpg" loading="lazy" alt="" />

<!-- Iframes -->
<iframe src="video.html" loading="lazy"></iframe>
```

### Intersection Observer

```javascript
// Lazy load images
const lazyImages = document.querySelectorAll("img[data-src]");

const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        imageObserver.unobserve(img);
      }
    });
  },
  {
    rootMargin: "50px 0px", // Load 50px before visible
    threshold: 0.01,
  },
);

lazyImages.forEach((img) => imageObserver.observe(img));
```

### Lazy Load Components

```javascript
// Lazy load heavy components
const heavySections = document.querySelectorAll("[data-component]");

const componentObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const section = entry.target;
        const componentName = section.dataset.component;

        // Dynamic import
        const module = await import(`./components/${componentName}.js`);
        module.init(section);

        componentObserver.unobserve(section);
      }
    });
  },
  {
    rootMargin: "100px 0px",
  },
);

heavySections.forEach((section) => componentObserver.observe(section));
```

### Lazy Load GSAP Animations

```javascript
// Only initialize animations when visible
const animatedSections = document.querySelectorAll(".animate-section");

const animationObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        initSectionAnimation(entry.target);
        animationObserver.unobserve(entry.target);
      }
    });
  },
  {
    rootMargin: "50px 0px",
  },
);

animatedSections.forEach((section) => animationObserver.observe(section));

function initSectionAnimation(section) {
  gsap.from(section.querySelectorAll(".animate-item"), {
    opacity: 0,
    y: 30,
    stagger: 0.1,
    duration: 0.6,
  });
}
```

### content-visibility

```css
/* Browser skips rendering until near viewport */
.lazy-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* Estimated height */
}
```

---

## Critical Path

### Inline Critical CSS

```html
<head>
  <!-- Critical CSS inline -->
  <style>
    /* Above-the-fold styles only */
    body {
      margin: 0;
      font-family: sans-serif;
    }
    .hero {
      min-height: 100vh;
      display: flex;
    }
    /* ... minimal critical styles ... */
  </style>

  <!-- Full CSS loads async -->
  <link
    rel="stylesheet"
    href="styles.css"
    media="print"
    onload="this.media='all'"
  />
  <noscript>
    <link rel="stylesheet" href="styles.css" />
  </noscript>
</head>
```

### Extract Critical CSS

```javascript
// vite.config.js
import critical from "rollup-plugin-critical";

export default {
  plugins: [
    critical({
      criticalUrl: "http://localhost:3000",
      criticalBase: "./dist",
      criticalPages: [{ uri: "/", template: "index" }],
      criticalConfig: {
        inline: true,
        dimensions: [
          { width: 375, height: 667 },
          { width: 1440, height: 900 },
        ],
      },
    }),
  ],
};
```

### Resource Hints

```html
<head>
  <!-- Preconnect to external origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://cdn.example.com" crossorigin />

  <!-- DNS prefetch for less critical origins -->
  <link rel="dns-prefetch" href="https://analytics.example.com" />

  <!-- Preload critical assets -->
  <link rel="preload" href="hero.webp" as="image" />
  <link
    rel="preload"
    href="font.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />

  <!-- Prefetch next page assets -->
  <link rel="prefetch" href="/about.html" />
</head>
```

### Script Loading

```html
<!-- Critical scripts -->
<script src="critical.js"></script>

<!-- Non-critical: defer (maintains order, runs after DOM) -->
<script src="app.js" defer></script>

<!-- Non-critical: async (runs ASAP, no order guarantee) -->
<script src="analytics.js" async></script>

<!-- Module scripts are deferred by default -->
<script type="module" src="app.js"></script>
```

### Module Preload

```html
<!-- Preload modules for faster execution -->
<link rel="modulepreload" href="/js/main.js" />
<link rel="modulepreload" href="/js/gsap-core.js" />
```

---

## Complete Optimization Checklist

### Images

- [ ] Using AVIF/WebP with JPEG fallback
- [ ] Responsive images with srcset/sizes
- [ ] Proper width/height attributes (prevents CLS)
- [ ] Lazy loading below-fold images
- [ ] Compressed to target file sizes
- [ ] SVGs optimized with SVGO

### Fonts

- [ ] Using WOFF2 format
- [ ] Subsetted to needed characters
- [ ] font-display: swap applied
- [ ] Critical fonts preloaded
- [ ] Variable fonts where appropriate

### Loading

- [ ] Critical CSS inlined
- [ ] Full CSS async loaded
- [ ] Scripts deferred/async
- [ ] Resource hints configured
- [ ] Components lazy loaded
- [ ] content-visibility on sections

### Build

- [ ] Assets minified
- [ ] Gzip/Brotli compression
- [ ] Code splitting by route
- [ ] Tree shaking enabled
- [ ] Source maps for prod debugging

---

## Self-Hosted Font Loading (@fontsource)

Self-hosted fonts via `@fontsource` eliminate external HTTP requests, remove Google Fonts privacy concerns, and prevent FOUT:

```css
/* Variable fonts — single file covers all weights */
@import "@fontsource-variable/inter";
@import "@fontsource-variable/fraunces";
@import "@fontsource-variable/space-grotesk";

/* Static fonts — import only weights you need */
@import "@fontsource/poppins/400.css";
@import "@fontsource/poppins/500.css";
@import "@fontsource/poppins/600.css";
```

### Variable vs Static

| Approach       | File Count        | Total Size    | Use When                            |
| -------------- | ----------------- | ------------- | ----------------------------------- |
| Variable font  | 1 file per family | ~80-150KB     | Using 3+ weights, need axis control |
| Static weights | 1 file per weight | ~20-30KB each | Using 1-2 specific weights          |

Variable fonts are preferred for display fonts (headings) where you want precise weight control and axis features like `font-variation-settings: 'SOFT' 50`. Static weights are fine for body fonts where you only need 400 and 600.

### Installation

```bash
npm install @fontsource-variable/inter @fontsource-variable/fraunces
```

No `@font-face` declarations needed — the CSS import handles everything, including optimal `font-display: swap`.

---

## SVG Grain/Noise Optimization

Film grain overlays use inline SVG `feTurbulence` filters. Optimization tips:

### The Pattern

```css
.grain::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
  z-index: 1;
}
```

### Tuning Parameters

| Parameter       | Subtle (dark backgrounds) | Moderate (light backgrounds) |
| --------------- | ------------------------- | ---------------------------- |
| `opacity`       | 0.035                     | 0.08                         |
| `baseFrequency` | 0.9 (finer grain)         | 0.8 (coarser grain)          |
| `numOctaves`    | 4                         | 4                            |

### Performance Notes

- The `256px` tile with `repeat` is GPU-friendly — the browser tiles a small image rather than rendering a full-viewport filter
- `pointer-events: none` is essential — without it, the overlay blocks all mouse events
- `position: absolute` + `inset: 0` contains the overlay within the parent without affecting layout
- Using a data URI avoids an extra HTTP request
- The `stitchTiles='stitch'` parameter ensures seamless tiling

---

## Additional Performance Patterns

### Image Dimensions for CLS

Always set explicit `width` and `height` or `aspect-ratio` to prevent Cumulative Layout Shift:

```html
<!-- Explicit dimensions -->
<img src="hero.jpg" width="1200" height="600" alt="..." loading="lazy" />

<!-- Or use aspect-ratio in CSS -->
<img src="hero.jpg" class="hero-img" alt="..." loading="lazy" />
```

```css
.hero-img {
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 1;
  object-fit: cover;
}
```

Without dimensions, the browser can't reserve space until the image loads, causing content to jump.

### Virtualize Long Lists

For 50+ items, use virtual scrolling to only render visible items:

```javascript
// Concept: only render items in the viewport + buffer
const ITEM_HEIGHT = 64;
const BUFFER = 5;

function getVisibleRange(scrollTop, viewportHeight) {
  const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const end = Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + BUFFER;
  return { start, end };
}
```

Libraries: `@tanstack/virtual` (React/Svelte), `vue-virtual-scroller` (Vue).

### Third-Party Script Management

```html
<!-- Load third-party scripts async or defer -->
<script src="analytics.js" async></script>
<script src="chat-widget.js" defer></script>

<!-- Never block rendering with sync third-party scripts -->
<!-- BAD: <script src="tracking.js"></script> -->
```

Audit third-party scripts quarterly. Each one adds to Time to Interactive.

### Network Fallback

Provide degraded experience for slow connections:

```css
/* Reduce motion and effects on slow connections */
@media (prefers-reduced-data: reduce) {
  .hero-video {
    display: none;
  }
  .hero-image {
    display: block;
  }
  .grain-overlay::after {
    display: none;
  }
}
```

### Dynamic Viewport Units

Prefer `dvh` over `vh` on mobile to account for browser chrome:

```css
.hero {
  min-height: 100dvh; /* Accounts for mobile browser URL bar */
}

/* Fallback for older browsers */
@supports not (min-height: 100dvh) {
  .hero {
    min-height: 100vh;
  }
}
```

---

## Loading State Strategy

Choose the right loading indicator based on context:

| Pattern              | When to Use                                         | Duration |
| -------------------- | --------------------------------------------------- | -------- |
| **Nothing**          | Load completes in <300ms                            | <300ms   |
| **Skeleton/Shimmer** | Content layout is known, replacing existing content | 300ms–5s |
| **Spinner**          | Action in progress (button submit, form save)       | 300ms–3s |
| **Progress bar**     | Upload/download, known total size                   | Any      |
| **Percentage**       | Long operation with measurable progress             | >3s      |

### Decision Framework

```
Is the layout shape predictable?
  YES → Skeleton screen (preserves spatial context)
  NO  → Is the operation user-initiated?
    YES → Inline spinner (in the button/trigger)
    NO  → Full-page spinner or progress bar
```

### Skeleton Best Practices

- Match the actual content layout (same heights, widths, gaps)
- Animate with shimmer (→ see **elite-css-animations/visual-effects.md** for CSS pattern)
- Never show skeleton for >5s — switch to error/timeout state
- Use `content-visibility: auto` on sections below the fold to avoid rendering skeletons the user can't see

### Inline Button Loading

```css
.btn-loading {
  position: relative;
  color: transparent; /* Hide text */
  pointer-events: none;
}

.btn-loading::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

---

## Debounce & Throttle Patterns

### Debounce

Delays execution until input stops. Use for: search input, window resize, form autosave.

```javascript
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Usage: Only fires 300ms after user stops typing
const searchInput = document.querySelector("#search");
searchInput.addEventListener(
  "input",
  debounce((e) => {
    fetchResults(e.target.value);
  }, 300),
);
```

### Throttle

Limits execution to once per interval. Use for: scroll handlers, mousemove, resize layout recalc.

```javascript
function throttle(fn, limit = 100) {
  let waiting = false;
  return (...args) => {
    if (waiting) return;
    fn(...args);
    waiting = true;
    setTimeout(() => {
      waiting = false;
    }, limit);
  };
}

// Usage: Fires at most every 100ms during scroll
window.addEventListener(
  "scroll",
  throttle(() => {
    updateScrollProgress();
  }, 100),
  { passive: true },
);
```

### When to Use Which

| Scenario                    | Pattern  | Delay          |
| --------------------------- | -------- | -------------- |
| Search input / autocomplete | Debounce | 300ms          |
| Form autosave               | Debounce | 2000-3000ms    |
| Window resize recalc        | Debounce | 150ms          |
| Scroll progress indicator   | Throttle | 50-100ms       |
| Mousemove tracking          | Throttle | 16ms (1 frame) |
| Infinite scroll fetch       | Throttle | 200ms          |

**Note:** GSAP's ScrollTrigger already handles scroll optimization internally — don't wrap ScrollTrigger callbacks in throttle/debounce.

---

## Offline & Network Resilience

### Network Detection

```javascript
// Check current state
const isOnline = navigator.onLine;

// Listen for changes
window.addEventListener("online", () => {
  hideOfflineBanner();
  retryFailedRequests();
});

window.addEventListener("offline", () => {
  showOfflineBanner();
});
```

### Offline UI Pattern

```html
<div class="offline-banner" role="alert" hidden>
  You're offline. Some features may be unavailable.
</div>
```

```css
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 0.5rem 1rem;
  background: var(--color-warning);
  color: var(--color-text-primary);
  text-align: center;
  font-size: var(--text-sm);
  font-weight: 500;
  z-index: var(--z-toast);
}
```

### Network-Aware Loading

Adapt content quality based on connection speed:

```javascript
function getNetworkQuality() {
  const conn = navigator.connection;
  if (!conn) return "unknown";

  // effectiveType: 'slow-2g', '2g', '3g', '4g'
  if (conn.effectiveType === "4g" && !conn.saveData) return "high";
  if (conn.effectiveType === "3g") return "medium";
  return "low";
}

// Adapt loading strategy
const quality = getNetworkQuality();

if (quality === "high") {
  loadHighResImages();
  enableAnimations();
} else if (quality === "medium") {
  loadStandardImages();
  enableAnimations();
} else {
  loadLowResImages();
  disableNonEssentialAnimations();
}
```

### Basic Service Worker (Offline Cache)

```javascript
// sw.js — Cache critical assets for offline access
const CACHE_NAME = "v1";
const CRITICAL_ASSETS = ["/", "/styles.css", "/app.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CRITICAL_ASSETS)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // Return offline fallback for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        })
      );
    }),
  );
});
```

```javascript
// Register in main app
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

### `prefers-reduced-data` (Progressive Enhancement)

```css
@media (prefers-reduced-data: reduce) {
  .hero-video {
    display: none;
  }
  .hero-image {
    display: block;
  }
  .grain-overlay::after {
    display: none;
  }
  .parallax-bg {
    background-attachment: scroll;
  }
}
```

This media query respects the user's data-saving preference. Currently supported in limited browsers but progressive — no harm in including it.
