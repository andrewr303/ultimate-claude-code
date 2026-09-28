import { useId, useRef, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'

import type { RequestFormSubmitResult, RequestFormValues, RequestPriority } from '../types'
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '../labels'

export interface RequestFormProps {
  /** Unique prefix for composed element ids. Generated when omitted. */
  idPrefix?: string
  /** Default "Submit request". Verb-first, names the action. */
  submitLabel?: string
  /** Default "Cancel". Rendered only when onCancel is provided. */
  cancelLabel?: string
  /**
   * Injected async submission. Resolve with `{ status: 'created', id }` on
   * success or `{ status: 'failed', message? }` on failure; rejections are
   * caught and surfaced the same way. Values are retained on failure so
   * "Retry submission" resubmits exactly what was entered.
   */
  onSubmit: (values: RequestFormValues) => Promise<RequestFormSubmitResult>
  /** Fires once with the created id and the submitted values. */
  onSuccess?: (result: { id: string; values: RequestFormValues }) => void
  /** Optional cancel path; the dialog wires this to close. */
  onCancel?: () => void
}

type FieldKey = 'subject' | 'requester' | 'category' | 'notes'

/** Focus order for the first invalid field after a submit attempt. */
const FIELD_ORDER: readonly FieldKey[] = ['subject', 'requester', 'category', 'notes']

const SUBJECT_MIN = 8
const SUBJECT_MAX = 120
const REQUESTER_MIN = 2
const REQUESTER_MAX = 60
const NOTES_MAX = 500

const DEFAULT_VALUES: RequestFormValues = {
  subject: '',
  requester: '',
  category: '',
  priority: 'standard',
  notes: '',
}

const DEFAULT_FAILURE =
  'The review service did not accept the request. Check the values and try again.'

type SubmitOutcome =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'failed'; message: string }
  | { kind: 'created'; id: string }

type FieldErrors = Partial<Record<FieldKey, string>>

/** Errors are instructions: each says how to fix the field. */
function validateField(field: FieldKey, values: RequestFormValues): string | undefined {
  switch (field) {
    case 'subject': {
      const value = values.subject.trim()
      if (value.length === 0) return 'Enter a subject for the request.'
      if (value.length < SUBJECT_MIN || value.length > SUBJECT_MAX) {
        return `Use ${SUBJECT_MIN}–${SUBJECT_MAX} characters for the subject.`
      }
      return undefined
    }
    case 'requester': {
      const value = values.requester.trim()
      if (value.length === 0) return "Enter the requester's name."
      if (value.length < REQUESTER_MIN || value.length > REQUESTER_MAX) {
        return `Use ${REQUESTER_MIN}–${REQUESTER_MAX} characters for the name.`
      }
      return undefined
    }
    case 'category':
      return values.category === '' ? 'Choose a category.' : undefined
    case 'notes': {
      const value = values.notes.trim()
      return value.length > NOTES_MAX
        ? `Shorten the notes to ${NOTES_MAX} characters or fewer.`
        : undefined
    }
  }
}

export function RequestForm({
  idPrefix,
  submitLabel = 'Submit request',
  cancelLabel = 'Cancel',
  onSubmit,
  onSuccess,
  onCancel,
}: RequestFormProps): ReactElement {
  const autoPrefix = useId()
  const prefix = idPrefix ?? autoPrefix

  const [values, setValues] = useState<RequestFormValues>(DEFAULT_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [outcome, setOutcome] = useState<SubmitOutcome>({ kind: 'idle' })

  const subjectRef = useRef<HTMLInputElement>(null)
  const requesterRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  function change(field: FieldKey, value: string): void {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)
    // Correction clears an existing error immediately; untouched fields stay
    // silent until blur or submit.
    setErrors((current) =>
      current[field] === undefined ? current : { ...current, [field]: validateField(field, nextValues) },
    )
  }

  function blur(field: FieldKey): void {
    setErrors((current) => ({ ...current, [field]: validateField(field, values) }))
  }

  function describedBy(field: FieldKey): string {
    const hintId = `${prefix}-${field}-hint`
    const errorId = `${prefix}-${field}-error`
    return errors[field] !== undefined ? `${hintId} ${errorId}` : hintId
  }

  async function submit(): Promise<void> {
    setOutcome({ kind: 'submitting' })
    try {
      const result = await onSubmit(values)
      if (result.status === 'created') {
        setOutcome({ kind: 'created', id: result.id })
        setValues(DEFAULT_VALUES)
        setErrors({})
        onSuccess?.({ id: result.id, values })
      } else {
        setOutcome({ kind: 'failed', message: result.message ?? DEFAULT_FAILURE })
      }
    } catch (error) {
      setOutcome({
        kind: 'failed',
        message:
          error instanceof Error && error.message.length > 0
            ? error.message
            : DEFAULT_FAILURE,
      })
    }
  }

  function attemptSubmit(): void {
    const nextErrors: FieldErrors = {}
    for (const field of FIELD_ORDER) {
      nextErrors[field] = validateField(field, values)
    }
    setErrors(nextErrors)

    const firstInvalid = FIELD_ORDER.find(
      (field) => nextErrors[field] !== undefined,
    )
    if (firstInvalid !== undefined) {
      const refs: Record<FieldKey, React.RefObject<HTMLElement>> = {
        subject: subjectRef,
        requester: requesterRef,
        category: categoryRef,
        notes: notesRef,
      }
      refs[firstInvalid].current?.focus()
      return
    }
    if (outcome.kind === 'submitting') return
    void submit()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    attemptSubmit()
  }

  const submitting = outcome.kind === 'submitting'

  return (
    <form className="request-form" noValidate onSubmit={handleSubmit}>
      {outcome.kind === 'created' && (
        <div className="form-status" role="status">
          <p>
            Request created. Reference <span className="mono-ref">{outcome.id}</span>.
          </p>
        </div>
      )}
      {outcome.kind === 'failed' && (
        <div className="form-alert" role="alert">
          <p>Couldn’t submit the request. {outcome.message}</p>
          <button type="button" className="btn btn-primary" onClick={attemptSubmit}>
            Retry submission
          </button>
        </div>
      )}

      <div className="field">
        <label htmlFor={`${prefix}-subject`}>Subject</label>
        <p className="field-hint" id={`${prefix}-subject-hint`}>
          {`${SUBJECT_MIN}–${SUBJECT_MAX} characters. State the requested action.`}
        </p>
        <input
          ref={subjectRef}
          id={`${prefix}-subject`}
          name="subject"
          type="text"
          className="control"
          autoComplete="off"
          value={values.subject}
          onChange={(event) => change('subject', event.target.value)}
          onBlur={() => blur('subject')}
          aria-describedby={describedBy('subject')}
          aria-invalid={errors.subject !== undefined ? true : undefined}
        />
        {errors.subject !== undefined && (
          <p className="field-error" id={`${prefix}-subject-error`}>
            {errors.subject}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${prefix}-requester`}>Requester</label>
        <p className="field-hint" id={`${prefix}-requester-hint`}>
          Full name of the person who submitted the request.
        </p>
        <input
          ref={requesterRef}
          id={`${prefix}-requester`}
          name="requester"
          type="text"
          className="control"
          autoComplete="name"
          value={values.requester}
          onChange={(event) => change('requester', event.target.value)}
          onBlur={() => blur('requester')}
          aria-describedby={describedBy('requester')}
          aria-invalid={errors.requester !== undefined ? true : undefined}
        />
        {errors.requester !== undefined && (
          <p className="field-error" id={`${prefix}-requester-error`}>
            {errors.requester}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${prefix}-category`}>Category</label>
        <p className="field-hint" id={`${prefix}-category-hint`}>
          Determines which team reviews the request.
        </p>
        <select
          ref={categoryRef}
          id={`${prefix}-category`}
          name="category"
          className="control"
          value={values.category}
          onChange={(event) => change('category', event.target.value)}
          onBlur={() => blur('category')}
          aria-describedby={describedBy('category')}
          aria-invalid={errors.category !== undefined ? true : undefined}
        >
          <option value="">Select a category…</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.category !== undefined && (
          <p className="field-error" id={`${prefix}-category-error`}>
            {errors.category}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${prefix}-priority`}>Priority</label>
        <p className="field-hint" id={`${prefix}-priority-hint`}>
          Urgent requests page the on-call reviewer.
        </p>
        <select
          id={`${prefix}-priority`}
          name="priority"
          className="control"
          value={values.priority}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              priority: event.target.value as RequestPriority,
            }))
          }
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${prefix}-notes`}>Notes</label>
        <p className="field-hint" id={`${prefix}-notes-hint`}>
          {`Optional. Up to ${NOTES_MAX} characters.`}
        </p>
        <textarea
          ref={notesRef}
          id={`${prefix}-notes`}
          name="notes"
          className="control"
          rows={4}
          value={values.notes}
          onChange={(event) => change('notes', event.target.value)}
          onBlur={() => blur('notes')}
          aria-describedby={describedBy('notes')}
          aria-invalid={errors.notes !== undefined ? true : undefined}
        />
        {errors.notes !== undefined && (
          <p className="field-error" id={`${prefix}-notes-error`}>
            {errors.notes}
          </p>
        )}
      </div>

      <div className="form-actions">
        {onCancel !== undefined && (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={onCancel}
            disabled={submitting}
          >
            {cancelLabel}
          </button>
        )}
        {/* Never disabled for invalid input; only while a submission is in flight. */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          data-pending={submitting || undefined}
          aria-busy={submitting || undefined}
        >
          {submitting && <span className="spinner" aria-hidden="true" />}
          <span>{submitLabel}</span>
        </button>
      </div>
    </form>
  )
}
