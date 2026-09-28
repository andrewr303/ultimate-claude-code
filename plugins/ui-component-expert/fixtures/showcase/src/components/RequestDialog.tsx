import { useEffect, useId, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'

export type RequestDialogCloseReason = 'cancel' | 'close'

export interface RequestDialogProps {
  /** Renders in the top layer when true. Escape reports "cancel". */
  open: boolean
  /** Accessible, visible dialog title. */
  title: string
  /**
   * Called once with "cancel" (Escape) or "close" (any other path) after the
   * dialog has closed. Focus returns to the opener either way.
   */
  onClose: (reason: RequestDialogCloseReason) => void
  /** Dialog body; typically a RequestForm. Rendered only while open. */
  children?: ReactNode
  /** Unique prefix for composed element ids. Generated when omitted. */
  idPrefix?: string
}

/**
 * Native `<dialog>` wrapper.
 *
 * `showModal()` provides the browser's own background inertness, focus
 * containment, top layer, and ::backdrop — none of that is reimplemented
 * here. The component adds exactly what React needs on top:
 * state sync, a close reason, initial focus, and focus restoration.
 */
export function RequestDialog({
  open,
  title,
  onClose,
  children,
  idPrefix,
}: RequestDialogProps): ReactElement {
  const autoPrefix = useId()
  const prefix = idPrefix ?? autoPrefix

  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const reasonRef = useRef<RequestDialogCloseReason | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return

    // Arrow consts capture the non-null narrowing; hoisted function
    // declarations would lose it.
    const handleCancel = (event: Event): void => {
      // Escape. We take over the close so the reason reaches the caller
      // exactly once, deterministically across browsers and jsdom.
      event.preventDefault()
      reasonRef.current = 'cancel'
      dialog.close()
    }

    const handleClose = (): void => {
      onCloseRef.current(reasonRef.current ?? 'close')
      reasonRef.current = null
      openerRef.current?.focus()
      openerRef.current = null
    }

    dialog.addEventListener('cancel', handleCancel)
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      dialog.removeEventListener('close', handleClose)
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return

    if (open && !dialog.open) {
      const active = document.activeElement
      openerRef.current = active instanceof HTMLElement ? active : null
      dialog.showModal()
      // Native focusing steps prefer [autofocus]; this explicit fallback also
      // covers engines without those steps and keeps jsdom tests deterministic.
      const firstField = dialog.querySelector<HTMLElement>('input, select, textarea')
      firstField?.focus()
    }
    if (!open && dialog.open) {
      // Fires the native "close" event; the listener reports and restores focus.
      dialog.close()
    }
  }, [open])

  const headingId = `${prefix}-title`

  return (
    <dialog
      ref={dialogRef}
      id={`${prefix}-dialog`}
      className="qc-dialog"
      aria-labelledby={headingId}
    >
      <header className="qc-dialog-head">
        <h2 id={headingId}>{title}</h2>
        <p className="qc-dialog-sub">Press Escape to cancel and return to the queue.</p>
      </header>
      <div className="qc-dialog-body">{open ? children : null}</div>
    </dialog>
  )
}
