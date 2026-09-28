import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'

import { RequestDialog, RequestForm, RequestQueue } from './index'
import type { RequestFormSubmitResult, RequestFormValues, RequestRecord } from './types'
import { StateHarness } from './components/harness/StateHarness'
import { createSyntheticRequests, FIRST_CREATED_SEQUENCE, nextRequestId } from './data/records'
import { sleep } from './timing'

function prefersDarkTheme(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Synthetic operations workspace: a review queue, a native-dialog create
 * flow, and a visible state harness covering every applicable control state.
 */
export default function App(): ReactElement {
  const [records, setRecords] = useState<RequestRecord[]>(() => createSyntheticRequests())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (prefersDarkTheme() ? 'dark' : 'light'))
  const [announcement, setAnnouncement] = useState('')
  const sequence = useRef(FIRST_CREATED_SEQUENCE)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const escalated = useMemo(
    () => records.filter((record) => record.status === 'escalated').length,
    [records],
  )
  const urgent = useMemo(
    () => records.filter((record) => record.priority === 'urgent').length,
    [records],
  )

  async function handleCreate(values: RequestFormValues): Promise<RequestFormSubmitResult> {
    if (values.category === '') {
      // Unreachable after RequestForm's validation; kept explicit for type safety.
      throw new Error('A category is required before a request can be created.')
    }
    await sleep(250)
    const id = nextRequestId(sequence.current)
    sequence.current += 1
    const record: RequestRecord = {
      id,
      subject: values.subject,
      requester: values.requester,
      category: values.category,
      status: 'awaiting',
      priority: values.priority,
      submittedAt: new Date().toISOString(),
      notes: values.notes.trim() === '' ? undefined : values.notes,
    }
    setRecords((current) => [record, ...current])
    setSelectedId(id)
    setCreateOpen(false)
    setAnnouncement(`Request ${id} created and added to the queue.`)
    return { status: 'created', id }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="page">
        <header className="masthead workspace">
          <div>
            <h1 className="masthead-title">Review queue</h1>
            <p className="masthead-sub">Operations workspace · request adjudication</p>
          </div>
          <div className="masthead-actions">
            <button
              type="button"
              className="btn btn-quiet"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              Dark theme
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCreateOpen(true)
              }}
            >
              Create request
            </button>
          </div>
        </header>

        <main id="main-content" className="workspace">
          <p className="stat-line">
            <span>
              In queue<strong>{records.length}</strong>
            </span>
            <span>
              Escalated<strong>{escalated}</strong>
            </span>
            <span>
              Urgent<strong>{urgent}</strong>
            </span>
          </p>
          <p className="app-announcement" role="status">
            {announcement}
          </p>

          <section className="section" aria-labelledby="queue-section-title">
            <h2 id="queue-section-title" className="section-kicker">
              Requests
            </h2>
            <p className="section-intro">
              Every request submitted for review, oldest first. Filter or sort the
              table, open a request’s details, or create a new request from the
              button above.
            </p>
            <RequestQueue
              records={records}
              caption="Requests awaiting adjudication"
              selectedId={selectedId}
              onSelect={(record) => setSelectedId(record === null ? null : record.id)}
            />
          </section>

          <section className="section" aria-labelledby="harness-section-title">
            <h2 id="harness-section-title" className="section-kicker">
              State harness
            </h2>
            <p className="section-intro">
              Every control state, live: samples below reuse the exact markup and
              classes of the working components. Hover, focus, and active are
              transient pointer and keyboard states — each is mirrored
              statically through the data-force attributes, which share the same
              declarations as the real pseudo-class rules. States that do not
              apply are marked N/A with the reason.
            </p>
            <StateHarness records={records.slice(0, 5)} />
          </section>

          <footer className="page-foot">
            Synthetic fixture · all data is fictional and anchored to 2026 ·
            native dialog semantics · no external assets.
          </footer>
        </main>

        <RequestDialog
          open={createOpen}
          title="New review request"
          idPrefix="create-request-dialog"
          onClose={() => {
            setCreateOpen(false)
          }}
        >
          <RequestForm
            idPrefix="create-request-form"
            submitLabel="Create request"
            cancelLabel="Cancel"
            onSubmit={handleCreate}
            onCancel={() => {
              setCreateOpen(false)
            }}
          />
        </RequestDialog>
      </div>
    </>
  )
}
