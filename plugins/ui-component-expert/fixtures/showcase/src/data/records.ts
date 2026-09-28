import type { RequestRecord } from '../types'

/**
 * Deterministic synthetic records for the fixture.
 *
 * The data is fictional and anchored to late August–September 2026.
 * Deterministic test hooks (verified by the suite in `tests/`):
 *  - Exactly 30 records ⇒ 4 pages at the default `pageSize` of 8.
 *  - `submittedAt` ascends with the id, so the default queue sort
 *    (submitted, oldest first) keeps ids in order.
 *  - Requester "Maya Ellis" appears exactly 3× (REQ-1004, REQ-1014, REQ-1027)
 *    and no other requester or subject contains "maya".
 *  - Exactly 4 records are "on hold" and 6 are "escalated".
 *  - Exactly 3 requests are "urgent".
 */

const HOURS = [
  'T09:12:00Z', 'T14:37:00Z', 'T11:05:00Z', 'T16:44:00Z', 'T10:20:00Z',
  'T08:55:00Z', 'T13:30:00Z', 'T15:02:00Z', 'T09:41:00Z', 'T17:26:00Z',
  'T08:19:00Z', 'T12:58:00Z', 'T10:47:00Z', 'T14:12:00Z', 'T09:33:00Z',
  'T11:09:00Z', 'T16:50:00Z', 'T07:44:00Z', 'T15:27:00Z', 'T09:15:00Z',
  'T13:02:00Z', 'T08:40:00Z', 'T17:11:00Z', 'T10:36:00Z', 'T14:58:00Z',
  'T09:24:00Z', 'T16:03:00Z', 'T08:22:00Z', 'T11:47:00Z', 'T15:36:00Z',
]

export function createSyntheticRequests(): RequestRecord[] {
  return [
    { id: 'REQ-1001', subject: 'Guest access for the quarterly audit', requester: 'Priya Raman', category: 'access', status: 'awaiting', priority: 'low', submittedAt: `2026-08-03${HOURS[0]}` },
    { id: 'REQ-1002', subject: 'Refund a duplicated annual charge', requester: 'Tomás Rivera', category: 'payout', status: 'in_review', priority: 'high', submittedAt: `2026-08-04${HOURS[1]}`, amountUsd: 480 },
    { id: 'REQ-1003', subject: 'Press-kit artwork usage approval', requester: 'Ingrid Halvorsen', category: 'content', status: 'awaiting', priority: 'standard', submittedAt: `2026-08-06${HOURS[2]}` },
    { id: 'REQ-1004', subject: 'Data export for the Q2 board deck', requester: 'Maya Ellis', category: 'data_export', status: 'awaiting', priority: 'standard', submittedAt: `2026-08-07${HOURS[3]}`, amountUsd: 250 },
    { id: 'REQ-1005', subject: 'Contractor login for the staging site', requester: 'Dana Okafor', category: 'access', status: 'in_review', priority: 'standard', submittedAt: `2026-08-08${HOURS[4]}` },
    { id: 'REQ-1006', subject: 'Payout retry after a failed transfer', requester: 'Wei Zhang', category: 'payout', status: 'escalated', priority: 'high', submittedAt: `2026-08-10${HOURS[5]}`, amountUsd: 1250.5, notes: 'Second retry; the first transfer failed on the bank side.' },
    { id: 'REQ-1007', subject: 'Name change on a business account', requester: 'Aaron Whitfield', category: 'account', status: 'in_review', priority: 'low', submittedAt: `2026-08-11${HOURS[6]}` },
    { id: 'REQ-1008', subject: 'Export retention archive 2019–2021', requester: 'Lucia Ferreira', category: 'data_export', status: 'on_hold', priority: 'low', submittedAt: `2026-08-12${HOURS[7]}`, amountUsd: 90 },
    { id: 'REQ-1009', subject: 'Approve storefront banner swap', requester: 'Nina Petrov', category: 'content', status: 'in_review', priority: 'standard', submittedAt: `2026-08-14${HOURS[8]}` },
    { id: 'REQ-1010', subject: 'Expedite severance settlement', requester: 'Marcus Bell', category: 'payout', status: 'escalated', priority: 'urgent', submittedAt: `2026-08-15${HOURS[9]}`, amountUsd: 3400 },
    { id: 'REQ-1011', subject: 'Reviewer seat for the fraud team', requester: 'Sofia Marchetti', category: 'access', status: 'awaiting', priority: 'standard', submittedAt: `2026-08-17${HOURS[10]}` },
    { id: 'REQ-1012', subject: 'Third-party widget embed request', requester: 'Jonah Kim', category: 'content', status: 'awaiting', priority: 'low', submittedAt: `2026-08-18${HOURS[11]}` },
    { id: 'REQ-1013', subject: 'Bank detail update before next cycle', requester: 'Aisha Nasser', category: 'account', status: 'in_review', priority: 'high', submittedAt: `2026-08-20${HOURS[12]}` },
    { id: 'REQ-1014', subject: 'Bulk export of closed tickets', requester: 'Maya Ellis', category: 'data_export', status: 'awaiting', priority: 'standard', submittedAt: `2026-08-21${HOURS[13]}`, amountUsd: 90 },
    { id: 'REQ-1015', subject: 'Refund an overcharged invoice', requester: 'Elena Vasquez', category: 'payout', status: 'awaiting', priority: 'standard', submittedAt: `2026-08-22${HOURS[14]}`, amountUsd: 210.75 },
    { id: 'REQ-1016', subject: "Revoke a departed contractor's keys", requester: 'Dana Okafor', category: 'access', status: 'awaiting', priority: 'high', submittedAt: `2026-08-24${HOURS[15]}` },
    { id: 'REQ-1017', subject: 'Merch drop imagery licensing check', requester: 'Colton Reyes', category: 'content', status: 'escalated', priority: 'high', submittedAt: `2026-08-25${HOURS[16]}` },
    { id: 'REQ-1018', subject: 'Suspicious login on a payout account', requester: 'Wei Zhang', category: 'account', status: 'escalated', priority: 'urgent', submittedAt: `2026-08-27${HOURS[17]}`, notes: 'Two failed verifications from an unfamiliar region; freeze until confirmed.' },
    { id: 'REQ-1019', subject: 'Waitlisted payout release for review', requester: 'Priya Raman', category: 'payout', status: 'on_hold', priority: 'standard', submittedAt: `2026-08-28${HOURS[18]}`, amountUsd: 760 },
    { id: 'REQ-1020', subject: 'Grant read-only access to the ledger', requester: 'Tomás Rivera', category: 'access', status: 'in_review', priority: 'low', submittedAt: `2026-08-31${HOURS[19]}` },
    { id: 'REQ-1021', subject: 'Creative reuse of archived interviews', requester: 'Ingrid Halvorsen', category: 'content', status: 'on_hold', priority: 'low', submittedAt: `2026-09-01${HOURS[20]}` },
    { id: 'REQ-1022', subject: 'Urgent: payout stuck in review', requester: 'Marcus Bell', category: 'payout', status: 'escalated', priority: 'urgent', submittedAt: `2026-09-02${HOURS[21]}`, amountUsd: 890.25, notes: 'Requester has called twice today; payroll cutoff is Friday.' },
    { id: 'REQ-1023', subject: 'Export churn data for the ops review', requester: 'Sofia Marchetti', category: 'data_export', status: 'awaiting', priority: 'standard', submittedAt: `2026-09-03${HOURS[22]}` },
    { id: 'REQ-1024', subject: 'Account closure with residual balance', requester: 'Aisha Nasser', category: 'account', status: 'awaiting', priority: 'high', submittedAt: `2026-09-04${HOURS[23]}`, amountUsd: 42.1 },
    { id: 'REQ-1025', subject: 'Field-team access for the rural pilot', requester: 'Jonah Kim', category: 'access', status: 'awaiting', priority: 'standard', submittedAt: `2026-09-08${HOURS[24]}` },
    { id: 'REQ-1026', subject: 'Subtitle set for the launch trailer', requester: 'Nina Petrov', category: 'content', status: 'in_review', priority: 'standard', submittedAt: `2026-09-10${HOURS[25]}` },
    { id: 'REQ-1027', subject: 'Duplicate charge on a family plan', requester: 'Maya Ellis', category: 'payout', status: 'awaiting', priority: 'low', submittedAt: `2026-09-12${HOURS[26]}`, amountUsd: 29.99 },
    { id: 'REQ-1028', subject: 'Freeze payouts during a fraud check', requester: 'Elena Vasquez', category: 'payout', status: 'escalated', priority: 'high', submittedAt: `2026-09-15${HOURS[27]}`, amountUsd: 5400 },
    { id: 'REQ-1029', subject: 'Access for the external auditors', requester: 'Lucia Ferreira', category: 'access', status: 'on_hold', priority: 'standard', submittedAt: `2026-09-18${HOURS[28]}`, notes: 'On hold until the engagement letter is countersigned.' },
    { id: 'REQ-1030', subject: 'Export event logs for legal', requester: 'Aaron Whitfield', category: 'data_export', status: 'awaiting', priority: 'high', submittedAt: `2026-09-26${HOURS[29]}`, amountUsd: 310 },
  ]
}

/** Id for the next request created through the demo (first: REQ-1031). */
export function nextRequestId(sequence: number): string {
  return `REQ-${sequence}`
}

/** First id handed out by the demo's create flow. */
export const FIRST_CREATED_SEQUENCE = 1031
