# WCAG 2.2 Level AA Component & Code Pattern Library

Production-grade accessible code patterns conforming to W3C WAI-ARIA Authoring Practices Guide (APG) and WCAG 2.2 Level AA.

---

## 1. Skip Navigation Link (2.4.1 Bypass Blocks & 2.4.11 Focus Not Obscured)

```html
<!-- Place as the very first item inside <body> -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<header class="site-header">
  <nav aria-label="Main Navigation">
    <!-- Header links -->
  </nav>
</header>

<main id="main-content" tabindex="-1">
  <!-- Page content -->
</main>
```

```css
/* Visible on keyboard focus, visually hidden otherwise */
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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
  transition: top 0.15s ease-in-out;
}

.skip-link:focus {
  top: 1rem;
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}

/* Ensure focus lands cleanly without getting cut off by sticky headers */
html {
  scroll-padding-top: 5rem;
}

#main-content:focus {
  outline: none; /* Container itself doesn't need visible ring unless interacted */
}
```

---

## 2. Accessible Combobox / Autocomplete (4.1.2 Name, Role, Value)

```html
<div class="combobox-wrapper">
  <label for="country-input" id="country-label">Choose a country</label>
  <div class="combobox-control">
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
    <button
      type="button"
      id="country-toggle"
      aria-label="Toggle country list"
      aria-expanded="false"
      aria-controls="country-listbox"
      tabindex="-1"
    >
      ▼
    </button>
  </div>
  <ul
    id="country-listbox"
    role="listbox"
    aria-labelledby="country-label"
    hidden
  >
    <li id="opt-us" role="option" aria-selected="false">United States</li>
    <li id="opt-ca" role="option" aria-selected="false">Canada</li>
    <li id="opt-uk" role="option" aria-selected="false">United Kingdom</li>
    <li id="opt-de" role="option" aria-selected="false">Germany</li>
  </ul>
</div>
```

```typescript
export class AccessibleCombobox {
  private input: HTMLInputElement;
  private listbox: HTMLUListElement;
  private options: HTMLLIElement[];
  private activeIndex: number = -1;

  constructor(container: HTMLElement) {
    this.input = container.querySelector('[role="combobox"]')!;
    this.listbox = container.querySelector('[role="listbox"]')!;
    this.options = Array.from(this.listbox.querySelectorAll('[role="option"]'));
    this.bindEvents();
  }

  private bindEvents() {
    this.input.addEventListener('keydown', (e) => {
      const isOpen = !this.listbox.hasAttribute('hidden');

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) this.open();
          this.setActiveOption((this.activeIndex + 1) % this.options.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) this.open();
          this.setActiveOption((this.activeIndex - 1 + this.options.length) % this.options.length);
          break;
        case 'Enter':
          if (isOpen && this.activeIndex >= 0) {
            e.preventDefault();
            this.selectOption(this.options[this.activeIndex]);
          }
          break;
        case 'Escape':
          if (isOpen) {
            e.preventDefault();
            this.close();
          }
          break;
      }
    });

    this.options.forEach((opt, idx) => {
      opt.addEventListener('click', () => this.selectOption(opt));
    });
  }

  private open() {
    this.listbox.removeAttribute('hidden');
    this.input.setAttribute('aria-expanded', 'true');
  }

  private close() {
    this.listbox.setAttribute('hidden', '');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.activeIndex = -1;
  }

  private setActiveOption(index: number) {
    this.options.forEach(opt => {
      opt.classList.remove('active');
      opt.setAttribute('aria-selected', 'false');
    });
    this.activeIndex = index;
    const activeOpt = this.options[index];
    activeOpt.classList.add('active');
    activeOpt.setAttribute('aria-selected', 'true');
    this.input.setAttribute('aria-activedescendant', activeOpt.id);
  }

  private selectOption(opt: HTMLLIElement) {
    this.input.value = opt.textContent?.trim() || '';
    this.close();
    this.input.focus();
  }
}
```

---

## 3. Accessible Accordion / Disclosure (1.3.1 & 4.1.2)

```html
<div class="accordion" id="faq-accordion">
  <div class="accordion-item">
    <h3>
      <button
        type="button"
        class="accordion-trigger"
        aria-expanded="false"
        aria-controls="faq-panel-1"
        id="faq-header-1"
      >
        <span class="accordion-title">What is WCAG 2.2 AA compliance?</span>
        <span class="accordion-icon" aria-hidden="true">+</span>
      </button>
    </h3>
    <div
      id="faq-panel-1"
      class="accordion-panel"
      role="region"
      aria-labelledby="faq-header-1"
      hidden
    >
      <p>
        WCAG 2.2 Level AA is the internationally recognized benchmark for digital accessibility,
        mandated by the US ADA, European Accessibility Act, and Section 508.
      </p>
    </div>
  </div>
</div>
```

```javascript
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    const panelId = trigger.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);

    trigger.setAttribute('aria-expanded', String(!isExpanded));
    if (panel) {
      if (isExpanded) {
        panel.setAttribute('hidden', '');
      } else {
        panel.removeAttribute('hidden');
      }
    }
  });
});
```

---

## 4. Toast Notifications & Live Status Announcements (4.1.3 Status Messages)

```html
<!-- Place live region container into the DOM once at startup -->
<div 
  id="a11y-announcer" 
  class="sr-only" 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
></div>

<div 
  id="a11y-alert-announcer" 
  class="sr-only" 
  role="alert" 
  aria-live="assertive" 
  aria-atomic="true"
></div>
```

```typescript
/**
 * Programmatically announce status messages to screen readers without moving focus.
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const containerId = priority === 'assertive' ? 'a11y-alert-announcer' : 'a11y-announcer';
  const announcer = document.getElementById(containerId);
  if (!announcer) return;

  // Clear and update text to trigger screen reader announcement
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 50);
}
```

---

## 5. Minimum Target Size Enforcer (2.5.8 Target Size Minimum)

```css
/* Ensure small buttons meet the 24x24 CSS px requirement without disturbing UI layout */
.touch-target-min {
  position: relative;
  min-width: 24px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Hit-area expander for small inline icons or badges */
.touch-target-min::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  min-width: 24px;
  min-height: 24px;
  transform: translate(-50%, -50%);
}

/* Ensure 24px center-to-center separation if visual size is smaller */
.icon-row {
  display: flex;
  gap: 8px; /* Prevents target circle intersection */
}
```

---

## 6. Accessible Authentication & Paste-Friendly Inputs (3.3.8 Accessible Authentication)

```html
<form action="/login" method="POST" class="auth-form">
  <div class="form-group">
    <label for="username">Username or Email</label>
    <input 
      type="text" 
      id="username" 
      name="username" 
      autocomplete="username webauthn" 
      required 
    />
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <div class="password-wrapper">
      <!-- Never disable onpaste or oncopy -->
      <input 
        type="password" 
        id="password" 
        name="password" 
        autocomplete="current-password" 
        required 
      />
      <!-- Show/Hide password toggle button with accessible label -->
      <button 
        type="button" 
        id="toggle-pwd-btn" 
        aria-label="Show password"
        aria-pressed="false"
        onclick="togglePasswordVisibility()"
      >
        👁️
      </button>
    </div>
  </div>

  <!-- Passkey / WebAuthn Alternative for zero-cognitive login -->
  <div class="auth-alternatives">
    <button 
      type="button" 
      id="webauthn-signin" 
      class="btn-secondary"
      onclick="signInWithPasskey()"
    >
      Sign in with Passkey / Face ID
    </button>
  </div>

  <button type="submit" class="btn-primary">Sign In</button>
</form>
```

```javascript
function togglePasswordVisibility() {
  const pwdInput = document.getElementById('password');
  const btn = document.getElementById('toggle-pwd-btn');
  const isHidden = pwdInput.type === 'password';

  pwdInput.type = isHidden ? 'text' : 'password';
  btn.setAttribute('aria-pressed', String(isHidden));
  btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
}

// Passkey authentication implementation (WCAG 2.2 AA compliant: No cognitive test needed)
async function signInWithPasskey() {
  if (!window.PublicKeyCredential) {
    alert('WebAuthn/Passkeys not supported in this browser.');
    return;
  }
  try {
    // Challenge from server
    const options = await fetch('/api/auth/passkey-options').then(r => r.json());
    const credential = await navigator.credentials.get({ publicKey: options });
    await fetch('/api/auth/passkey-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential)
    });
    window.location.href = '/dashboard';
  } catch (err) {
    console.error('Passkey authentication failed:', err);
  }
}
```
