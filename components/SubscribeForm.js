'use client'
import { useEffect, useId, useReducer, useRef } from 'react'
import { BUTTON_PRIMARY, FOCUS, LINK, TOUCH } from './essayer/ui'
import {
  INITIAL_STATE,
  ROLES,
  SUBSCRIBE_COPY as T,
  announcementFor,
  sendSignup,
  subscribeReducer,
} from './subscribeFlow'
import { MAX_EMAIL_LENGTH, MAX_FIELD_LENGTH } from '../lib/subscribe.js'

const FIELD = `w-full min-w-0 rounded-xl border bg-white px-4 py-3 text-base text-ink placeholder:text-slate
  transition-colors duration-150 motion-reduce:transition-none ${FOCUS}`
const FIELD_BORDER = 'border-gray-300 hover:border-violet'
const LABEL = 'mb-1.5 block text-sm font-medium text-ink'
const HEADING = 'font-semibold text-ink focus:outline-none'
const APPEAR = 'animate-fade-up motion-reduce:animate-none'

/**
 * What the form shows for a given state. Pure (no hooks), so it can be rendered in tests.
 *
 * @param {{
 *   state: import('./subscribeFlow').SubscribeState,
 *   ids: { email: string, emailError: string },
 *   headingRef?: import('react').Ref<HTMLElement>,
 *   emailRef?: import('react').Ref<HTMLInputElement>,
 *   onEdit?: (field: string, value: string) => void,
 *   onSubmitEmail?: (e: import('react').FormEvent) => void,
 *   onSubmitDetails?: (e: import('react').FormEvent) => void,
 *   onRetry?: () => void,
 * }} props
 */
export function SubscribeFormView({ state, ids, headingRef, emailRef, onEdit, onSubmitEmail, onSubmitDetails, onRetry }) {
  const { step, values, emailError, loading } = state
  const edit = (field) => (e) => onEdit?.(field, e.target.value)

  let body
  if (step === 'success') {
    body = (
      <div className={`py-6 text-center ${APPEAR}`}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal/10" aria-hidden="true">
          <span className="text-2xl">✓</span>
        </div>
        <h3 ref={headingRef} tabIndex={-1} className={`${HEADING} mb-1 text-lg`}>{T.successHeading}</h3>
        <p className="text-sm text-slate">{T.successText}</p>
      </div>
    )
  } else if (step === 'error') {
    body = (
      <div className="py-4 text-center">
        <h3 ref={headingRef} tabIndex={-1} className={`${HEADING} mb-2 text-sm text-red-700`}>{T.errorHeading}</h3>
        <button type="button" onClick={onRetry} className={`${LINK} ${TOUCH} text-sm`}>{T.retry}</button>
      </div>
    )
  } else if (step === 'email') {
    body = (
      <form noValidate onSubmit={onSubmitEmail}>
        <label htmlFor={ids.email} className={LABEL}>{T.emailLabel}</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            ref={emailRef}
            id={ids.email}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            maxLength={MAX_EMAIL_LENGTH}
            value={values.email}
            onChange={edit('email')}
            placeholder={T.emailPlaceholder}
            aria-invalid={emailError || undefined}
            aria-describedby={emailError ? ids.emailError : undefined}
            className={`${FIELD} flex-1 ${emailError ? 'border-red-700' : FIELD_BORDER}`}
          />
          <button type="submit" className={`${BUTTON_PRIMARY} whitespace-nowrap`}>
            {T.emailSubmit} →
          </button>
        </div>
        {emailError && (
          <p id={ids.emailError} role="alert" className="mt-2 text-sm font-medium text-red-700">
            {T.invalidEmail}
          </p>
        )}
      </form>
    )
  } else {
    body = (
      <form onSubmit={onSubmitDetails} className={`space-y-3 ${APPEAR}`}>
        <h3 ref={headingRef} tabIndex={-1} className={`${HEADING} text-base`}>{T.detailsHeading}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${ids.email}-name`} className={LABEL}>{T.nameLabel}</label>
            <input id={`${ids.email}-name`} type="text" name="name" autoComplete="name" required maxLength={MAX_FIELD_LENGTH}
              value={values.name} onChange={edit('name')} className={`${FIELD} ${FIELD_BORDER}`} />
          </div>
          <div>
            <label htmlFor={`${ids.email}-company`} className={LABEL}>{T.companyLabel}</label>
            <input id={`${ids.email}-company`} type="text" name="company" autoComplete="organization" required maxLength={MAX_FIELD_LENGTH}
              value={values.company} onChange={edit('company')} className={`${FIELD} ${FIELD_BORDER}`} />
          </div>
          <div>
            <label htmlFor={`${ids.email}-role`} className={LABEL}>{T.roleLabel}</label>
            <select id={`${ids.email}-role`} name="role" required value={values.role} onChange={edit('role')}
              className={`${FIELD} ${FIELD_BORDER}`}>
              <option value="">{T.rolePlaceholder}</option>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading} className={`${BUTTON_PRIMARY} w-full`}>
          {loading ? T.submitting : `${T.submit} →`}
        </button>
        <p className="text-center text-xs text-slate">{T.perks}</p>
      </form>
    )
  }

  return (
    <div>
      {/* Stays mounted on every step so screen readers hear the success or error message. */}
      <p role="status" className="sr-only">{announcementFor(step)}</p>
      {body}
    </div>
  )
}

export default function SubscribeForm() {
  const [state, dispatch] = useReducer(subscribeReducer, INITIAL_STATE)
  const id = useId()
  const ids = { email: `${id}-email`, emailError: `${id}-email-error` }
  const headingRef = useRef(null)
  const emailRef = useRef(null)

  // On every step change, focus the new step's heading (or the address field when it is
  // wrong), never the top of the page.
  useEffect(() => {
    if (state.focus === 'heading') headingRef.current?.focus()
    else if (state.focus === 'email') emailRef.current?.focus()
  }, [state.focusKey, state.focus])

  function onSubmitEmail(e) {
    e.preventDefault()
    dispatch({ type: 'submitEmail' })
  }

  async function onSubmitDetails(e) {
    e.preventDefault()
    if (state.loading) return
    dispatch({ type: 'submitting' })
    const outcome = await sendSignup(state.values)
    dispatch({ type: 'result', outcome })
  }

  return (
    <SubscribeFormView
      state={state}
      ids={ids}
      headingRef={headingRef}
      emailRef={emailRef}
      onEdit={(field, value) => dispatch({ type: 'edit', field, value })}
      onSubmitEmail={onSubmitEmail}
      onSubmitDetails={onSubmitDetails}
      onRetry={() => dispatch({ type: 'retry' })}
    />
  )
}
