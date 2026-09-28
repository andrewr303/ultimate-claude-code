import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../src/App'

describe('App (demo integration)', () => {
  it('renders the workspace with the queue and the state harness', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Requests' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'State harness' })).toBeInTheDocument()
    expect(
      screen.getByRole('table', { name: /requests awaiting adjudication/i }),
    ).toBeInTheDocument()

    // The harness documents its exclusions — every N/A row carries a reason.
    expect(screen.getAllByText(/N\/A ·/i).length).toBeGreaterThanOrEqual(10)
    expect(screen.getByText('The queue is empty.')).toBeInTheDocument()

    // The state matrix scrolls in its own labelled, keyboard-focusable region
    // at narrow viewports instead of overflowing the page.
    expect(
      screen.getByRole('region', { name: /state harness table, scrolls horizontally/i }),
    ).toBeInTheDocument()
  })

  it('creates a request end to end: dialog, form, queue update, announcement', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Create request' }))

    const dialog = screen.getByRole('dialog', { name: 'New review request' })
    expect(dialog).toBeInTheDocument()

    const form = within(dialog)
    await user.type(form.getByLabelText('Subject'), 'Refund a duplicated annual charge')
    await user.type(form.getByLabelText('Requester'), 'Dana Okafor')
    await user.selectOptions(form.getByLabelText('Category'), 'payout')
    await user.click(form.getByRole('button', { name: 'Create request' }))

    // Async submit (~250 ms), then the dialog closes and the queue announces.
    expect(
      await screen.findByText('Request REQ-1031 created and added to the queue.'),
    ).toBeInTheDocument()
    // Closed dialogs leave the accessibility tree (native display:none).
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // The created request is auto-selected, so its detail renders immediately —
    // scoped to the Requests section (the harness keeps its own open detail).
    const requestsSection = screen.getByRole('region', { name: 'Requests' })
    const detail = within(requestsSection).getByRole('region', { name: /request detail/i })
    expect(within(detail).getByText('Refund a duplicated annual charge')).toBeInTheDocument()
    expect(within(detail).getByText('Dana Okafor')).toBeInTheDocument()

    // The record itself sits on the last page of the oldest-first queue.
    // Scoped: the state harness renders its own pagination samples.
    await user.click(within(requestsSection).getByRole('button', { name: 'Page 4' }))
    expect(
      within(requestsSection).getByText('Showing 25–31 of 31 requests'),
    ).toBeInTheDocument()
    const mainTable = screen.getByRole('table', { name: /requests awaiting adjudication/i })
    expect(within(mainTable).getByText('REQ-1031')).toBeInTheDocument()
  })

  it('sorts the harness sample table one column at a time and reorders its rows', async () => {
    const user = userEvent.setup()
    render(<App />)

    const sample = screen.getByRole('table', { name: /sort header samples/i })
    const rowIds = (): string[] =>
      within(sample)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent ?? '')

    // Default: submitted ascending — the August request comes first.
    expect(rowIds()).toEqual(['REQ-9102', 'REQ-9101'])

    // Sorting by request id flips the order; only that header is non-none.
    await user.click(within(sample).getByRole('button', { name: 'Request' }))
    expect(rowIds()).toEqual(['REQ-9101', 'REQ-9102'])
    expect(
      within(sample).getByRole('columnheader', { name: 'Request' }),
    ).toHaveAttribute('aria-sort', 'ascending')
    expect(
      within(sample).getByRole('columnheader', { name: 'Submitted' }),
    ).toHaveAttribute('aria-sort', 'none')

    // Clicking the active header toggles to descending and flips the rows.
    await user.click(within(sample).getByRole('button', { name: 'Request' }))
    expect(rowIds()).toEqual(['REQ-9102', 'REQ-9101'])
    expect(
      within(sample).getByRole('columnheader', { name: 'Request' }),
    ).toHaveAttribute('aria-sort', 'descending')

    // Sorting by status moves the sort; the previous column resets to none.
    await user.click(within(sample).getByRole('button', { name: 'Status' }))
    expect(rowIds()).toEqual(['REQ-9102', 'REQ-9101'])
    expect(
      within(sample).getByRole('columnheader', { name: 'Status' }),
    ).toHaveAttribute('aria-sort', 'ascending')
    expect(
      within(sample).getByRole('columnheader', { name: 'Request' }),
    ).toHaveAttribute('aria-sort', 'none')

    // Exactly one non-none aria-sort exists at any time.
    const nonNone = within(sample)
      .getAllByRole('columnheader')
      .filter((header) => header.getAttribute('aria-sort') !== 'none')
    expect(nonNone).toHaveLength(1)
  })

  it('toggles the dark theme from semantic tokens', async () => {
    const user = userEvent.setup()
    render(<App />)

    const toggle = screen.getByRole('button', { name: 'Dark theme' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
