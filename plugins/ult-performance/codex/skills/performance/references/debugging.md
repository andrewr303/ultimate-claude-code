# Debugging Animation Performance

Identify and fix performance issues in animated websites.

## Table of Contents

1. [Chrome DevTools](#chrome-devtools)
2. [GSAP Debugging](#gsap-debugging)
3. [Common Issues](#common-issues)
4. [Profiling Workflow](#profiling-workflow)

---

## Chrome DevTools

### Performance Panel

#### Recording a Profile

1. Open DevTools (F12)
2. Go to **Performance** tab
3. Click record (or Ctrl+E)
4. Perform the animation
5. Stop recording

#### What to Look For

```
Main thread (yellow blocks) - JavaScript execution
  - Long tasks (> 50ms) cause jank
  - Look for "Recalculate Style" and "Layout"

Compositor (green) - GPU work
  - Should be minimal if animating correctly

Raster (purple) - Painting
  - Shouldn't happen during animation

Frames (top row)
  - Red = dropped frame
  - Green = on time
  - Goal: all green at 60fps
```

#### Reading the Flame Chart

```
Large yellow block = Long JavaScript task
  ↳ "Recalculate Style" = CSS parsing
  ↳ "Layout" = Geometry calculations (BAD during animation)
  ↳ "Paint" = Filling pixels (BAD during animation)
  ↳ "Composite Layers" = GPU composition (GOOD)

Narrow green bars = Fast frame
Wide red bars = Dropped frame / jank
```

### Rendering Panel

Enable in DevTools: `⋮` → More tools → Rendering

#### Paint Flashing

Shows areas being repainted in green:

- **During animation**: Should see NO green
- **Green = Bad**: Triggering paint on every frame

#### Layout Shift Regions

Shows layout shifts in blue:

- Identifies CLS issues
- Should be minimal during animations

#### FPS Meter

Real-time frame rate display:

- Target: 60fps (green)
- 30-59fps (yellow) = noticeable jank
- < 30fps (red) = severe issues

### Layers Panel

Open: DevTools → `⋮` → More tools → Layers

#### What to Check

```
Number of layers - Aim for < 30
  - Too many = memory issues
  - will-change creates layers

Layer reasons - Why was layer created?
  - "will-change: transform" ✓
  - "3D transform" ✓
  - "Compositing reasons" - check if needed

Memory usage - Bytes per layer
  - Large layers = high memory
```

---

## GSAP Debugging

### Enable Markers

```javascript
ScrollTrigger.create({
  trigger: ".section",
  markers: true, // Show start/end markers
  start: "top center",
  end: "bottom center",
});
```

### Debug Mode

```javascript
// See all ScrollTriggers
console.log(ScrollTrigger.getAll());

// Inspect specific trigger
const st = ScrollTrigger.getById("myTrigger");
console.log(st.progress, st.direction, st.isActive);
```

### Timeline Debugging

```javascript
// Pause timeline for inspection
const tl = gsap.timeline({ paused: true });
tl.to(".element", { x: 100 }).to(".element", { y: 100 });

// Control manually
tl.progress(0.5); // Jump to 50%
tl.play();
tl.reverse();
tl.seek(1); // Jump to 1 second
```

### GSDevTools

```html
<!-- Add visual timeline controls -->
<script src="https://unpkg.com/gsap/dist/GSDevTools.min.js"></script>
```

```javascript
gsap.registerPlugin(GSDevTools);

GSDevTools.create({
  animation: mainTimeline,
  container: "#devtools",
});
```

### Performance Monitoring

```javascript
// Monitor ticker FPS
gsap.ticker.add(() => {
  const fps = Math.round(gsap.ticker.fps);
  document.getElementById("fps").textContent = fps;

  if (fps < 55) {
    console.warn("FPS drop:", fps);
  }
});

// Log when animations are slow
gsap.ticker.lagSmoothing(0); // Disable lag smoothing to see real performance
```

### Check for Memory Leaks

```javascript
// Log animation count
setInterval(() => {
  const tweens = gsap.globalTimeline.getChildren(true, true, false).length;
  const triggers = ScrollTrigger.getAll().length;
  console.log(`Tweens: ${tweens}, Triggers: ${triggers}`);
}, 5000);

// If count keeps growing, you have a leak
```

---

## Common Issues

### Issue: Animation Stutters

**Symptoms**: Choppy animation, dropped frames

**Debug Steps**:

1. Open Performance panel, record animation
2. Look for long tasks or layout/paint events
3. Check Layers panel for excessive layers

**Common Causes**:

```javascript
// BAD: Animating layout properties
gsap.to(".element", { width: "100%" }); // Triggers layout

// GOOD: Use transform
gsap.to(".element", { scale: 1.5 }); // GPU composited
```

### Issue: Scroll Jank

**Symptoms**: Janky scroll, delayed response

**Debug Steps**:

1. Check for non-passive scroll listeners
2. Look for heavy scroll handlers
3. Verify ScrollTrigger optimization

**Common Causes**:

```javascript
// BAD: Blocking scroll handler
window.addEventListener("scroll", heavyFunction);

// GOOD: Passive listener
window.addEventListener("scroll", lightFunction, { passive: true });

// BETTER: Use ScrollTrigger
ScrollTrigger.create({
  onUpdate: lightFunction,
});
```

### Issue: Memory Leak

**Symptoms**: Page slows over time, crashes

**Debug Steps**:

1. Memory panel → Take heap snapshot
2. Perform actions (navigate, animate)
3. Take another snapshot, compare
4. Look for growing arrays/objects

**Common Causes**:

```javascript
// BAD: Not cleaning up
function initAnimations() {
  gsap.to(".item", { x: 100 }); // Never killed
}

// GOOD: Use context
function initAnimations() {
  const ctx = gsap.context(() => {
    gsap.to(".item", { x: 100 });
  });
  return ctx; // Return for cleanup
}

// On unmount
ctx.revert();
```

### Issue: Layout Thrashing

**Symptoms**: Very slow animations, high CPU

**Debug Steps**:

1. Performance panel → Look for forced reflow
2. Search for "Forced reflow" in console
3. Check for read/write patterns

**Common Causes**:

```javascript
// BAD: Read-write loop
elements.forEach((el) => {
  const width = el.offsetWidth; // Read
  el.style.width = width + 10 + "px"; // Write
});

// GOOD: Batch reads, then writes
const widths = elements.map((el) => el.offsetWidth);
elements.forEach((el, i) => {
  el.style.width = widths[i] + 10 + "px";
});
```

### Issue: CLS (Layout Shift)

**Symptoms**: Content jumps during load

**Debug Steps**:

1. Rendering panel → Layout Shift Regions
2. Lighthouse → Performance audit
3. Look for images/fonts causing shift

**Common Causes**:

```html
<!-- BAD: No dimensions -->
<img src="image.jpg" alt="" />

<!-- GOOD: Reserve space -->
<img src="image.jpg" alt="" width="800" height="600" />
```

```css
/* Reserve space for dynamic content */
.dynamic-area {
  min-height: 300px;
}
```

---

## Profiling Workflow

### Step 1: Establish Baseline

```javascript
// Record baseline metrics
const baseline = {
  fps: [],
  memory: [],
};

// Measure for 10 seconds
const measure = setInterval(() => {
  baseline.fps.push(gsap.ticker.fps);
  baseline.memory.push(performance.memory?.usedJSHeapSize);
}, 1000);

setTimeout(() => {
  clearInterval(measure);
  console.log("Baseline:", baseline);
}, 10000);
```

### Step 2: Identify Hot Paths

1. Record Performance profile
2. Sort by "Self Time"
3. Focus on top time consumers
4. Look for unexpected entries

### Step 3: Isolate Issues

```javascript
// Disable animations one by one
gsap.globalTimeline.pause(); // Pause all

// Re-enable selectively
gsap.globalTimeline.getChildren()[0].play();
// Check performance
// Repeat to find culprit
```

### Step 4: Measure Improvements

```javascript
// Before/after comparison
console.time("animation");
gsap.to(".element", {
  x: 100,
  onComplete: () => console.timeEnd("animation"),
});
```

### Step 5: Continuous Monitoring

```javascript
// Production monitoring
if (process.env.NODE_ENV === "production") {
  // Report slow frames
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        // Report to analytics
        analytics.track("long_frame", {
          duration: entry.duration,
          page: window.location.pathname,
        });
      }
    }
  });

  observer.observe({ entryTypes: ["longtask"] });
}
```

---

## Quick Diagnostic Commands

### Console Commands

```javascript
// Check animation count
gsap.globalTimeline.getChildren(true, true, false).length;

// Check ScrollTrigger count
ScrollTrigger.getAll().length;

// Force ScrollTrigger refresh
ScrollTrigger.refresh();

// Kill all animations
gsap.killTweensOf("*");

// Check for detached elements
gsap.globalTimeline
  .getChildren()
  .filter((t) => t.targets && t.targets().some((el) => !document.contains(el)));
```

### DevTools Commands

```javascript
// In Console panel

// Force garbage collection (requires --enable-gc flag)
gc();

// Get memory info
performance.memory;

// Clear performance marks
performance.clearMarks();
performance.clearMeasures();

// Monitor long tasks
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log("Long task:", entry.duration, "ms");
  });
});
observer.observe({ entryTypes: ["longtask"] });
```

---

## Performance Debugging Checklist

### Before Debugging

- [ ] Disable browser extensions
- [ ] Use incognito mode
- [ ] Test on target device (or throttle CPU)
- [ ] Clear cache and reload

### During Debugging

- [ ] Record with CPU throttling enabled
- [ ] Test both cold and warm scenarios
- [ ] Check mobile and desktop separately
- [ ] Look at both scroll and click interactions

### Common Fixes

- [ ] Replace width/height with scale
- [ ] Replace top/left with transform
- [ ] Add { passive: true } to scroll listeners
- [ ] Use gsap.context() for cleanup
- [ ] Add will-change only during animation
- [ ] Use content-visibility for sections
- [ ] Lazy load below-fold content
