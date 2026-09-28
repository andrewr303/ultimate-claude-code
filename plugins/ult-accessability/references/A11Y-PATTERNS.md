# Accessibility Code Patterns

Practical, copy-paste-ready patterns for common accessibility requirements. Each `##` heading is a stable anchor (lowercase-hyphen) that skills link to, e.g. `references/A11Y-PATTERNS.md#focus-rings`.

Related: [WCAG.md](WCAG.md) for the criterion table, [REPORT-TEMPLATE.md](REPORT-TEMPLATE.md) for audit reporting.

---

## Skip link

First focusable element on every page with repetitive navigation. `WCAG 2.2 SC 2.4.1 (Bypass Blocks, A)`.

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header><!-- navigation --></header>
  <main id="main-content" tabindex="-1">
    <!-- main content -->
  </main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -100px;
  left: 1rem;
  z-index: 9999;
  padding: 0.75rem 1.25rem;
  background-color: #0f172a;
  color: #ffffff;
  font-weight: 600;
  text-decoration: underline;
  border-radius: 0.375rem;
  transition: top 0.15s ease-in-out;
}

.skip-link:focus {
  top: 1rem;
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

#main-content:focus {
  outline: none; /* container itself needs no visible ring */
}
```

---

## Visually hidden

Hide content visually while keeping it available to screen readers (e.g. "(opens in new tab)" suffixes, live-region announcers).

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Modal and focus trap

Trap Tab/Shift+Tab inside the dialog, return focus on close, and close on Escape. Prefer native `<dialog>`, which traps focus and handles Escape automatically.

```html
<!-- ✅ Preferred: native dialog -->
<dialog id="confirm-dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm action</h2>
  <p>Are you sure you want to continue?</p>
  <form method="dialog">
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>
```

```javascript
const dialog = document.getElementById('confirm-dialog');
const opener = document.activeElement;

// dialog.showModal() traps focus and closes on Escape automatically
dialog.showModal();

dialog.addEventListener('close', () => {
  opener.focus(); // always return focus to the trigger
});
```

```javascript
// Fallback: manual trap for custom (non-<dialog>) modals
function trapFocus(modal) {
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') closeModal();
  });

  first.focus();
}
```

Custom modal markup needs `role="dialog" aria-modal="true" aria-labelledby="…"`. `WCAG 2.2 SC 2.1.2 (No Keyboard Trap, A)`.

---

## Focus rings

Never `outline: none` without a replacement. AA: visible indicator with 3:1 contrast. AAA (`WCAG 2.2 SC 2.4.13 (Focus Appearance, AAA)`): ≥ 2px perimeter, 3:1 against both the unfocused state and adjacent colors — the double ring meets this on any background.

```css
/* AA baseline */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* AAA double ring: inner light separator + outer high-contrast ring */
:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 3px;
  box-shadow:
    0 0 0 2px #ffffff,
    0 0 0 5px #005fcc;
}

@media (prefers-color-scheme: dark) {
  :focus-visible {
    outline: 3px solid #60a5fa;
    outline-offset: 3px;
    box-shadow:
      0 0 0 2px #0f172a,
      0 0 0 5px #60a5fa;
  }
}
```

Use `:focus-visible` (not `:focus`) so mouse clicks don't show outlines. Inset indicators must be 3px+ since they eat into the component. `WCAG 2.2 SC 2.4.7 (Focus Visible, AA)`, `WCAG 2.2 SC 1.4.11 (Non-text Contrast, AA)`.

---

## Scroll margin

Keep focused elements clear of sticky headers/footers so they are never obscured on scroll.

```css
:root {
  --header-height: 80px;
  --footer-height: 60px;
  --focus-buffer: 24px;
}

/* AA: keep at least part of the target visible */
html {
  scroll-padding-top: 5rem;
}

/* AAA (2.4.12: no part obscured): explicit clearance everywhere */
html {
  scroll-padding-top: calc(var(--header-height) + var(--focus-buffer));
  scroll-padding-bottom: calc(var(--footer-height) + var(--focus-buffer));
}

a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  scroll-margin-top: calc(var(--header-height) + var(--focus-buffer));
  scroll-margin-bottom: calc(var(--footer-height) + var(--focus-buffer));
}
```

`WCAG 2.2 SC 2.4.11 (Focus Not Obscured (Minimum), AA)`, `WCAG 2.2 SC 2.4.12 (Focus Not Obscured (Enhanced), AAA)`.

---

## Combobox

Autocomplete with `role="combobox"`, listbox popup, and full keyboard support (Up/Down/Enter/Escape). `WCAG 2.2 SC 4.1.2 (Name, Role, Value, A)`.

```html
<div class="combobox-wrapper">
  <label for="country-input" id="country-label">Choose a country</label>
  <input
    type="text"
    id="country-input"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded="false"
    aria-controls="country-listbox"
    aria-labelledby="country-label"
    aria-activedescendant=""
    autocomplete="off"
  />
  <ul id="country-listbox" role="listbox" aria-labelledby="country-label" hidden>
    <li id="opt-us" role="option" aria-selected="false">United States</li>
    <li id="opt-ca" role="option" aria-selected="false">Canada</li>
  </ul>
</div>
```

```javascript
input.addEventListener('keydown', (e) => {
  const isOpen = !listbox.hasAttribute('hidden');
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (!isOpen) open();
      setActive((activeIndex + 1) % options.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (!isOpen) open();
      setActive((activeIndex - 1 + options.length) % options.length);
      break;
    case 'Enter':
      if (isOpen && activeIndex >= 0) {
        e.preventDefault();
        selectOption(options[activeIndex]);
      }
      break;
    case 'Escape':
      if (isOpen) { e.preventDefault(); close(); }
      break;
  }
});

function setActive(index) {
  options.forEach((opt) => {
    opt.classList.remove('active');
    opt.setAttribute('aria-selected', 'false');
  });
  activeIndex = index;
  options[index].classList.add('active');
  options[index].setAttribute('aria-selected', 'true');
  input.setAttribute('aria-activedescendant', options[index].id);
}
```

---

## Accordion

Disclosure pattern: button with `aria-expanded`/`aria-controls`, panel with `role="region"`. `WCAG 2.2 SC 1.3.1 (Info and Relationships, A)`, `WCAG 2.2 SC 4.1.2 (Name, Role, Value, A)`.

```html
<div class="accordion-item">
  <h3>
    <button type="button" class="accordion-trigger"
            aria-expanded="false" aria-controls="faq-panel-1" id="faq-header-1">
      <span class="accordion-title">What is WCAG 2.2 AA compliance?</span>
      <span class="accordion-icon" aria-hidden="true">+</span>
    </button>
  </h3>
  <div id="faq-panel-1" class="accordion-panel"
       role="region" aria-labelledby="faq-header-1" hidden>
    <p>WCAG 2.2 Level AA is the internationally recognized benchmark for digital accessibility.</p>
  </div>
</div>
```

```javascript
document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.setAttribute('aria-expanded', String(!expanded));
    if (panel) expanded ? panel.setAttribute('hidden', '') : panel.removeAttribute('hidden');
  });
});
```

---

## Tabs

`tablist`/`tab`/`tabpanel` roles with roving tabindex: arrows move between tabs, active tab gets `tabindex="0"`, inactive tabs `tabindex="-1"`.

```html
<div role="tablist" aria-label="Product information">
  <button role="tab" id="tab-1" aria-selected="true"
          aria-controls="panel-1">Description</button>
  <button role="tab" id="tab-2" aria-selected="false"
          aria-controls="panel-2" tabindex="-1">Reviews</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  <!-- Panel content -->
</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  <!-- Panel content -->
</div>
```

Arrow keys move focus and select; Home/End jump to first/last tab.

---

## Forms and errors

Every input gets an explicit label plus `autocomplete` where applicable; placeholders are never labels. Errors use `aria-invalid` + `aria-describedby`, a visible message, and focus moves to the first invalid field on submit.

```html
<!-- ✅ Explicit label with autocomplete -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email" required>

<!-- ✅ Label + instructions -->
<label for="password">Password</label>
<input type="password" id="password" aria-describedby="password-requirements">
<p id="password-requirements">Must be at least 8 characters with one number.</p>

<!-- ✅ Error state: icon + text, not color alone -->
<label for="email2">Email</label>
<input type="email" id="email2" aria-invalid="true" aria-describedby="email2-error">
<p id="email2-error" class="error" role="alert">
  Error: please enter a valid email address (e.g., name@example.com)
</p>
```

```javascript
form.addEventListener('submit', (e) => {
  const firstError = form.querySelector('[aria-invalid="true"]');
  if (firstError) {
    e.preventDefault();
    const summary = document.getElementById('error-summary');
    summary.textContent = 'Please fix the highlighted errors and try again.';
    summary.focus();
    firstError.focus();
  }
});
```

`WCAG 2.2 SC 3.3.1 (Error Identification, A)`, `WCAG 2.2 SC 3.3.2 (Labels or Instructions, A)`, `WCAG 2.2 SC 3.3.3 (Error Suggestion, AA)`, `WCAG 2.2 SC 1.3.5 (Identify Input Purpose, AA)`.

---

## Live regions and toasts

Announce dynamic changes without moving focus. Mount announcer containers once at startup; clear before writing so repeat messages re-announce.

```html
<div id="a11y-announcer" class="visually-hidden"
     role="status" aria-live="polite" aria-atomic="true"></div>
<div id="a11y-alert-announcer" class="visually-hidden"
     role="alert" aria-live="assertive" aria-atomic="true"></div>
```

```javascript
function announce(message, priority = 'polite') {
  const id = priority === 'assertive' ? 'a11y-alert-announcer' : 'a11y-announcer';
  const announcer = document.getElementById(id);
  if (!announcer) return;
  announcer.textContent = '';
  requestAnimationFrame(() => { announcer.textContent = message; });
}
```

`role="status"` = polite, `role="alert"` = assertive (interrupts). `WCAG 2.2 SC 4.1.3 (Status Messages, AA)`.

---

## Target size

AA: 24×24 CSS px minimum (or 24px-circle spacing). AAA (`WCAG 2.2 SC 2.5.5 (Target Size (Enhanced), AAA)`): 44×44. Expand hit areas with pseudo-elements so small visuals keep large targets.

```css
/* AA: 24px minimum */
.touch-target-min {
  position: relative;
  min-width: 24px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* AAA: 44px token */
:root { --target-size-aaa: 44px; }

.icon-action-btn {
  position: relative;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
}

.icon-action-btn::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--target-size-aaa);
  height: var(--target-size-aaa);
  transform: translate(-50%, -50%);
}

/* Row spacing prevents target-circle intersection */
.icon-row { display: flex; gap: 8px; }
```

Exceptions: inline links in sentences, unmodified browser defaults, and essential presentations. `WCAG 2.2 SC 2.5.8 (Target Size (Minimum), AA)`.

---

## Dragging alternative

Every drag operation needs a single-pointer alternative: up/down buttons, click-to-move, or keyboard-operable controls. Applies to reorderable lists, sliders, map panning, and color pickers.

```html
<!-- ❌ Drag-only reorder -->
<ul class="sortable-list" draggable="true">
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<!-- ✅ Drag + button alternatives -->
<ul class="sortable-list">
  <li>
    <span>Item 1</span>
    <button aria-label="Move Item 1 up">↑</button>
    <button aria-label="Move Item 1 down">↓</button>
  </li>
  <li>
    <span>Item 2</span>
    <button aria-label="Move Item 2 up">↑</button>
    <button aria-label="Move Item 2 down">↓</button>
  </li>
</ul>
```

`WCAG 2.2 SC 2.5.7 (Dragging Movements, AA)`.

---

## Auth and paste-friendly inputs

Never block paste (password managers depend on it), never require a cognitive test without an alternative, and offer WebAuthn/passkeys where possible.

```html
<form action="/login" method="POST" class="auth-form">
  <div class="form-group">
    <label for="username">Username or Email</label>
    <input type="text" id="username" name="username"
           autocomplete="username webauthn" required />
  </div>
  <div class="form-group">
    <label for="password">Password</label>
    <!-- Never disable onpaste or oncopy -->
    <input type="password" id="password" name="password"
           autocomplete="current-password" required />
    <button type="button" id="toggle-pwd-btn"
            aria-label="Show password" aria-pressed="false">
      Show
    </button>
  </div>
  <button type="button" id="webauthn-signin" class="btn-secondary">
    Sign in with Passkey / Face ID
  </button>
  <button type="submit" class="btn-primary">Sign In</button>
</form>
```

```javascript
function togglePasswordVisibility() {
  const input = document.getElementById('password');
  const btn = document.getElementById('toggle-pwd-btn');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.setAttribute('aria-pressed', String(isHidden));
  btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
}
```

No CAPTCHAs, puzzles, or memorized passphrases as the only path. `WCAG 2.2 SC 3.3.8 (Accessible Authentication (Minimum), AA)`.

---

## Reduced motion

Honor `prefers-reduced-motion`: disable parallax, scroll-triggered animation, and auto-advancing carousels; shorten rather than remove meaningful motion (e.g. crossfade a spinner instead of spinning it).

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```javascript
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion) {
  element.animate(keyframes, { duration: 300 });
}
```

`WCAG 2.2 SC 2.3.3 (Animation from Interactions, AAA)`, `WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide, A)`.

---

## Content on hover

Hover/focus-revealed content (tooltips, menus) must be dismissible with Esc (without moving pointer/focus), hoverable (pointer can move onto it), and persistent (stays until dismissed or focus leaves).

```html
<button aria-describedby="tip-save">Save</button>
<div id="tip-save" role="tooltip" hidden>
  Saves your changes. Press Esc to dismiss.
</div>
```

```javascript
trigger.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !tooltip.hasAttribute('hidden')) {
    e.preventDefault();
    tooltip.setAttribute('hidden', '');
    trigger.focus();
  }
});
```

Keep the tooltip open while the pointer travels from trigger to tooltip, and until focus moves away. `WCAG 2.2 SC 1.4.13 (Content on Hover or Focus, AA)`.
