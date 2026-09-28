import type {
  RequestPriority,
  RequestRecord,
  RequestStatus,
  SortDirection,
  SortKey,
} from '../types'

/** Text filter matches id, subject, or requester, case-insensitively. */
export function matchesText(record: RequestRecord, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (query.length === 0) return true
  return (
    record.id.toLowerCase().includes(query) ||
    record.subject.toLowerCase().includes(query) ||
    record.requester.toLowerCase().includes(query)
  )
}

export function filterRecords(
  records: RequestRecord[],
  text: string,
  status: RequestStatus | 'all',
): RequestRecord[] {
  return records.filter(
    (record) =>
      matchesText(record, text) && (status === 'all' || record.status === status),
  )
}

/** Rank maps give priority and status a deliberate, documented order. */
const PRIORITY_RANK: Record<RequestPriority, number> = {
  urgent: 0,
  high: 1,
  standard: 2,
  low: 3,
}

/** Workflow order: awaiting → in review → escalated → on hold. */
const STATUS_RANK: Record<RequestStatus, number> = {
  awaiting: 0,
  in_review: 1,
  escalated: 2,
  on_hold: 3,
}

const TEXT_COLLATOR: Intl.Collator = new Intl.Collator('en', {
  sensitivity: 'base',
})

export function compareRecords(
  a: RequestRecord,
  b: RequestRecord,
  key: SortKey,
  direction: SortDirection,
): number {
  if (key === 'amount') {
    // Records without an amount always sort last, in either direction.
    if (a.amountUsd == null && b.amountUsd == null) return 0
    if (a.amountUsd == null) return 1
    if (b.amountUsd == null) return -1
    const byAmount = (a.amountUsd as number) - (b.amountUsd as number)
    return direction === 'asc' ? byAmount : -byAmount
  }

  let result = 0
  switch (key) {
    case 'id':
      result = a.id.localeCompare(b.id)
      break
    case 'subject':
      result = TEXT_COLLATOR.compare(a.subject, b.subject)
      break
    case 'requester':
      result = TEXT_COLLATOR.compare(a.requester, b.requester)
      break
    case 'category':
      result = TEXT_COLLATOR.compare(a.category, b.category)
      break
    case 'priority':
      result = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      break
    case 'status':
      result = STATUS_RANK[a.status] - STATUS_RANK[b.status]
      break
    case 'submittedAt':
      // ISO-8601 timestamps sort correctly as strings.
      result = a.submittedAt.localeCompare(b.submittedAt)
      break
  }
  return direction === 'asc' ? result : -result
}

/** Stable, non-mutating sort (Array#sort is stable in modern engines). */
export function sortRecords(
  records: RequestRecord[],
  key: SortKey,
  direction: SortDirection,
): RequestRecord[] {
  return [...records].sort((a, b) => compareRecords(a, b, key, direction))
}

export function pageCount(totalItems: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

/**
 * Page list with windowing: all pages when few, otherwise
 * 1 … (current−1) current (current+1) … last.
 */
export function pageWindow(
  current: number,
  totalPages: number,
): Array<number | 'gap'> {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  if (totalPages <= 7) return pages

  const keep = new Set<number>([1, totalPages, current - 1, current, current + 1])
  const window: Array<number | 'gap'> = []
  let previous = 0
  for (const page of pages) {
    if (!keep.has(page)) continue
    if (page - previous > 1) window.push('gap')
    window.push(page)
    previous = page
  }
  return window
}
