import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RequestDialog, RequestForm } from '../src'
import type { RequestDialogCloseReason } from '../src'

/**
 * jsdom does not synthesize the dialog "cancel" event from an Escape keydown
 * (that mapping is a browser behavior of native <dialog>), so the Escape test
 * dispatches the cancel event directly — exactly what the browser emits.
 */
function HarnessDialog({
  onClosed,
}: {
  onClosed: (reason: RequestDialogCloseReason) => void
}): ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <RequestDialog
        open={open}
        title="New review request"
        idPrefix="test-dialog"
        onClose={(reason) => {
          setOpen(false)
          onClosed(reason)
        }}
      >
        <RequestForm
          idPrefix="test-dialog-form"
          onSubmit={async () => ({ status: 'created', id: 'REQ-1' })}
          onCancel={() => setOpen(false)}
        />
      </RequestDialog>
    </>
  )
}

function dialogElement(): HTMLDialogElement {
  return screen.getByRole('dialog') as HTMLDialogElement
}

describe('RequestDialog', () => {
  it('opens with showModal, labels itself, and moves focus to the first control', async () => {
    const user = userEvent.setup()
    const onClosed = vi.fn()
    render(<HarnessDialog onClosed={onClosed} />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    const dialog = dialogElement()
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: 'New review request' })).toBeInTheDocument()
    expect(screen.getByLabelText('Subject')).toHaveFocus()
  })

  it('cancels on the native cancel event, reports the reason, and restores focus to the opener', async () => {
    const user = userEvent.setup()
    const onClosed = vi.fn()
    render(<HarnessDialog onClosed={onClosed} />)

    const opener = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(opener)
    const dialog = dialogElement()
    fireEvent(dialog, new Event('cancel'))

    expect(onClosed).toHaveBeenCalledWith('cancel')
    // jsdom keeps a closed dialog in the a11y tree, so assert on the open
    // attribute — the engine-independent truth.
    expect(dialog).not.toHaveAttribute('open')
    expect(opener).toHaveFocus()
  })

  it('reports "close" and restores focus when the content closes the dialog', async () => {
    const user = userEvent.setup()
    const onClosed = vi.fn()
    render(<HarnessDialog onClosed={onClosed} />)

    const opener = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(opener)
    const dialog = dialogElement()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClosed).toHaveBeenCalledWith('close')
    expect(dialog).not.toHaveAttribute('open')
    expect(opener).toHaveFocus()
  })

  it('reopens cleanly after closing', async () => {
    const user = userEvent.setup()
    const onClosed = vi.fn()
    render(<HarnessDialog onClosed={onClosed} />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    const dialog = dialogElement()
    expect(dialog).toHaveAttribute('open')

    fireEvent(dialog, new Event('cancel'))
    expect(dialog).not.toHaveAttribute('open')

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByLabelText('Subject')).toHaveFocus()
  })
})
