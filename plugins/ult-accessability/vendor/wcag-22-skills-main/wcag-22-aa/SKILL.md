---
name: wcag-22-aa
description: "Web development standard guide and engineering patterns for WCAG 2.2 Level AA compliance. Use when implementing accessible components, fixing accessibility audit issues, meeting ADA/Section 508/EN 301 549/EAA standards, or applying WCAG 2.2 criteria (such as Focus Not Obscured, Dragging Movements, Target Size Minimum, Redundant Entry, Consistent Help, and Accessible Authentication)."
risk: safe
source: local
date_added: "2026-09-16"
---

# WCAG 2.2 Level AA Web Development Standard Guide

> Definitive standard and engineering reference for building web applications compliant with WCAG 2.2 Level A and Level AA (the global legal standard for ADA Title II/III, EU European Accessibility Act EN 301 549, Section 508, and AODA).

## When to Use This Skill

- Developing frontend UI components, layouts, forms, dialogues, and web applications.
- Remedying accessibility audit findings (axe-core, Lighthouse, WAVE, manual screen-reader reviews).
- Designing interactive widgets that require keyboard navigation, visible focus management, and ARIA roles.
- Implementing the new **WCAG 2.2 criteria** (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8).
- Ensuring compliance with legal mandates: US ADA, Section 508, European Accessibility Act (EAA), and UK Public Sector Bodies Regulations.

---

## 1. What's New in WCAG 2.2 (Level A & AA)

WCAG 2.2 published as an official W3C Recommendation introduced 6 new criteria at Level A/AA and removed 1 obsolete criterion:

| Criterion | Level | Summary & Developer Mandate |
| :--- | :--- | :--- |
| **2.4.11 Focus Not Obscured (Minimum)** | **AA** | When a user interface component receives keyboard focus, the component is not **entirely hidden** due to author-created content (e.g., sticky headers, cookie banners, floating action buttons, sticky footers). |
| **2.5.7 Dragging Movements** | **AA** | All functionality that uses a dragging movement (e.g., drag-and-drop sortable lists, sliders, kanban boards) can also be achieved by a **single pointer without dragging** (e.g., clickable up/down arrows or action menus), unless dragging is essential. |
| **2.5.8 Target Size (Minimum)** | **AA** | Interactive pointer targets must have an area of at least **24×24 CSS pixels**, or provide sufficient spacing to adjacent targets so that a 24px diameter circle centered on each target does not intersect another target or circle, with exceptions for inline text, browser controls, and essential items. |
| **3.2.6 Consistent Help** | **A** | If help mechanisms (human contact info, contact form, self-help FAQs, automated chatbot) occur on multiple pages, they must be presented in the **same relative order** across the site. |
| **3.3.7 Redundant Entry** | **A** | Information previously entered by or provided to the user in the same process is either **auto-populated** or **available for the user to select**, unless re-entry is essential (e.g., password confirmation or security re-validation). |
| **3.3.8 Accessible Authentication (Minimum)** | **AA** | A cognitive function test (e.g., memorizing passwords, solving math puzzles, recognizing distorted text/CAPTCHA) is **not required** for any authentication step unless an alternative method, paste support, or object recognition helper is available. |
| **4.1.1 Parsing (Removed)** | **A** | **Removed from WCAG 2.2**. Modern browsers parse HTML5 deterministically. Conformance is now evaluated under 4.1.2 (Name, Role, Value). |

---

## 2. Core Engineering Principles (POUR)

### Principle 1: Perceivable

#### 1.1 Text Alternatives
- **1.1.1 Non-text Content (A)**: Every `<img>`, `<svg>`, and canvas conveying meaning must have an accessible text alternative (`alt="description"` or `aria-label`). Purely decorative elements must explicitly use `alt=""` or `aria-hidden="true"`.
  ```html
  <!-- Informative -->
  <img src="quarterly-growth.svg" alt="Bar chart showing 24% revenue growth in Q3 2026" />

  <!-- Decorative -->
  <img src="divider-flourish.svg" alt="" role="presentation" />
  ```

#### 1.3 Adaptable
- **1.3.1 Info and Relationships (A)**: Use semantic HTML elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`, `<h1>`-`<h6>`, `<table>`, `<ul>`, `<ol>`). Do not use styled `<div>` tags for headings, lists, or tables.
- **1.3.2 Meaningful Sequence (A)**: DOM order must reflect visual and logical reading order. Do not rely on CSS `order` or absolute positioning to fix out-of-order DOM elements.
- **1.3.4 Orientation (AA)**: Do not lock display orientation to portrait or landscape unless essential (e.g., piano app).
- **1.3.5 Identify Input Purpose (AA)**: Form inputs collecting common personal data (name, email, credit card, address) must have standard HTML `autocomplete` attributes.
  ```html
  <input type="email" id="user-email" name="email" autocomplete="email" required />
  ```

#### 1.4 Distinguishable
- **1.4.1 Use of Color (A)**: Color must not be the sole visual means of conveying information, indicating an action, or distinguishing an element. Combine color with text, icons, borders, or underlines.
- **1.4.3 Contrast (Minimum) (AA)**:
  - Normal text (< 18pt / 24px or < 14pt / 18.66px bold): Minimum **4.5:1** contrast ratio against background.
  - Large text (≥ 18pt / 24px or ≥ 14pt / 18.66px bold): Minimum **3:1** contrast ratio.
- **1.4.10 Reflow (AA)**: Content must reflow without loss of information and without requiring two-dimensional scrolling at a width equivalent to **320 CSS pixels** (or 400% zoom on a 1280px screen).
- **1.4.11 Non-text Contrast (AA)**: Visual information used to identify UI components (input borders, active tab outlines, toggles) and meaningful graphical objects must have at least **3:1** contrast against adjacent colors.
- **1.4.12 Text Spacing (AA)**: Content must not break or truncate when users override:
  - Line height: `1.5` times font size.
  - Paragraph spacing: `2` times font size.
  - Letter spacing: `0.12` times font size.
  - Word spacing: `0.16` times font size.

---

### Principle 2: Operable

#### 2.1 Keyboard Accessible
- **2.1.1 Keyboard (A)**: All functionality is operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, Arrows, `Esc`).
- **2.1.2 No Keyboard Trap (A)**: Keyboard focus can never be trapped inside a widget without a standard keyboard escape (`Esc` or `Tab`).
- **2.1.4 Character Key Shortcuts (A)**: Single-character shortcuts (e.g., pressing `?` for help) can be turned off or remapped.

#### 2.4 Navigable
- **2.4.1 Bypass Blocks (A)**: Provide a "Skip to main content" link at the very top of the page.
- **2.4.3 Focus Order (A)**: Focusable components receive focus in an order that preserves meaning and operability.
- **2.4.7 Focus Visible (AA)**: Any keyboard-operable interface has an obvious visual focus indicator. **Never set `outline: none` without providing an equivalent high-contrast replacement.**
- **2.4.11 Focus Not Obscured (Minimum) (AA - WCAG 2.2)**: Elements receiving focus cannot be completely hidden under sticky headers, footers, or overlays.
  ```css
  /* Prevent sticky headers from covering focused elements */
  html {
    scroll-padding-top: 5rem; /* Height of sticky navbar + buffer */
    scroll-padding-bottom: 3rem; /* Height of sticky footer */
  }

  :target, [tabindex]:focus, input:focus, button:focus {
    scroll-margin-top: 5.5rem;
  }
  ```

#### 2.5 Input Modalities
- **2.5.7 Dragging Movements (AA - WCAG 2.2)**: Always pair drag-and-drop lists with button controls (e.g., "Move Up" / "Move Down") or click-to-move menus.
- **2.5.8 Target Size (Minimum) (AA - WCAG 2.2)**: Pointer targets must be at least 24×24px, or offset with sufficient spacing.
  ```css
  /* Expand click/touch target to 24px minimum without altering visual layout */
  .icon-button-compact {
    position: relative;
    width: 16px;
    height: 16px;
  }
  .icon-button-compact::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 24px;
    height: 24px;
    transform: translate(-50%, -50%);
    min-width: 24px;
    min-height: 24px;
  }
  ```

---

### Principle 3: Understandable

#### 3.2 Predictable
- **3.2.1 On Focus (A)**: Receiving focus must not initiate a change of context (no auto-submitting, no unexpected navigation).
- **3.2.2 On Input (A)**: Changing the value of a form field (e.g., selecting a radio button or dropdown option) must not automatically submit the form or drastically change the layout unless warned in advance.
- **3.2.3 Consistent Navigation (AA)**: Navigational links repeated across pages must appear in the same relative order.
- **3.2.6 Consistent Help (A - WCAG 2.2)**: Help links, live chat buttons, or contact forms must be positioned consistently in the header, footer, or side drawer across all pages in the site.

#### 3.3 Input Assistance
- **3.3.1 Error Identification (A)**: If an input error is detected, the item in error is identified and described in text.
- **3.3.2 Labels or Instructions (A)**: Inputs must have explicit, persistent labels and format requirements (e.g., `YYYY-MM-DD`).
- **3.3.3 Error Suggestion (AA)**: If an error is detected and suggestions are known, provide constructive suggestions to resolve it.
- **3.3.4 Error Prevention (Legal, Financial, Data) (AA)**: For transactions causing legal or financial commitments, submissions must be reversible, checked for errors, or confirmed before final submission.
- **3.3.7 Redundant Entry (A - WCAG 2.2)**: Do not require users to re-enter billing address if it matches shipping address. Provide a "Same as shipping" checkbox or auto-fill previous answers across multi-step wizards.
- **3.3.8 Accessible Authentication (Minimum) (AA - WCAG 2.2)**:
  - Do not block password managers or clipboard pasting into password and OTP fields.
  - Provide email magic links, WebAuthn / Passkeys, or SMS/authenticator tokens instead of complex cognitive verification quizzes or CAPTCHAs.
  ```html
  <!-- Allow clipboard pasting into password/token fields -->
  <input 
    type="password" 
    id="pwd" 
    autocomplete="current-password" 
    onpaste="/* DO NOT PREVENT PASTE */" 
    required 
  />
  ```

---

### Principle 4: Robust

#### 4.1 Compatible
- **4.1.2 Name, Role, Value (A)**: All UI components must expose accessible names, standard roles, and current states (`aria-expanded`, `aria-checked`, `aria-disabled`, `aria-hidden`) to assistive technologies.
- **4.1.3 Status Messages (AA)**: Asynchronous status messages, search result count updates, and success toasts must be announced via live regions without moving focus:
  ```html
  <div role="status" aria-live="polite" class="sr-only">
    14 search results found.
  </div>
  ```

---

## 3. WCAG 2.2 AA Code Patterns

### Pattern A: Accessible Modal Dialog with Focus Trap & Escape Handling
```typescript
/**
 * Accessible Modal Dialog conforming to WAI-ARIA APG and WCAG 2.2
 */
export class AccessibleModal {
  private dialog: HTMLElement;
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(dialogId: string) {
    const el = document.getElementById(dialogId);
    if (!el) throw new Error(`Dialog #${dialogId} not found`);
    this.dialog = el;
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.bindEvents();
  }

  public open() {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.dialog.removeAttribute('hidden');
    this.updateFocusable();
    
    // Move focus inside dialog
    const firstFocusable = this.focusableElements[0] || this.dialog;
    firstFocusable.focus();
  }

  public close() {
    this.dialog.setAttribute('hidden', '');
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
    }
  }

  private updateFocusable() {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElements = Array.from(this.dialog.querySelectorAll(selector))
      .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true') as HTMLElement[];
  }

  private bindEvents() {
    this.dialog.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        e.stopPropagation();
      }

      if (e.key === 'Tab') {
        this.updateFocusable();
        if (this.focusableElements.length === 0) return;

        const first = this.focusableElements[0];
        const last = this.focusableElements[this.focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    });
  }
}
```

### Pattern B: Accessible Form Field with Error Association & Suggestion (3.3.1, 3.3.2, 3.3.3)
```html
<div class="form-group" id="group-email">
  <label for="email-input" class="form-label">
    Email Address <span aria-hidden="true" class="required-star">*</span>
  </label>
  <span id="email-hint" class="form-hint">
    Example: name@domain.com
  </span>
  <input
    type="email"
    id="email-input"
    name="email"
    class="form-input error-state"
    autocomplete="email"
    aria-required="true"
    aria-invalid="true"
    aria-describedby="email-hint email-error"
  />
  <span id="email-error" class="form-error" role="alert">
    <strong>Error:</strong> Please enter a valid email address with an "@" symbol and domain (e.g., user@example.com).
  </span>
</div>
```

### Pattern C: Drag-and-Drop with Keyboard & Single-Pointer Alternative (2.5.7)
```html
<ul class="sortable-list" aria-label="Task priority order">
  <li class="sortable-item" id="item-1">
    <span>Review Accessibility Plan</span>
    <!-- Drag handle for mouse users -->
    <span class="drag-handle" aria-hidden="true">⠿</span>
    <!-- 2.5.7 compliant buttons for keyboard and single-pointer users -->
    <div class="reorder-actions">
      <button 
        type="button" 
        class="reorder-btn" 
        aria-label="Move Review Accessibility Plan up"
        onclick="moveItem('item-1', 'up')"
      >▲</button>
      <button 
        type="button" 
        class="reorder-btn" 
        aria-label="Move Review Accessibility Plan down"
        onclick="moveItem('item-1', 'down')"
      >▼</button>
    </div>
  </li>
</ul>
```

### Pattern D: Redundant Entry Elimination in Multi-Step Checkout (3.3.7)
```html
<fieldset class="billing-fieldset">
  <legend>Billing Address</legend>
  
  <div class="checkbox-group">
    <input 
      type="checkbox" 
      id="same-as-shipping" 
      name="sameAsShipping" 
      onchange="toggleBillingAddressSync(this.checked)" 
    />
    <label for="same-as-shipping">
      Billing address is the same as shipping address
    </label>
  </div>

  <div id="billing-fields" class="sub-fields">
    <!-- Populated automatically if checked -->
  </div>
</fieldset>
```

---

## 4. Verification & Testing Workflow

### Automated Verification with Playwright & axe-core
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.2 AA Compliance Audit', () => {
  test('landing page meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('interactive modal handles focus and escape', async ({ page }) => {
    await page.goto('/checkout');
    await page.click('#open-terms-btn');

    // Verify modal is open and active
    const modal = page.locator('#terms-dialog');
    await expect(modal).toBeVisible();

    // Verify focused element is inside modal
    const isInside = await page.evaluate(() => {
      const modalEl = document.getElementById('terms-dialog');
      return modalEl?.contains(document.activeElement);
    });
    expect(isInside).toBe(true);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});
```

### Manual Audit Protocol (Mandatory Checklist)
1. **Unplug mouse**: Complete the entire user journey with `Tab`, `Shift+Tab`, `Enter`, `Space`, `Arrows`, `Esc`.
2. **Inspect focus indicators**: Verify every interactive item shows a distinct focus ring with at least 3:1 contrast against background.
3. **Check sticky headers**: Tab through elements under sticky headers to ensure `2.4.11 (Focus Not Obscured)` passes.
4. **Zoom to 400%**: At 1280px viewport width, zoom to 400% (320px equivalent). Confirm no two-dimensional scrolling occurs.
5. **Screen reader verification**: Test with VoiceOver (macOS / iOS: `Cmd + F5`) or NVDA (Windows: `Insert + Down Arrow`). Check landmark announcements and form error alerts.

---

## 5. Reference Files

- [checklist-aa.md](file:///Users/kvivek/.gemini/config/skills/wcag-22-aa/references/checklist-aa.md): Full criterion-by-criterion Level A and AA compliance checklist.
- [code-patterns-aa.md](file:///Users/kvivek/.gemini/config/skills/wcag-22-aa/references/code-patterns-aa.md): Component implementation library (tabs, accordions, comboboxes, skip links).
