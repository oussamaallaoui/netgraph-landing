'use client'
// « Préparer un message » (#8 F1, F5): the button at the foot of a person card and the
// inline editor it opens under the card. Used by ResultCard (kind 'help') and by the #7
// introducer cards (kind 'intro', with the section's companyLabel). Opening moves focus
// to the editor heading; « Fermer », Escape or the button again close it, and focus goes
// back to the button. The text itself lives in RequestStep, so reopening shows the edits.

import { useEffect, useId, useRef, useState } from 'react'
import Arrow from './Arrow'
import DraftEditor from './DraftEditor'
import { useDrafts } from './DraftsContext'
import { DRAFT_UI, prepareSrText } from './draftState'
import { BUTTON_SECONDARY } from './ui'

/**
 * @param {object} props
 * @param {import('../../lib/types.js').Contact} props.contact
 * @param {'help' | 'intro'} props.kind
 * @param {string} [props.companyLabel]
 */
export default function DraftAction({ contact, kind, companyLabel }) {
  const drafts = useDrafts()
  const editorId = useId()
  const buttonRef = useRef(null)
  const [open, setOpen] = useState(false)
  const returnFocus = useRef(false)

  useEffect(() => {
    if (open || !returnFocus.current) return
    returnFocus.current = false
    buttonRef.current?.focus()
  }, [open])

  // Without RequestStep's draft state there is nothing to edit: no dead button.
  if (!drafts) return null

  function close() {
    returnFocus.current = true
    setOpen(false)
  }

  return (
    <div className="mt-4">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? editorId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`${BUTTON_SECONDARY} w-full sm:w-auto`}
      >
        {DRAFT_UI.prepare}
        <span className="sr-only">{prepareSrText(contact)}</span>
        <Arrow />
      </button>
      {open && <DraftEditor id={editorId} contact={contact} kind={kind} companyLabel={companyLabel} onClose={close} />}
    </div>
  )
}
