import '@testing-library/jest-dom/vitest'

/**
 * jsdom ships <dialog> without the modal API: no showModal, no close. The
 * component relies on those native methods, so this adds the minimal surface —
 * open reflection via the attribute, a modal show, and a close that fires the
 * close event — letting behavior tests exercise the same code paths as the
 * browser. Real browsers never reach these branches.
 */
const dialogProto =
  typeof HTMLDialogElement !== 'undefined' ? HTMLDialogElement.prototype : undefined

if (
  dialogProto !== undefined &&
  typeof (dialogProto as { showModal?: unknown }).showModal !== 'function'
) {
  Object.defineProperty(dialogProto, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (this.open) return
      this.setAttribute('open', '')
    },
  })
}

if (
  dialogProto !== undefined &&
  typeof (dialogProto as { close?: unknown }).close !== 'function'
) {
  Object.defineProperty(dialogProto, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.open) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
}

/**
 * jsdom does not implement matchMedia. The fixture only reads it once at
 * startup (theme bootstrap); this stub keeps that path inert under test.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  const stub: MediaQueryList = {
    matches: false,
    media: '',
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({ ...stub, media: query }),
  })
}
