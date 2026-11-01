'use client'
// The draft editor (#8), shown inline under a person card (no modal, no focus trap).
// The user edits the drafted message and sends it from their own app: NetGraph only
// offers three hand-offs, each a click: « Copier » (clipboard), « Ouvrir le profil
// LinkedIn » (new tab) and « Ouvrir dans votre messagerie » (mailto: to the user's own
// mail app). Nothing here is stored (except the tone), logged or sent to our origin.
// Copy: PO §4–§5 on #8, in ./draftState.js.

import { useEffect, useId, useRef, useState } from 'react'
import { useDrafts } from './DraftsContext'
import { copyText } from './clipboard'
import {
  DRAFT_UI,
  currentDraft,
  draftActions,
  draftKey,
  editorHeading,
  isEdited,
  linkedInHint,
  replaceQuestion,
  withFieldEdit,
  withTone,
} from './draftState'
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FOCUS } from './ui'

const FIELD = `w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-ink
  transition-colors duration-150 hover:border-violet motion-reduce:transition-none ${FOCUS}`

const TONES = /** @type {const} */ (['vous', 'tu'])

/**
 * @param {object} props
 * @param {string} props.id                 DOM id (the button's aria-controls)
 * @param {import('../../lib/types.js').Contact} props.contact
 * @param {'help' | 'intro'} props.kind
 * @param {string} [props.companyLabel]     'intro': the #7 section label
 * @param {() => void} props.onClose        « Fermer » or Escape; the caller moves focus back
 */
export default function DraftEditor({ id, contact, kind, companyLabel, onClose }) {
  const drafts = useDrafts()
  const uid = useId()
  const headingRef = useRef(null)
  const questionRef = useRef(null)
  const bodyRef = useRef(null)
  const radioRefs = useRef({})
  /** Tone waiting for « Remplacer » / « Garder mon texte » (only after an edit). */
  const [pendingTone, setPendingTone] = useState(null)
  /** 'copied' | 'failed' | null: visible feedback; the same text is announced. */
  const [copyState, setCopyState] = useState(null)
  /** Radio to focus once the confirmation is gone. */
  const focusRadio = useRef(null)

  const key = draftKey(kind, contact.id)
  const edit = drafts.getEdit(key)
  const draft = currentDraft({
    contact,
    request: drafts.request,
    kind,
    companyLabel,
    edit,
    preferredTone: drafts.preferredTone,
  })
  const actions = draftActions(contact, draft.subject, draft.body)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (pendingTone) questionRef.current?.focus()
  }, [pendingTone])

  useEffect(() => {
    if (pendingTone || !focusRadio.current) return
    radioRefs.current[focusRadio.current]?.focus()
    focusRadio.current = null
  }, [pendingTone])

  function chooseTone(tone) {
    if (tone === draft.tone) return
    if (isEdited(edit)) {
      setPendingTone(tone)
      return
    }
    drafts.setEdit(key, withTone(edit, tone))
    drafts.setPreferredTone(tone)
  }

  function replaceText() {
    const tone = pendingTone
    drafts.setEdit(key, withTone(edit, tone, { replace: true }))
    drafts.setPreferredTone(tone)
    focusRadio.current = tone
    setPendingTone(null)
    setCopyState(null)
  }

  function keepText() {
    focusRadio.current = draft.tone
    setPendingTone(null)
  }

  function editField(field, value) {
    drafts.setEdit(key, withFieldEdit(edit, field, value, draft.generated, draft.tone))
    if (field === 'body') setCopyState(null)
  }

  async function handleCopy() {
    // Called straight from the click: the Clipboard API needs the user gesture.
    const ok = await copyText(draft.body)
    setCopyState(ok ? 'copied' : 'failed')
    drafts.announce(ok ? DRAFT_UI.copied : DRAFT_UI.copyFailed)
    if (!ok && bodyRef.current) {
      bodyRef.current.focus()
      bodyRef.current.select()
    }
  }

  function handleKeyDown(event) {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    if (pendingTone) keepText()
    else onClose()
  }

  const headingId = `${uid}-heading`
  const subjectId = `${uid}-subject`
  const bodyId = `${uid}-body`
  const noteId = `${uid}-note`
  const questionId = `${uid}-question`

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={headingId}
      onKeyDown={handleKeyDown}
      className="mt-4 rounded-xl border border-violet-light bg-white p-4 sm:p-5"
    >
      <h4
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="break-words text-base font-semibold leading-snug text-ink focus:outline-none"
      >
        {editorHeading(contact, kind)}
      </h4>
      <p className="mt-2 flex items-start gap-2 rounded-lg bg-mist px-3 py-2 text-sm leading-relaxed text-ink">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" aria-hidden="true" />
        {DRAFT_UI.promise}
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-ink">{DRAFT_UI.toneLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <label
              key={tone}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-ink
                transition-colors duration-150 hover:border-violet motion-reduce:transition-none
                has-[:checked]:border-violet has-[:checked]:bg-violet-light has-[:focus-visible]:outline
                has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet"
            >
              <input
                ref={(el) => {
                  radioRefs.current[tone] = el
                }}
                type="radio"
                name={`${uid}-tone`}
                value={tone}
                checked={draft.tone === tone}
                onChange={() => chooseTone(tone)}
                className="h-4 w-4 accent-violet focus:outline-none"
              />
              {DRAFT_UI.toneLabels[tone]}
            </label>
          ))}
        </div>
      </fieldset>

      {pendingTone && (
        <div role="group" aria-labelledby={questionId} className="mt-3 rounded-xl bg-mist p-4">
          <p
            id={questionId}
            ref={questionRef}
            tabIndex={-1}
            className="text-sm font-medium leading-relaxed text-ink focus:outline-none"
          >
            {replaceQuestion(pendingTone)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={replaceText} className={BUTTON_PRIMARY}>
              {DRAFT_UI.replace}
            </button>
            <button type="button" onClick={keepText} className={BUTTON_SECONDARY}>
              {DRAFT_UI.keep}
            </button>
          </div>
        </div>
      )}

      {actions.hasEmail && (
        <div className="mt-4">
          <label htmlFor={subjectId} className="mb-2 block text-sm font-medium text-ink">
            {DRAFT_UI.subjectLabel}
          </label>
          <input
            id={subjectId}
            type="text"
            autoComplete="off"
            value={draft.subject}
            onChange={(e) => editField('subject', e.target.value)}
            className={FIELD}
          />
        </div>
      )}

      <div className="mt-4">
        <label htmlFor={bodyId} className="mb-2 block text-sm font-medium text-ink">
          {DRAFT_UI.bodyLabel}
        </label>
        <textarea
          id={bodyId}
          ref={bodyRef}
          rows={11}
          value={draft.body}
          onChange={(e) => editField('body', e.target.value)}
          aria-describedby={noteId}
          className={`${FIELD} resize-y leading-relaxed`}
        />
        <p id={noteId} className="mt-2 text-sm leading-relaxed text-slate">
          {DRAFT_UI.notSaved}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={handleCopy} className={BUTTON_PRIMARY}>
          {DRAFT_UI.copy}
        </button>
        {actions.linkedIn && (
          <a href={actions.linkedIn} target="_blank" rel="noopener noreferrer" className={BUTTON_SECONDARY}>
            {DRAFT_UI.openLinkedIn}
            <span className="sr-only">{DRAFT_UI.newTab}</span>
          </a>
        )}
        {actions.mailto && (
          <a href={actions.mailto} className={BUTTON_SECONDARY}>
            {DRAFT_UI.openMail}
          </a>
        )}
      </div>

      {copyState && (
        <p className={`mt-3 text-sm font-medium leading-relaxed ${copyState === 'copied' ? 'text-violet' : 'text-red-700'}`}>
          {copyState === 'copied' ? DRAFT_UI.copied : DRAFT_UI.copyFailed}
        </p>
      )}

      {actions.linkedIn && <p className="mt-3 text-sm leading-relaxed text-slate">{linkedInHint(contact)}</p>}
      {actions.hint === 'tooLong' && <p className="mt-3 text-sm leading-relaxed text-slate">{DRAFT_UI.tooLong}</p>}
      {actions.hint === 'none' && <p className="mt-3 text-sm leading-relaxed text-slate">{DRAFT_UI.noChannel}</p>}

      <div className="mt-4 border-t border-gray-100 pt-4">
        <button type="button" onClick={onClose} className={BUTTON_SECONDARY}>
          {DRAFT_UI.close}
        </button>
      </div>
    </div>
  )
}
