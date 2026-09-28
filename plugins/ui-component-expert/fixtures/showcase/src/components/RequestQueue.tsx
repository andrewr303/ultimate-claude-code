import { useId, useMemo, useState } from 'react'
import type { ReactElement } from 'react'

import type { RequestRecord, RequestStatus, SortKey, SortState } from '../types'
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '../labels'
import { formatDetailDate, formatListDate, formatMoney } from '../format'
import { filterRecords, pageCount, sortRecords } from './queue-utils'
import { Pagination } from './Pagination'

export interface RequestQueueProps {
  /** Structured request records under review. */
  records: RequestRecord[]
  /** Visible, accessible table caption. */
  caption?: string
  /** Rows per page. Default 8. */
  pageSize?: number
  /** Controlled selected request id; null clears the selection. */
  selectedId?: string | null
  /**
   * Called with the request whose row toggle was activated, or null when
   * the detail panel is cleared.
   */
  onSelect?: (record: RequestRecord | null) => void
  /** Initial text filter value; uncontrolled afterwards. Default "". */
  initialFilterText?: string
  /** Empty-state recovery label. Rendered only when onEmptyAction is set. */
  emptyActionLabel?: string
  /** Empty-state recovery callback. */
  onEmptyAction?: () => void
  /** Unique prefix for composed element ids. Generated when omitted. */
  idPrefix?: string
}

interface ColumnDefinition {
  key: SortKey | null
  label: string
  className: string
}

/** Amount, requester, and category yield to the narrower viewports below 768px. */
const COLUMNS: ReadonlyArray<ColumnDefinition> = [
  { key: 'id', label: 'Request', className: 'cell-id' },
  { key: 'subject', label: 'Subject', className: 'cell-subject' },
  { key: 'requester', label: 'Requester', className: 'cell-requester col-collapsible' },
  { key: 'category', label: 'Category', className: 'cell-category col-collapsible' },
  { key: 'priority', label: 'Priority', className: 'cell-priority' },
  { key: 'status', label: 'Status', className: 'cell-status' },
  { key: 'amount', label: 'Amount', className: 'cell-amount col-collapsible' },
  { key: 'submittedAt', label: 'Submitted', className: 'cell-submitted' },
  { key: null, label: 'Actions', className: 'cell-actions' },
]

const COLUMN_COUNT = COLUMNS.length

export function RequestQueue({
  records,
  caption = 'Requests awaiting adjudication',
  pageSize = 8,
  selectedId = null,
  onSelect,
  initialFilterText = '',
  emptyActionLabel = 'Create a request',
  onEmptyAction,
  idPrefix,
}: RequestQueueProps): ReactElement {
  const autoPrefix = useId()
  const prefix = idPrefix ?? autoPrefix

  const [filterText, setFilterText] = useState(initialFilterText)
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [sort, setSort] = useState<SortState>({ key: 'submittedAt', direction: 'asc' })
  const [page, setPage] = useState(1)

  const filtered = useMemo(
    () => filterRecords(records, filterText, statusFilter),
    [records, filterText, statusFilter],
  )
  const sorted = useMemo(
    () => sortRecords(filtered, sort.key, sort.direction),
    [filtered, sort],
  )

  const totalPages = pageCount(filtered.length, pageSize)
  const safePage = Math.min(page, totalPages)
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filtered.length)
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  )

  const detailId = `${prefix}-detail`
  const detailHeadingId = `${prefix}-detail-heading`

  function rowToggleId(id: string): string {
    return `${prefix}-row-toggle-${id}`
  }

  function toggleSort(key: SortKey): void {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  function sortAttribute(key: SortKey | null): 'ascending' | 'descending' | 'none' | undefined {
    if (key === null) return undefined
    if (sort.key !== key) return 'none'
    return sort.direction === 'asc' ? 'ascending' : 'descending'
  }

  function selectRecord(record: RequestRecord | null): void {
    onSelect?.(record)
  }

  function clearFilters(): void {
    setFilterText('')
    setStatusFilter('all')
    setPage(1)
  }

  function closeDetail(): void {
    if (selectedRecord === null) return
    onSelect?.(null)
    // The close button is about to unmount; put focus back on the row toggle
    // so keyboard users land somewhere meaningful, not on <body>.
    document.getElementById(rowToggleId(selectedRecord.id))?.focus()
  }

  const countText =
    filtered.length === 0
      ? `No matching requests — ${records.length} in queue`
      : `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} requests` +
        (filtered.length < records.length ? ` · filtered from ${records.length}` : '')

  if (records.length === 0) {
    return (
      <div className="queue-empty">
        <p className="queue-empty-title">The queue is empty.</p>
        <p className="queue-empty-hint">
          Requests submitted for review will appear here.
        </p>
        {onEmptyAction !== undefined && (
          <button type="button" className="btn btn-primary" onClick={onEmptyAction}>
            {emptyActionLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="queue">
      <div className="queue-controls">
        <div className="field field--filter">
          <label htmlFor={`${prefix}-filter-text`}>Filter requests</label>
          <p className="field-hint" id={`${prefix}-filter-text-hint`}>
            Matches request ID, subject, or requester.
          </p>
          <input
            id={`${prefix}-filter-text`}
            name="request-filter"
            type="search"
            className="control"
            autoComplete="off"
            placeholder="e.g. REQ-1027 or a name"
            value={filterText}
            aria-describedby={`${prefix}-filter-text-hint`}
            onChange={(event) => {
              setFilterText(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="field field--filter">
          <label htmlFor={`${prefix}-filter-status`}>Status</label>
          <p className="field-hint" id={`${prefix}-filter-status-hint`}>
            Limit the queue to one workflow position.
          </p>
          <select
            id={`${prefix}-filter-status`}
            name="request-status"
            className="control"
            value={statusFilter}
            aria-describedby={`${prefix}-filter-status-hint`}
            onChange={(event) => {
              setStatusFilter(event.target.value as RequestStatus | 'all')
              setPage(1)
            }}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <p className="queue-count" role="status">
          {countText}
        </p>
      </div>

      <div
        className="table-scroll"
        role="region"
        aria-label="Requests table, scrolls horizontally on narrow screens"
        tabIndex={0}
      >
        <table className="queue-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const sortKey = column.key
                return (
                  <th
                    key={column.label}
                    scope="col"
                    className={column.className}
                    aria-sort={sortAttribute(sortKey)}
                  >
                    {sortKey === null ? (
                      column.label
                    ) : (
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => toggleSort(sortKey)}
                      >
                        {column.label}
                      </button>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr className="queue-no-results">
                <td colSpan={COLUMN_COUNT}>
                  <p className="queue-no-results-title">
                    {filterText.trim().length > 0
                      ? `No requests match “${filterText.trim()}”.`
                      : 'No requests match the selected status.'}
                  </p>
                  <p className="queue-no-results-hint">
                    Clear the filters or try a different term.
                  </p>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : (
              pageRows.map((record) => {
                const isSelected = record.id === selectedId
                return (
                  <tr key={record.id} aria-current={isSelected ? 'true' : undefined}>
                    <td className="cell-id">{record.id}</td>
                    <td className="cell-subject">{record.subject}</td>
                    <td className="cell-requester col-collapsible">{record.requester}</td>
                    <td className="cell-category col-collapsible">
                      {CATEGORY_LABELS[record.category]}
                    </td>
                    <td className="cell-priority" data-priority={record.priority}>
                      {PRIORITY_LABELS[record.priority]}
                    </td>
                    <td className="cell-status">
                      <span className="status-dot" data-status={record.status} aria-hidden="true" />
                      {STATUS_LABELS[record.status]}
                    </td>
                    <td className="cell-amount col-collapsible">
                      {record.amountUsd == null ? '—' : formatMoney(record.amountUsd)}
                    </td>
                    <td className="cell-submitted">{formatListDate(record.submittedAt)}</td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        id={rowToggleId(record.id)}
                        className="btn btn-quiet btn-row-toggle"
                        aria-expanded={isSelected}
                        aria-controls={isSelected ? detailId : undefined}
                        aria-label={`Details for ${record.id}`}
                        onClick={() => selectRecord(isSelected ? null : record)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        label={`${caption} pagination`}
        onNavigate={setPage}
      />

      {selectedRecord !== null && (
        <section id={detailId} className="detail-panel" aria-labelledby={detailHeadingId}>
          <div className="detail-head">
            <h3 id={detailHeadingId} className="detail-title">
              Request detail <span className="detail-ref">{selectedRecord.id}</span>
            </h3>
            <button type="button" className="btn btn-quiet" onClick={closeDetail}>
              Close detail
            </button>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Subject</dt>
              <dd>{selectedRecord.subject}</dd>
            </div>
            <div>
              <dt>Requester</dt>
              <dd>{selectedRecord.requester}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{CATEGORY_LABELS[selectedRecord.category]}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{STATUS_LABELS[selectedRecord.status]}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{PRIORITY_LABELS[selectedRecord.priority]}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{formatDetailDate(selectedRecord.submittedAt)}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>
                {selectedRecord.amountUsd == null
                  ? '—'
                  : formatMoney(selectedRecord.amountUsd)}
              </dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{selectedRecord.notes ?? '—'}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  )
}
