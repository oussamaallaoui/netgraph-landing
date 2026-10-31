'use client'
// « Que cherchez-vous ? »: the request (« demande ») field and its submit button (#6 F1).
// The search runs on submit only. The field has no `name`, so even a native submission
// could never put the request in a URL; autocomplete is off so the browser doesn't keep
// earlier requests in its form history (PO, 2026-10-29).

import { useId } from 'react'
import Arrow from './Arrow'
import { BUTTON_PRIMARY, FOCUS } from './ui'
import { EMPTY_REQUEST_MESSAGE, REQUEST_LABEL } from './search'
import { MAX_REQUEST_LENGTH } from '../../lib/match.js'
import { EXAMPLE_REQUESTS } from '../../lib/vocabulary.js'

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {() => void} props.onSubmit
 * @param {boolean} props.showEmptyError
 * @param {import('react').Ref<HTMLInputElement>} [props.inputRef]
 */
export default function RequestForm({ value, onChange, onSubmit, showEmptyError, inputRef }) {
  const inputId = useId()
  const errorId = useId()

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} noValidate role="search" aria-label="Rechercher dans votre réseau">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-ink">
        {REQUEST_LABEL}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={MAX_REQUEST_LENGTH}
          placeholder={EXAMPLE_REQUESTS[0]}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={showEmptyError || undefined}
          aria-describedby={showEmptyError ? errorId : undefined}
          className={`min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-base text-ink placeholder:text-slate
            transition-colors duration-150 motion-reduce:transition-none
            ${showEmptyError ? 'border-red-700' : 'border-gray-300 hover:border-violet'} ${FOCUS}`}
        />
        <button type="submit" className={`${BUTTON_PRIMARY} shrink-0`}>
          Trouver qui peut m&apos;aider <Arrow />
        </button>
      </div>
      <div aria-live="polite" className="min-h-[1.25rem]">
        {showEmptyError && (
          <p id={errorId} className="mt-2 text-sm font-medium text-red-700">
            {EMPTY_REQUEST_MESSAGE}
          </p>
        )}
      </div>
    </form>
  )
}
