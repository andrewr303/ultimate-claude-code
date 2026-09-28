import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RequestForm } from '../src'
import type { RequestFormSubmitResult } from '../src'

describe('RequestForm', () => {
  it('renders visible labels and hints above the controls and keeps submit enabled while empty', () => {
    const onSubmit = vi.fn()
    render(<RequestForm idPrefix="tf" onSubmit={onSubmit} />)

    const subject = screen.getByLabelText('Subject')
    const requester = screen.getByLabelText('Requester')
    const category = screen.getByLabelText('Category')
    const priority = screen.getByLabelText('Priority')
    const notes = screen.getByLabelText('Notes')

    for (const control of [subject, requester, category, priority, notes]) {
      expect(control).not.toHaveAttribute('aria-invalid')
    }

    // Hints sit above the controls and are wired through aria-describedby.
    expect(
      screen.getByText('8–120 characters. State the requested action.'),
    ).toBeInTheDocument()
    expect(subject.getAttribute('aria-describedby')).toContain('tf-subject-hint')

    // No submit disabled for invalid fields — the empty form stays submittable.
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeEnabled()
  })

  it('validates on blur and clears the error when the value is corrected', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RequestForm idPrefix="tf" onSubmit={onSubmit} />)

    const subject = screen.getByLabelText('Subject')
    await user.type(subject, 'No')
    await user.tab()

    expect(screen.getByText('Use 8–120 characters for the subject.')).toBeInTheDocument()
    expect(subject).toHaveAttribute('aria-invalid', 'true')
    expect(subject.getAttribute('aria-describedby')).toContain('tf-subject-error')
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(subject, 'w refund the duplicate charge')
    expect(
      screen.queryByText('Use 8–120 characters for the subject.'),
    ).not.toBeInTheDocument()
    expect(subject).not.toHaveAttribute('aria-invalid')
    expect(subject.getAttribute('aria-describedby')).not.toContain('tf-subject-error')
  })

  it('validates everything on submit, focuses the first invalid field, and does not call onSubmit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RequestForm idPrefix="tf" onSubmit={onSubmit} />)

    const subject = screen.getByLabelText('Subject')
    const requester = screen.getByLabelText('Requester')
    const category = screen.getByLabelText('Category')

    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(screen.getByText('Enter a subject for the request.')).toBeInTheDocument()
    expect(screen.getByText("Enter the requester's name.")).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()

    expect(subject).toHaveFocus()
    expect(subject).toHaveAttribute('aria-invalid', 'true')
    expect(requester).toHaveAttribute('aria-invalid', 'true')
    expect(category).toHaveAttribute('aria-invalid', 'true')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the entered values and resets after success', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue({ status: 'created', id: 'REQ-2001' })
    const onSuccess = vi.fn()
    render(<RequestForm idPrefix="tf" onSubmit={onSubmit} onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('Subject'), 'Refund a duplicated annual charge')
    await user.type(screen.getByLabelText('Requester'), 'Dana Okafor')
    await user.selectOptions(screen.getByLabelText('Category'), 'payout')

    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    // The notice splits the reference across a span; match on the region's full text.
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Request created. Reference REQ-2001.',
    )
    expect(onSubmit).toHaveBeenCalledWith({
      subject: 'Refund a duplicated annual charge',
      requester: 'Dana Okafor',
      category: 'payout',
      priority: 'standard',
      notes: '',
    })
    expect(onSuccess).toHaveBeenCalledWith({
      id: 'REQ-2001',
      values: {
        subject: 'Refund a duplicated annual charge',
        requester: 'Dana Okafor',
        category: 'payout',
        priority: 'standard',
        notes: '',
      },
    })

    // Reset for the next entry.
    expect(screen.getByLabelText('Subject')).toHaveValue('')
    expect(screen.getByLabelText('Category')).toHaveValue('')
  })

  it('shows the pending state while the injected onSubmit runs', async () => {
    const user = userEvent.setup()
    const never = new Promise<RequestFormSubmitResult>(() => {})
    const onSubmit = vi.fn().mockReturnValue(never)
    render(<RequestForm idPrefix="tf" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Subject'), 'Refund a duplicated annual charge')
    await user.type(screen.getByLabelText('Requester'), 'Dana Okafor')
    await user.selectOptions(screen.getByLabelText('Category'), 'payout')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    const submit = screen.getByRole('button', { name: 'Submit request' })
    expect(submit).toBeDisabled()
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.queryByRole('button', { name: /retry submission/i }),
    ).not.toBeInTheDocument()
  })

  it('retains every value on failure and succeeds on retry', async () => {
    const user = userEvent.setup()
    let call = 0
    const onSubmit = vi.fn(async (): Promise<RequestFormSubmitResult> => {
      call += 1
      return call === 1
        ? { status: 'failed', message: 'The review service timed out.' }
        : { status: 'created', id: 'REQ-2002' }
    })
    render(<RequestForm idPrefix="tf" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Subject'), 'Refund a duplicated annual charge')
    await user.type(screen.getByLabelText('Requester'), 'Dana Okafor')
    await user.selectOptions(screen.getByLabelText('Category'), 'payout')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Couldn’t submit the request. The review service timed out.')

    // Failure retains values.
    expect(screen.getByLabelText('Subject')).toHaveValue('Refund a duplicated annual charge')
    expect(screen.getByLabelText('Category')).toHaveValue('payout')

    await user.click(screen.getByRole('button', { name: 'Retry submission' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Request created. Reference REQ-2002.',
    )
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('treats a rejected onSubmit as a failed outcome with its message', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network offline'))
    render(<RequestForm idPrefix="tf" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Subject'), 'Refund a duplicated annual charge')
    await user.type(screen.getByLabelText('Requester'), 'Dana Okafor')
    await user.selectOptions(screen.getByLabelText('Category'), 'payout')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Couldn’t submit the request. Network offline')
    expect(screen.getByRole('button', { name: 'Retry submission' })).toBeInTheDocument()
  })
})
