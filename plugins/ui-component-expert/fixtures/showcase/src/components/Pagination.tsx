import type { ReactElement } from 'react'

import { pageWindow } from './queue-utils'

interface PaginationProps {
  /** 1-based current page. */
  page: number
  totalPages: number
  /** Accessible name for the nav landmark, e.g. "Requests pagination". */
  label: string
  onNavigate: (page: number) => void
}

/**
 * Internal pagination control used by RequestQueue. Prev/Next disable at
 * the boundaries (the only legitimate disabled state here), and the current
 * page carries `aria-current="page"`.
 */
export function Pagination({
  page,
  totalPages,
  label,
  onNavigate,
}: PaginationProps): ReactElement {
  const pages = pageWindow(page, totalPages)
  return (
    <nav className="pagination" aria-label={label}>
      <button
        type="button"
        className="btn btn-quiet btn-page"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onNavigate(page - 1)}
      >
        Prev
      </button>
      {pages.map((entry, index) =>
        typeof entry === 'number' ? (
          <button
            key={entry}
            type="button"
            className="btn btn-quiet btn-page"
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => onNavigate(entry)}
          >
            {entry}
          </button>
        ) : (
          <span key={`gap-${index}`} className="page-gap" aria-hidden="true">
            …
          </span>
        ),
      )}
      <button
        type="button"
        className="btn btn-quiet btn-page"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onNavigate(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
