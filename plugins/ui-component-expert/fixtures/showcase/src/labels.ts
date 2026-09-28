import type { RequestCategory, RequestPriority, RequestStatus } from './types'

/** Display labels for the closed domain unions. Sentence case throughout. */
export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  payout: 'Payout',
  access: 'Access',
  content: 'Content',
  data_export: 'Data export',
  account: 'Account',
}

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Low',
  standard: 'Standard',
  high: 'High',
  urgent: 'Urgent',
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  awaiting: 'Awaiting review',
  in_review: 'In review',
  escalated: 'Escalated',
  on_hold: 'On hold',
}

export interface LabeledOption<T extends string> {
  value: T
  label: string
}

export const CATEGORY_OPTIONS: LabeledOption<RequestCategory>[] = (
  Object.keys(CATEGORY_LABELS) as RequestCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }))

export const PRIORITY_OPTIONS: LabeledOption<RequestPriority>[] = (
  Object.keys(PRIORITY_LABELS) as RequestPriority[]
).map((value) => ({ value, label: PRIORITY_LABELS[value] }))

export const STATUS_OPTIONS: LabeledOption<RequestStatus>[] = (
  Object.keys(STATUS_LABELS) as RequestStatus[]
).map((value) => ({ value, label: STATUS_LABELS[value] }))
