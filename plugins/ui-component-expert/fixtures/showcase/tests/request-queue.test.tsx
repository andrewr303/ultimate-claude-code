import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RequestQueue } from '../src'
import type { RequestRecord } from '../src'
import { createSyntheticRequests } from '../src/data/records'

/** Controlled wrapper: selection is a parent concern, like the demo uses it. */
function QueueHarness({ records }: { records: RequestRecord[] }): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <RequestQueue
      records={records}
      idPrefix="q"
      caption="Requests awaiting adjudication"
      selectedId={selectedId}
      onSelect={(record) => setSelectedId(record === null ? null : record.id)}
    />
  )
}

function dataRows(): HTMLElement[] {
  const tbody = screen.getAllByRole('rowgroup')[1]
  return within(tbody).getAllByRole('row')
}

describe('RequestQueue', () => {
  it('renders a semantic table with a caption, row headers, and sort controls', () => {
    render(<QueueHarness records={createSyntheticRequests()} />)

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(within(table).getByText('Requests awaiting adjudication')).toBeInTheDocument()

    for (const label of ['Request', 'Subject', 'Requester', 'Category', 'Priority', 'Status', 'Amount', 'Submitted', 'Actions']) {
      expect(
        screen.getByRole('columnheader', { name: label }),
      ).toBeInTheDocument()
    }

    // Default queue order: oldest first, announced through aria-sort.
    const submittedHeader = screen.getByRole('columnheader', { name: /submitted/i })
    expect(submittedHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(within(submittedHeader).getByRole('button', { name: 'Submitted' })).toBeInTheDocument()

    expect(within(dataRows()[0]).getByText('REQ-1001')).toBeInTheDocument()
  })

  it('filters rows by requester and announces the filtered count', async () => {
    const user = userEvent.setup()
    render(<QueueHarness records={createSyntheticRequests()} />)

    await user.type(screen.getByLabelText('Filter requests'), 'maya')

    // Header row + three Maya Ellis requests.
    expect(screen.getAllByRole('row')).toHaveLength(4)
    for (const id of ['REQ-1004', 'REQ-1014', 'REQ-1027']) {
      expect(screen.getByText(id)).toBeInTheDocument()
    }
    expect(
      screen.getByText('Showing 1–3 of 3 requests · filtered from 30'),
    ).toBeInTheDocument()
  })

  it('filters rows by status', async () => {
    const user = userEvent.setup()
    render(<QueueHarness records={createSyntheticRequests()} />)

    await user.selectOptions(screen.getByLabelText('Status'), 'on_hold')

    expect(dataRows()).toHaveLength(4)
    expect(
      screen.getByText('Showing 1–4 of 4 requests · filtered from 30'),
    ).toBeInTheDocument()
    // Scoped to the table body: the status filter's own <option> also reads "On hold".
    expect(within(screen.getAllByRole('rowgroup')[1]).getAllByText('On hold')).toHaveLength(4)
  })

  it('recovers from no results by clearing the filters', async () => {
    const user = userEvent.setup()
    render(<QueueHarness records={createSyntheticRequests()} />)

    await user.type(screen.getByLabelText('Filter requests'), 'zzz')

    expect(screen.getByText('No requests match “zzz”.')).toBeInTheDocument()
    expect(screen.getByText(/clear the filters or try a different term/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(dataRows()).toHaveLength(8)
    expect(screen.getByText('Showing 1–8 of 30 requests')).toBeInTheDocument()
  })

  it('sorts by the clicked header and toggles direction', async () => {
    const user = userEvent.setup()
    render(<QueueHarness records={createSyntheticRequests()} />)

    const submittedButton = within(
      screen.getByRole('columnheader', { name: /submitted/i }),
    ).getByRole('button', { name: 'Submitted' })

    await user.click(submittedButton)
    expect(screen.getByRole('columnheader', { name: /submitted/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(within(dataRows()[0]).getByText('REQ-1030')).toBeInTheDocument()

    await user.click(submittedButton)
    expect(screen.getByRole('columnheader', { name: /submitted/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(within(dataRows()[0]).getByText('REQ-1001')).toBeInTheDocument()
  })

  it('paginates through pages and disables navigation at the bounds', async () => {
    const user = userEvent.setup()
    render(<QueueHarness records={createSyntheticRequests()} />)

    const previous = screen.getByRole('button', { name: 'Previous page' })
    const next = screen.getByRole('button', { name: 'Next page' })

    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()
    expect(screen.getByText('Showing 1–8 of 30 requests')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getByText('Showing 9–16 of 30 requests')).toBeInTheDocument()
    expect(within(dataRows()[0]).getByText('REQ-1009')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Page 4' }))
    expect(screen.getByText('Showing 25–30 of 30 requests')).toBeInTheDocument()
    expect(next).toBeDisabled()
    expect(previous).toBeEnabled()
  })

  it('marks the current page with aria-current', async () => {
    const user = userEvent.setup()
    render(<QueueHarness records={createSyntheticRequests()} />)

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('expands a row detail, then closes it and returns focus to the row', async () => {
    const user = userEvent.setup()
    render(<QueueHarness records={createSyntheticRequests()} />)

    const toggle = screen.getByRole('button', { name: 'Details for REQ-1003' })
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle.closest('tr')).toHaveAttribute('aria-current', 'true')

    const detail = screen.getByRole('region', { name: /request detail/i })
    expect(within(detail).getByText('Press-kit artwork usage approval')).toBeInTheDocument()
    expect(within(detail).getByText('Ingrid Halvorsen')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close detail' }))

    expect(screen.queryByRole('region', { name: /request detail/i })).not.toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('renders the empty state with its recovery action', async () => {
    const onEmptyAction = vi.fn()
    const user = userEvent.setup()
    render(
      <RequestQueue
        records={[]}
        idPrefix="q-empty"
        emptyActionLabel="Create the first request"
        onEmptyAction={onEmptyAction}
      />,
    )

    expect(screen.queryByLabelText('Filter requests')).not.toBeInTheDocument()
    expect(screen.getByText('The queue is empty.')).toBeInTheDocument()
    expect(
      screen.getByText('Requests submitted for review will appear here.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create the first request' }))
    expect(onEmptyAction).toHaveBeenCalledTimes(1)
  })
})
