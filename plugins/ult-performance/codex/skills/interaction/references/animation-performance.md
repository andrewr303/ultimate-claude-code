# Animation Performance

Achieve 60fps animations through GPU acceleration and optimization.

## Table of Contents

1. [Compositor Properties](#compositor-properties)
2. [Layout and Paint](#layout-and-paint)
3. [will-change Management](#will-change-management)
4. [Memory Optimization](#memory-optimization)
5. [Scroll Performance](#scroll-performance)

---

## Compositor Properties

### GPU-Accelerated Properties

These properties are handled by the GPU compositor and don't trigger layout or paint:

```css
/* FAST - Compositor only */
transform: translate(), scale(), rotate(), skew();
opacity: 0 to 1;
filter: blur(), brightness(), contrast(), etc.;

/* These create compositor layers */
will-change: transform, opacity;
transform: translateZ(0);
backface-visibility: hidden;
```

### The Rendering Pipeline

```
JavaScript → Style → Layout → Paint → Composite
                ↑       ↑       ↑          ↑
            (cheap)  (slow)  (slow)    (fast!)
```

**Goal**: Skip Layout and Paint, animate only in Composite phase.

### Transform vs Position Properties

```css
/* SLOW - Triggers layout every frame */
.element {
  position: absolute;
  transition:
    top 0.3s,
    left 0.3s;
}
.element:hover {
  top: 10px;
  left: 10px;
}

/* FAST - GPU composited */
.element {
  transition: transform 0.3s;
}
.element:hover {
  transform: translate(10px, 10px);
}
```

### Scale vs Width/Height

```css
/* SLOW - Layout recalculation */
.card {
  transition:
    width 0.3s,
    height 0.3s;
}
.card:hover {
  width: 110%;
  height: 110%;
}

/* FAST - GPU composited */
.card {
  transition: transform 0.3s;
}
.card:hover {
  transform: scale(1.1);
}
```

### Opacity vs Visibility/Display

```css
/* Transitions work with opacity */
.element {
  opacity: 0;
  transition: opacity 0.3s;
}
.element.visible {
  opacity: 1;
}

/* visibility and display don't animate */
/* Use opacity + pointer-events instead */
.hidden {
  opacity: 0;
  pointer-events: none;
}
```

---

## Layout and Paint

### What Triggers Layout (Reflow)

```css
/* Layout-triggering properties */
width, height, min-*, max-*
padding, margin, border-width
top, right, bottom, left
font-size, line-height
display, position, float
flexbox/grid changes
```

### What Triggers Paint

```css
/* Paint-triggering properties */
background, background-*
color
border-color, border-style
box-shadow, text-shadow
outline
visibility
```

### Forced Synchronous Layout

```javascript
// BAD - Causes layout thrashing
elements.forEach((el) => {
  el.style.width = el.offsetWidth + 10 + "px"; // Read then write
});

// GOOD - Batch reads, then batch writes
const widths = elements.map((el) => el.offsetWidth);
elements.forEach((el, i) => {
  el.style.width = widths[i] + 10 + "px";
});
```

### Layout-Triggering DOM Reads

```javascript
/* These force layout calculation */
(element.offsetTop, offsetLeft, offsetWidth, offsetHeight);
(element.scrollTop, scrollLeft, scrollWidth, scrollHeight);
(element.clientTop, clientLeft, clientWidth, clientHeight);
element.getBoundingClientRect();
window.getComputedStyle();
```

### Using requestAnimationFrame

```javascript
// BAD - May cause jank
function animate() {
  element.style.transform = `translateX(${x}px)`;
  x += 1;
  setTimeout(animate, 16);
}

// GOOD - Synced with browser paint
function animate() {
  element.style.transform = `translateX(${x}px)`;
  x += 1;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

---

## will-change Management

### Purpose

`will-change` hints to the browser that a property will animate, allowing it to optimize in advance.

### Correct Usage

```css
/* Apply BEFORE animation starts */
.card {
  transition: transform 0.3s;
}

.card:hover {
  will-change: transform;
  transform: translateY(-10px);
}

/* Remove after animation (via JS or transitionend) */
```

```javascript
// Apply before animation
element.style.willChange = "transform";

// Animate
gsap.to(element, {
  y: -10,
  onComplete: () => {
    // Remove after animation
    element.style.willChange = "auto";
  },
});
```

### Anti-Patterns

```css
/* NEVER - Wastes GPU memory */
* {
  will-change: transform;
}

/* NEVER - Too many layers */
.card {
  will-change: transform, opacity, filter, box-shadow;
}

/* NEVER - Always on */
.animated {
  will-change: transform; /* Even when not animating */
}
```

### Layer Management

```javascript
// Check how many layers you're creating
// Chrome DevTools > Layers panel

// Each will-change creates a new layer
// Aim for < 30 composite layers
```

### Dynamic will-change

```javascript
// Add on hover intent
element.addEventListener("mouseenter", () => {
  element.style.willChange = "transform";
});

// Animate
element.addEventListener("click", () => {
  gsap.to(element, { y: -20 });
});

// Remove when done
element.addEventListener("mouseleave", () => {
  // Wait for any animation to complete
  gsap.delayedCall(0.5, () => {
    element.style.willChange = "auto";
  });
});
```

---

## Memory Optimization

### Animation Cleanup

```javascript
// GSAP - Always kill animations when done
const animation = gsap.to(".element", { x: 100 });

// On component unmount or page leave
animation.kill();

// Kill all animations on an element
gsap.killTweensOf(".element");
```

### ScrollTrigger Cleanup

```javascript
// Store references
const triggers = [];

function initScrollAnimations() {
  triggers.push(
    ScrollTrigger.create({
      trigger: ".section",
      // ...
    }),
  );
}

function cleanup() {
  triggers.forEach((st) => st.kill());
  triggers.length = 0;
}
```

### gsap.context() Pattern

```javascript
// Best practice for cleanup
function initPage() {
  const ctx = gsap.context(() => {
    // All animations in this scope
    gsap.from(".hero", { opacity: 0 });
    gsap.from(".content", { y: 50 });

    ScrollTrigger.create({ trigger: ".section" });
  });

  return ctx;
}

// Cleanup is automatic
const ctx = initPage();
ctx.revert(); // Kills all animations in context
```

### SplitText Memory

```javascript
// SplitText creates DOM elements
const split = new SplitText(".text", { type: "chars" });

// Always revert when done
function cleanup() {
  split.revert(); // Restores original DOM
}
```

### Event Listener Cleanup

```javascript
// Use AbortController
const controller = new AbortController();

window.addEventListener("scroll", handler, {
  signal: controller.signal,
  passive: true,
});

window.addEventListener("resize", handler, {
  signal: controller.signal,
});

// Cleanup all listeners
controller.abort();
```

### Object Pool Pattern

```javascript
// For frequently created/destroyed animations
const animationPool = [];

function getAnimation() {
  return animationPool.pop() || gsap.timeline({ paused: true });
}

function releaseAnimation(tl) {
  tl.clear();
  tl.pause();
  animationPool.push(tl);
}
```

---

## Scroll Performance

### Passive Event Listeners

```javascript
// BAD - Blocks scrolling
window.addEventListener("scroll", handler);

// GOOD - Non-blocking
window.addEventListener("scroll", handler, { passive: true });

// Note: Can't call preventDefault() with passive: true
```

### Debounce and Throttle

```javascript
// Throttle - Execute at most once per interval
function throttle(fn, wait) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

// Debounce - Execute after pause in calls
function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Usage
window.addEventListener("scroll", throttle(handleScroll, 16), {
  passive: true,
});
window.addEventListener("resize", debounce(handleResize, 100));
```

### Use ScrollTrigger Instead

```javascript
// ScrollTrigger handles optimization automatically
ScrollTrigger.create({
  trigger: ".element",
  onUpdate: (self) => {
    // This is already optimized
    console.log(self.progress);
  },
});

// Much better than manual scroll listeners
```

### Intersection Observer

```javascript
// For visibility-based triggers
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  {
    rootMargin: "50px",
    threshold: 0.1,
  },
);

document.querySelectorAll(".animate-on-scroll").forEach((el) => {
  observer.observe(el);
});
```

### content-visibility

```css
/* Skip rendering off-screen content */
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}

/* Explicit rendering control */
.below-fold {
  content-visibility: hidden;
}

.below-fold.visible {
  content-visibility: visible;
}
```

### CSS Containment

```css
/* Isolate layout/paint calculations */
.card {
  contain: layout style;
}

/* Full containment */
.widget {
  contain: strict;
}

/* Combinations */
.animated-section {
  contain: layout style paint;
}
```

---

## Benchmarking

### Frame Rate Measurement

```javascript
let lastTime = performance.now();
let frames = 0;
let fps = 0;

function measureFPS() {
  frames++;
  const now = performance.now();

  if (now - lastTime >= 1000) {
    fps = Math.round((frames * 1000) / (now - lastTime));
    console.log(`FPS: ${fps}`);
    frames = 0;
    lastTime = now;
  }

  requestAnimationFrame(measureFPS);
}

measureFPS();
```

### GSAP Ticker

```javascript
// Monitor GSAP performance
gsap.ticker.add(() => {
  const fps = Math.round(gsap.ticker.fps);
  if (fps < 55) {
    console.warn(`Low FPS: ${fps}`);
  }
});
```

### Performance Marks

```javascript
// Mark start
performance.mark("animation-start");

// Run animation
await gsap.to(".element", { x: 100 }).then();

// Mark end
performance.mark("animation-end");

// Measure
performance.measure("animation-duration", "animation-start", "animation-end");

// Log
const measure = performance.getEntriesByName("animation-duration")[0];
console.log(`Animation took: ${measure.duration}ms`);
```

---

## Performance Checklist

### Before Launch

- [ ] Only transform and opacity animated
- [ ] will-change used sparingly and temporarily
- [ ] All animations cleaned up on navigation
- [ ] Scroll listeners are passive
- [ ] Images lazy loaded
- [ ] content-visibility on below-fold sections
- [ ] Bundle size within budget
- [ ] No layout thrashing in animation code
- [ ] Reduced motion respected
- [ ] Tested on mid-range mobile device

### Chrome DevTools Checks

1. **Performance panel**: No red frames or long tasks
2. **Layers panel**: < 30 composite layers
3. **Rendering**: No paint flashing during animation
4. **Memory**: No memory growth over time
5. **Network**: Initial load < 200KB gzipped

---

## ScrollTrigger.batch() for Grid Performance

For grids with 20+ items, `ScrollTrigger.batch()` creates ONE observer instead of individual ScrollTriggers per item:

```javascript
// GOOD: Single observer for entire grid
gsap.set(items, { opacity: 0, y: 30 });

ScrollTrigger.batch(items, {
  start: "top 90%",
  onEnter: (batch) => {
    gsap.to(batch, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: "power3.out",
      overwrite: true,
    });
  },
  once: true,
});

// BAD: Individual ScrollTrigger per item (20+ triggers)
items.forEach((item) => {
  gsap.from(item, {
    opacity: 0,
    y: 30,
    scrollTrigger: { trigger: item, start: "top 90%" },
  });
});
```

The `overwrite: true` prevents animation conflicts when batch callbacks fire for the same element.

### content-visibility for Off-Screen Sections

Skip rendering for sections not in the viewport:

```css
.section-lazy {
  content-visibility: auto;
  contain-intrinsic-size: 0 600px;
}

.contain-card {
  contain: layout style paint;
}
```

- `content-visibility: auto` tells the browser to skip rendering until the section nears the viewport
- `contain-intrinsic-size: 0 600px` provides a placeholder height to prevent layout jumps
- `contain: layout style paint` on individual cards isolates their rendering costs

---

## matchMedia() for Responsive Animation

Use `gsap.matchMedia()` to create different animations for different viewports with automatic cleanup:

```javascript
const mm = gsap.matchMedia();

// Desktop: horizontal scroll
mm.add("(prefers-reduced-motion: no-preference) and (min-width: 769px)", () => {
  gsap.to(track, {
    x: -totalWidth,
    scrollTrigger: { trigger: section, pin: true, scrub: 1 },
  });
  // Auto-reverted when viewport shrinks below 769px
});

// Mobile: vertical stack with simple reveals
mm.add("(max-width: 768px), (prefers-reduced-motion: reduce)", () => {
  gsap.from(cards, {
    opacity: 0,
    y: 30,
    stagger: 0.12,
    scrollTrigger: { trigger: section, start: "top 85%", once: true },
  });
  // Auto-reverted when viewport grows above 768px
});
```

`matchMedia()` auto-reverts animations when conditions change — no manual cleanup needed. This is critical for horizontal scroll sections that should become vertical stacks on mobile.
