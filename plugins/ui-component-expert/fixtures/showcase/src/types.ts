/**
 * Public domain types for the review-queue fixture.
 *
 * Everything a consumer integrates with is defined here or re-exported
 * from `src/index.ts`. No component leaks `any` or untyped records.
 */

/** Review workflow position of a request. */
export type RequestStatus = 'awaiting' | 'in_review' | 'escalated' | 'on_hold'

/** Adjudication urgency. */
export type RequestPriority = 'low' | 'standard' | 'high' | 'urgent'

/** Team that reviews the request. */
export type RequestCategory =
  | 'payout'
  | 'access'
  | 'content'
  | 'data_export'
  | 'account'

/** One structured queue record. */
export interface RequestRecord {
  /** Human-readable reference, e.g. "REQ-2041". Unique within a queue. */
  id: string
  /** What the requester wants adjudicated. */
  subject: string
  /** Full name of the person who submitted the request. */
  requester: string
  category: RequestCategory
  status: RequestStatus
  priority: RequestPriority
  /** ISO-8601 submission timestamp, e.g. "2026-09-14T09:12:00Z". */
  submittedAt: string
  /** Optional monetary exposure; absent for non-financial requests. */
  amountUsd?: number
  /** Optional free-form context from the requester. */
  notes?: string
}

/** Columns the queue can sort by. */
export type SortKey =
  | 'id'
  | 'subject'
  | 'requester'
  | 'category'
  | 'priority'
  | 'status'
  | 'amount'
  | 'submittedAt'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  direction: SortDirection
}

/** Values the create-request form produces. `category` is empty until chosen. */
export interface RequestFormValues {
  subject: string
  requester: string
  category: RequestCategory | ''
  priority: RequestPriority
  notes: string
}

/**
 * What the injected async `onSubmit` resolves with.
 * Rejections are also handled and surfaced as a failed outcome.
 */
export type RequestFormSubmitResult =
  | { status: 'created'; id: string }
  | { status: 'failed'; message?: string }
