import { useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { RequestDialog, RequestForm, RequestQueue } from '../../index'
import type {
  RequestFormSubmitResult,
  RequestFormValues,
  RequestRecord,
  SortKey,
  SortState,
} from '../../types'
import { CATEGORY_OPTIONS, STATUS_LABELS } from '../../labels'
import { nextRequestId } from '../../data/records'
import { formatListDate } from '../../format'
import { sleep } from '../../timing'
import { Pagination } from '../Pagination'
import { sortRecords } from '../queue-utils'

export interface StateHarnessProps {
  /** Small record slice for the live mini queues. */
  records: RequestRecord[]
}

/**
 * Mirrors the public RequestForm's subject rule so the harness shows the
 * identical markup, classes, and behavior it demonstrates.
 */
function FieldSample({
  id,
  label,
  initial = '',
  initialError,
}: {
  id: string
  label: string
  initial?: string
  initialError?: string
}): ReactElement {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | undefined>(initialError)

  function validate(next: string): string | undefined {
    const trimmed = next.trim()
    if (trimmed.length === 0) return 'Enter a subject for the request.'
    if (trimmed.length < 8 || trimmed.length > 120) {
      return 'Use 8–120 characters for the subject.'
    }
    return undefined
  }

  return (
    <div className="field sample-field">
      <label htmlFor={id}>{label}</label>
      <p className="field-hint" id={`${id}-hint`}>
        8–120 characters. State the requested action.
      </p>
      <input
        id={id}
        type="text"
        className="control"
        value={value}
        aria-describedby={error !== undefined ? `${id}-hint ${id}-error` : `${id}-hint`}
        aria-invalid={error !== undefined ? true : undefined}
        onChange={(event) => {
          const next = event.target.value
          setValue(next)
          if (error !== undefined) setError(validate(next))
        }}
        onBlur={() => setError(validate(value))}
      />
      {error !== undefined && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

function SelectSample({
  id,
  label,
  initialError,
  disabled,
}: {
  id: string
  label: string
  initialError?: string
  disabled?: boolean
}): ReactElement {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | undefined>(initialError)

  return (
    <div className="field sample-field">
      <label htmlFor={id}>{label}</label>
      <p className="field-hint" id={`${id}-hint`}>
        Determines which team reviews the request.
      </p>
      <select
        id={id}
        className="control"
        value={value}
        disabled={disabled}
        aria-describedby={error !== undefined ? `${id}-hint ${id}-error` : `${id}-hint`}
        aria-invalid={error !== undefined ? true : undefined}
        onChange={(event) => {
          const next = event.target.value
          setValue(next)
          setError(next === '' ? 'Choose a category.' : undefined)
        }}
      >
        <option value="">Select a category…</option>
        {CATEGORY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error !== undefined && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

interface HarnessRow {
  state: string
  na?: boolean
  sample?: ReactNode
  note: string
}

interface HarnessGroup {
  component: string
  rows: HarnessRow[]
}

type PlaygroundMode = 'succeeds' | 'fails' | 'slow'

/**
 * Two-row sample data with a different order under each sortable column, so
 * the sample below demonstrates real reordering: id ascending starts with
 * REQ-9101, submitted ascending and status ascending start with REQ-9102.
 */
const SORT_SAMPLE_ROWS: RequestRecord[] = [
  {
    id: 'REQ-9101',
    subject: 'Refund an overcharged invoice',
    requester: 'Elena Vasquez',
    category: 'payout',
    status: 'in_review',
    priority: 'standard',
    submittedAt: '2026-09-03T15:00:00Z',
  },
  {
    id: 'REQ-9102',
    subject: 'Guest access for the quarterly audit',
    requester: 'Priya Raman',
    category: 'access',
    status: 'awaiting',
    priority: 'standard',
    submittedAt: '2026-08-12T09:00:00Z',
  },
]

export function StateHarness({ records }: StateHarnessProps): ReactElement {
  const [lastActivated, setLastActivated] = useState('nothing yet')
  const [samplePageA, setSamplePageA] = useState(2)
  const [samplePageB, setSamplePageB] = useState(4)
  const [sampleSort, setSampleSort] = useState<SortState>({ key: 'submittedAt', direction: 'asc' })
  const [miniSelectedId, setMiniSelectedId] = useState<string | null>('REQ-1003')
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false)
  const [playgroundMode, setPlaygroundMode] = useState<PlaygroundMode>('succeeds')
  const playgroundSequence = useRef(9200)

  /** One sort at a time: clicking the active column toggles, a new column starts ascending. */
  function setSampleSortKey(key: SortKey): void {
    setSampleSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  function sampleSortAttribute(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (sampleSort.key !== key) return 'none'
    return sampleSort.direction === 'asc' ? 'ascending' : 'descending'
  }

  async function playgroundSubmit(
    _values: RequestFormValues,
  ): Promise<RequestFormSubmitResult> {
    if (playgroundMode === 'fails') {
      await sleep(400)
      return { status: 'failed', message: 'The review service timed out (simulated failure).' }
    }
    await sleep(playgroundMode === 'slow' ? 4000 : 400)
    playgroundSequence.current += 1
    return { status: 'created', id: nextRequestId(playgroundSequence.current) }
  }

  const sortSampleRows = sortRecords(SORT_SAMPLE_ROWS, sampleSort.key, sampleSort.direction)
  const sortSample = (
    <table className="queue-table harness-sample-table">
      <caption>Sort header samples — one active sort, rows reorder</caption>
      <thead>
        <tr>
          <th scope="col" aria-sort={sampleSortAttribute('id')}>
            <button type="button" className="th-sort" onClick={() => setSampleSortKey('id')}>
              Request
            </button>
          </th>
          <th scope="col" aria-sort={sampleSortAttribute('submittedAt')}>
            <button
              type="button"
              className="th-sort"
              onClick={() => setSampleSortKey('submittedAt')}
            >
              Submitted
            </button>
          </th>
          <th scope="col" aria-sort={sampleSortAttribute('status')}>
            <button type="button" className="th-sort" onClick={() => setSampleSortKey('status')}>
              Status
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortSampleRows.map((record) => (
          <tr key={record.id}>
            <td className="cell-id">{record.id}</td>
            <td className="cell-submitted">{formatListDate(record.submittedAt)}</td>
            <td className="cell-status">
              <span className="status-dot" data-status={record.status} aria-hidden="true" />
              {STATUS_LABELS[record.status]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const groups: HarnessGroup[] = [
    {
      component: 'Button',
      rows: [
        {
          state: 'default',
          sample: (
            <div className="samples">
              <button
                type="button"
                className="btn btn-primary"
                aria-label="Create request (default sample)"
                onClick={() => setLastActivated('primary button, default state')}
              >
                Create request
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                aria-label="Cancel (default sample)"
                onClick={() => setLastActivated('quiet button, default state')}
              >
                Cancel
              </button>
            </div>
          ),
          note: 'One filled action per view (Create request); peers stay outlined.',
        },
        {
          state: 'hover',
          sample: (
            <div className="samples">
              <button
                type="button"
                className="btn btn-primary"
                data-force="hover"
                aria-label="Create request (hover sample)"
                onClick={() => setLastActivated('primary button, hover styling')}
              >
                Create request
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                data-force="hover"
                aria-label="Cancel (hover sample)"
                onClick={() => setLastActivated('quiet button, hover styling')}
              >
                Cancel
              </button>
            </div>
          ),
          note: 'Mirrored from the same declaration block as the :hover rule; renders on hover-capable pointers.',
        },
        {
          state: 'active',
          sample: (
            <div className="samples">
              <button
                type="button"
                className="btn btn-primary"
                data-force="active"
                aria-label="Create request (active sample)"
                onClick={() => setLastActivated('primary button, active styling')}
              >
                Create request
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                data-force="active"
                aria-label="Cancel (active sample)"
                onClick={() => setLastActivated('quiet button, active styling')}
              >
                Cancel
              </button>
            </div>
          ),
          note: 'Press feedback: a 0.96 scale on transform plus a deeper fill, instant on press.',
        },
        {
          state: 'focus',
          sample: (
            <div className="samples">
              <button
                type="button"
                className="btn btn-primary"
                data-force="focus"
                aria-label="Create request (focus sample)"
                onClick={() => setLastActivated('primary button, focus styling')}
              >
                Create request
              </button>
            </div>
          ),
          note: 'Same 2px ring as the global :focus-visible rule; tab any live control to see it.',
        },
        {
          state: 'disabled',
          sample: (
            <div className="samples">
              <button
                type="button"
                className="btn btn-primary"
                disabled
                aria-label="Create request (disabled sample)"
                onClick={() => setLastActivated('primary button, disabled')}
              >
                Create request
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                disabled
                aria-label="Cancel (disabled sample)"
                onClick={() => setLastActivated('quiet button, disabled')}
              >
                Cancel
              </button>
            </div>
          ),
          note: 'Native disabled blocks pointer and keyboard activation; the label never changes meaning.',
        },
        {
          state: 'loading',
          sample: (
            <button
              type="button"
              className="btn btn-primary"
              data-pending="true"
              disabled
              aria-busy="true"
              aria-label="Create request (loading sample)"
              onClick={() => setLastActivated('pending button (unreachable — disabled)')}
            >
              <span className="spinner" aria-hidden="true" />
              <span>Create request</span>
            </button>
          ),
          note: 'Pending submit: spinner, aria-busy, native disabled, and the original label kept.',
        },
        {
          state: 'success',
          na: true,
          note: 'Buttons carry no success semantics; creation success renders in the form status region (role=status).',
        },
        {
          state: 'error',
          na: true,
          note: 'Errors are field-level or submission-level, never button-level.',
        },
        {
          state: 'selected',
          na: true,
          note: 'No toggle buttons in this surface; the pagination current page carries aria-current (see pagination).',
        },
        {
          state: 'expanded',
          na: true,
          note: 'These buttons trigger actions; the queue’s Details button owns aria-expanded.',
        },
      ],
    },
    {
      component: 'Field',
      rows: [
        {
          state: 'default',
          sample: (
            <div className="samples">
              <FieldSample id="harness-field-default" label="Subject" />
              <SelectSample id="harness-select-default" label="Category" />
            </div>
          ),
          note: 'Labels and hints sit above the control; the hint participates through aria-describedby.',
        },
        {
          state: 'hover',
          sample: (
            <div className="field sample-field">
              <label htmlFor="harness-field-hover">Subject</label>
              <p className="field-hint" id="harness-field-hover-hint">
                8–120 characters. State the requested action.
              </p>
              <input
                id="harness-field-hover"
                type="text"
                className="control"
                data-force="hover"
                defaultValue="Duplicate payout retry"
                aria-describedby="harness-field-hover-hint"
              />
            </div>
          ),
          note: 'Border darkens on hover; the fill never changes, so the field never looks disabled.',
        },
        {
          state: 'focus',
          sample: (
            <div className="field sample-field">
              <label htmlFor="harness-field-focus">Subject</label>
              <p className="field-hint" id="harness-field-focus-hint">
                8–120 characters. State the requested action.
              </p>
              <input
                id="harness-field-focus"
                type="text"
                className="control"
                data-force="focus"
                defaultValue="Duplicate payout retry"
                aria-describedby="harness-field-focus-hint"
              />
            </div>
          ),
          note: 'The ring is the only focus treatment — mirroring the global :focus-visible rule.',
        },
        {
          state: 'error',
          sample: (
            <div className="samples">
              <FieldSample
                id="harness-field-error"
                label="Subject"
                initial="Short"
                initialError="Use 8–120 characters for the subject."
              />
              <SelectSample id="harness-select-error" label="Category" initialError="Choose a category." />
            </div>
          ),
          note: 'aria-invalid only while invalid; the message names the fix; correcting clears it. Blur and submit validate; hints never disappear.',
        },
        {
          state: 'disabled',
          sample: (
            <div className="samples">
              <div className="field sample-field">
                <label htmlFor="harness-field-disabled">Subject</label>
                <p className="field-hint" id="harness-field-disabled-hint">
                  8–120 characters. State the requested action.
                </p>
                <input
                  id="harness-field-disabled"
                  type="text"
                  className="control"
                  disabled
                  defaultValue="Frozen while the audit runs"
                  aria-describedby="harness-field-disabled-hint"
                />
              </div>
              <SelectSample id="harness-select-disabled" label="Category" disabled />
            </div>
          ),
          note: 'Native disabled styling; labels and hints stay readable.',
        },
        {
          state: 'active',
          na: true,
          note: 'Text fields have no pressed state; typing is the interaction.',
        },
        {
          state: 'loading',
          na: true,
          note: 'Values are local state; there is no per-field async path.',
        },
        {
          state: 'success',
          na: true,
          note: 'Validity is shown by the error clearing; no separate success skin.',
        },
        {
          state: 'selected',
          na: true,
          note: 'No selection semantics on single-line fields.',
        },
        {
          state: 'expanded',
          na: true,
          note: 'No disclosure semantics on fields.',
        },
      ],
    },
    {
      component: 'Sort header',
      rows: [
        {
          state: 'default',
          sample: sortSample,
          note: 'One sort at a time, exactly like the live queue above: the active column carries aria-sort ascending or descending, every other header reports “none”, and the rows reorder.',
        },
        {
          state: 'ascending',
          note: 'Submitted starts ascending — the August row moves first. Clicking another header moves the sort there and resets this one to “none”.',
        },
        {
          state: 'descending',
          note: 'Clicking the active header toggles to descending and flips the row order.',
        },
        {
          state: 'all other states',
          na: true,
          note: 'Sort headers are plain buttons: hover, active, and focus render like the button rows; no loading, disabled, error, success, selected, or expanded semantics.',
        },
      ],
    },
    {
      component: 'Pagination',
      rows: [
        {
          state: 'default',
          sample: (
            <div className="samples">
              <Pagination
                page={samplePageA}
                totalPages={4}
                label="Harness pagination, mid-range"
                onNavigate={setSamplePageA}
              />
            </div>
          ),
          note: 'Prev and Next enable inside the bounds; numbers jump directly.',
        },
        {
          state: 'selected',
          note: 'The current page carries aria-current="page" — an accent underline plus weight.',
        },
        {
          state: 'disabled',
          sample: (
            <div className="samples">
              <Pagination
                page={samplePageB}
                totalPages={4}
                label="Harness pagination, last page"
                onNavigate={setSamplePageB}
              />
            </div>
          ),
          note: 'Next disables on the last page; Prev disables on page 1. The only legitimate disabled states here.',
        },
        {
          state: 'hover / active / focus',
          note: 'Pagination buttons share the .btn rules — see the button rows for the mirrored and live renderings.',
        },
        {
          state: 'loading / error / success / expanded',
          na: true,
          note: 'Navigation is synchronous local state; nothing loads, fails, or expands.',
        },
      ],
    },
    {
      component: 'Queue table',
      rows: [
        {
          state: 'default',
          note: 'First live queue below: five requests, four per page, filters and sort active.',
        },
        {
          state: 'hover',
          note: 'Hover any row of the live queues, or read the mirrored row sample below them.',
        },
        {
          state: 'selected',
          note: 'REQ-1003 is selected in the live queue: aria-current row wash plus an accent inset bar.',
        },
        {
          state: 'expanded',
          note: 'Its Details button reports aria-expanded="true" and the detail panel is open; Close detail returns focus to the row toggle.',
        },
        {
          state: 'empty',
          note: 'Third live queue: says what the place is and offers one recovery action.',
        },
        {
          state: 'no results',
          note: 'Second live queue: the dead filter is visible in the control and the recovery button clears it.',
        },
        {
          state: 'loading',
          na: true,
          note: 'Records arrive as synchronous props; this fixture has no queue fetch path to load.',
        },
        {
          state: 'error',
          na: true,
          note: 'No queue-level error exists for the same reason; submission failures render in the form.',
        },
        {
          state: 'success',
          na: true,
          note: 'Creation success is announced by the page status region, not by the table.',
        },
        {
          state: 'disabled',
          na: true,
          note: 'Filter controls stay operable; only pagination disables at its bounds.',
        },
      ],
    },
    {
      component: 'Form',
      rows: [
        {
          state: 'default',
          note: 'Playground below: labels above controls, hints wired with aria-describedby, submit always enabled.',
        },
        {
          state: 'loading',
          note: 'Choose “Slow” and submit: spinner, aria-busy, native disabled, original label, focus kept.',
        },
        {
          state: 'error',
          note: 'Choose “Fails”: role=alert names the failure, every value is retained, and Retry submission resends.',
        },
        {
          state: 'success',
          note: 'On success: role=status notice with the created reference; fields reset for the next entry.',
        },
        {
          state: 'disabled',
          na: true,
          note: 'By design the submit button is never disabled for invalid values — only while a submission is in flight.',
        },
        {
          state: 'hover / active / focus',
          note: 'Its buttons and fields render transient states identically to the button and field rows above.',
        },
        {
          state: 'selected / expanded',
          na: true,
          note: 'Forms have no selection or disclosure semantics.',
        },
      ],
    },
    {
      component: 'Dialog',
      rows: [
        {
          state: 'default (closed)',
          note: 'The queue’s Create request button and the opener below show the closed state; the element is display:none until opened.',
        },
        {
          state: 'open',
          note: 'Open the sample below: showModal() renders it in the top layer over the scrim.',
        },
        {
          state: 'cancel',
          note: 'Escape reports “cancel”; the Cancel button reports “close”. Both restore focus to the opener.',
        },
        {
          state: 'focus',
          note: 'Opens on the first control; background inertness and focus containment are native showModal behavior, not custom traps.',
        },
        {
          state: 'hover / active',
          note: 'Its controls render transient states identically to the button rows.',
        },
        {
          state: 'other states',
          na: true,
          note: 'The dialog is a container: disabled, loading, error, success, selected, and expanded belong to its content (the form).',
        },
      ],
    },
  ]

  return (
    <div className="harness">
      <div
        className="harness-scroll"
        role="region"
        aria-label="State harness table, scrolls horizontally on narrow screens"
        tabIndex={0}
      >
        <table className="harness-table">
          <caption>Component state coverage — live samples and justified exclusions</caption>
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col">State</th>
              <th scope="col">Sample</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.rows.map((row, index) => (
                <tr key={`${group.component}-${row.state}`}>
                  {index === 0 && (
                    <th scope="row" rowSpan={group.rows.length} className="harness-component">
                      {group.component}
                    </th>
                  )}
                  <td className="harness-state">
                    {row.na === true ? (
                      <>
                        <span className="harness-na">N/A · </span>
                        {row.state}
                      </>
                    ) : (
                      row.state
                    )}
                  </td>
                  <td>{row.sample ?? <span className="harness-na">—</span>}</td>
                  <td className="harness-note">{row.note}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <p className="harness-status" role="status">
        {`Last activated sample: ${lastActivated}`}
      </p>

      <div className="harness-group">
        <h3 className="harness-group-title">Live queue samples</h3>
        <div className="harness-queue">
          <RequestQueue
            records={records}
            pageSize={4}
            caption="Live queue — default, selected, expanded"
            selectedId={miniSelectedId}
            onSelect={(record) => setMiniSelectedId(record === null ? null : record.id)}
            idPrefix="harness-queue-a"
          />
        </div>
        <div className="harness-queue">
          <RequestQueue
            records={records}
            pageSize={4}
            caption="Live queue — no results, with recovery"
            initialFilterText="zzz-none"
            idPrefix="harness-queue-b"
          />
        </div>
        <div className="harness-queue">
          <RequestQueue
            records={[]}
            caption="Live queue — empty"
            emptyActionLabel="Create the first request"
            onEmptyAction={() => setSampleDialogOpen(true)}
            idPrefix="harness-queue-c"
          />
        </div>
        <table className="queue-table harness-sample-table">
          <caption>Row state samples — hover mirrored, selected live</caption>
          <thead>
            <tr>
              <th scope="col">Request</th>
              <th scope="col">Subject</th>
            </tr>
          </thead>
          <tbody>
            <tr data-force="hover">
              <td className="cell-id">REQ-9103</td>
              <td className="cell-subject">Row hover (mirrored)</td>
            </tr>
            <tr aria-current="true">
              <td className="cell-id">REQ-9104</td>
              <td className="cell-subject">Selected row (aria-current)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="harness-group">
        <h3 className="harness-group-title">Request form playground</h3>
        <p className="harness-lead">
          Choose what the injected onSubmit does, then submit. Failed
          submissions keep every value; Retry submission resends them.
        </p>
        <div className="playground">
          <div className="playground-controls">
            <div className="field">
              <label htmlFor="harness-outcome">Submit outcome</label>
              <p className="field-hint" id="harness-outcome-hint">
                What the injected onSubmit does on the next submission.
              </p>
              <select
                id="harness-outcome"
                className="control"
                value={playgroundMode}
                aria-describedby="harness-outcome-hint"
                onChange={(event) => setPlaygroundMode(event.target.value as PlaygroundMode)}
              >
                <option value="succeeds">Succeeds (≈0.4s)</option>
                <option value="fails">Fails with a service error</option>
                <option value="slow">Slow — pending ≈4s, then created</option>
              </select>
            </div>
          </div>
          <RequestForm
            idPrefix="harness-playground-form"
            submitLabel="Submit request"
            onSubmit={playgroundSubmit}
          />
        </div>
      </div>

      <div className="harness-group">
        <h3 className="harness-group-title">Dialog sample</h3>
        <p className="harness-lead">
          A native dialog element shown with showModal(): the rest of the page
          turns inert, focus stays inside, Escape cancels, and focus returns to
          the opener.
        </p>
        <div className="samples">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setSampleDialogOpen(true)}
          >
            Open sample dialog
          </button>
        </div>
        <RequestDialog
          open={sampleDialogOpen}
          title="Sample dialog"
          idPrefix="harness-sample-dialog"
          onClose={() => setSampleDialogOpen(false)}
        >
          <p className="dialog-sample-copy">
            This dialog is a native <code>dialog</code> element.
            <code>showModal()</code> makes the rest of the page inert and
            contains focus; Escape fires cancel and closes it; the close listener
            returns focus to the opener.
          </p>
          <div className="samples">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSampleDialogOpen(false)}
            >
              Close sample
            </button>
          </div>
        </RequestDialog>
      </div>

      <dl className="cross-cutting">
        <div>
          <dt>Light and dark</dt>
          <dd>
            Toggle “Dark theme” in the masthead; semantic tokens swap through one
            mechanism, [data-theme] on the root element. The system preference
            picks the initial mode.
          </dd>
        </div>
        <div>
          <dt>Responsive 320–1440</dt>
          <dd>
            Below 768px the table hides requester, category, and amount (the
            detail panel keeps them) and scrolls inside its labelled region.
            Authored for 320, 390, 768, and 1440 — not visually verified in this
            environment.
          </dd>
        </div>
        <div>
          <dt>Motion</dt>
          <dd>
            All animation sits inside prefers-reduced-motion: no-preference and
            animates transform and opacity only; the spinner degrades to a
            static ring under reduced motion.
          </dd>
        </div>
        <div>
          <dt>Touch and focus</dt>
          <dd>
            Controls are 44px tall minimum; a 2px focus-visible ring paints on
            every focusable element.
          </dd>
        </div>
        <div>
          <dt>Forced colors</dt>
          <dd>
            Button and dialog borders and disabled states survive
            forced-colors mode through the base layer.
          </dd>
        </div>
      </dl>
    </div>
  )
}
