// Beta signup form (#11): texts, steps and the answer of POST /api/subscribe, without React.
// The component (SubscribeForm.js) only renders this state and moves the focus it names.
import { isValidEmail } from '../lib/subscribe.js'

export const SUBSCRIBE_COPY = {
  emailLabel: 'Adresse email professionnelle',
  emailPlaceholder: 'votre@email.com',
  emailSubmit: 'Rejoindre la beta',
  invalidEmail: "Cette adresse email n'est pas valide. Vérifiez-la, puis réessayez.",
  detailsHeading: 'Dernière étape',
  nameLabel: 'Prénom et nom',
  companyLabel: 'Entreprise',
  roleLabel: 'Votre rôle',
  rolePlaceholder: 'Sélectionnez',
  submit: 'Confirmer mon inscription',
  submitting: 'Inscription…',
  perks: 'Accès beta gratuit · Aucune carte requise · Invitation dans les 7 jours',
  successHeading: 'Vous êtes sur la liste !',
  successText: "Nous vous contacterons en priorité pour l'accès à la beta.",
  errorHeading: "Une erreur s'est produite. Réessayez.",
  retry: 'Réessayer',
}

export const ROLES = [
  'Direction / C-level',
  'Business Development',
  'Conseil / Consulting',
  'Finance / Investissement',
  'Commercial / Vente',
  'Autre',
]

/**
 * @typedef {'email' | 'details' | 'success' | 'error'} SubscribeStep
 * @typedef {{ email: string, name: string, company: string, role: string }} SubscribeValues
 * @typedef {{
 *   step: SubscribeStep,
 *   values: SubscribeValues,
 *   emailError: boolean,
 *   loading: boolean,
 *   focus: null | 'email' | 'heading',
 *   focusKey: number,
 * }} SubscribeState
 * @typedef {'success' | 'invalid-email' | 'error'} SubscribeOutcome
 */

/** @type {SubscribeState} */
export const INITIAL_STATE = {
  step: 'email',
  values: { email: '', name: '', company: '', role: '' },
  emailError: false,
  loading: false,
  // Nothing is focused on load: the form sits at the bottom of the landing page.
  focus: null,
  focusKey: 0,
}

/** Asks the component to focus `target` once the new step is rendered. */
function focusOn(state, target) {
  return { ...state, focus: target, focusKey: state.focusKey + 1 }
}

/**
 * Every transition of the form. The typed values are never reset: an invalid address
 * or an error keeps the name, company and role.
 *
 * @param {SubscribeState} state
 * @param {{ type: 'edit', field: keyof SubscribeValues, value: string }
 *   | { type: 'submitEmail' }
 *   | { type: 'submitting' }
 *   | { type: 'result', outcome: SubscribeOutcome }
 *   | { type: 'retry' }} action
 * @returns {SubscribeState}
 */
export function subscribeReducer(state, action) {
  switch (action.type) {
    case 'edit': {
      const values = { ...state.values, [action.field]: action.value }
      // The invalid-address message goes away as soon as the address is edited.
      const emailError = action.field === 'email' ? false : state.emailError
      return { ...state, values, emailError }
    }
    case 'submitEmail':
      if (!isValidEmail(state.values.email)) return focusOn({ ...state, emailError: true }, 'email')
      return focusOn({ ...state, step: 'details', emailError: false }, 'heading')
    case 'submitting':
      return { ...state, loading: true }
    case 'result':
      if (action.outcome === 'success') return focusOn({ ...state, step: 'success', loading: false }, 'heading')
      if (action.outcome === 'invalid-email') {
        return focusOn({ ...state, step: 'email', emailError: true, loading: false }, 'email')
      }
      return focusOn({ ...state, step: 'error', loading: false }, 'heading')
    case 'retry':
      return focusOn({ ...state, step: 'details' }, 'heading')
    default:
      return state
  }
}

/**
 * Reads the answer of POST /api/subscribe (contract on #11). Success is the status alone:
 * the body is never read on a 2xx. Only `400 {"error":"Email invalide"}` means a bad address;
 * anything else (other 400, 500, unreadable body) is a generic error.
 *
 * @param {{ ok: boolean, status: number, json: () => Promise<unknown> }} res
 * @returns {Promise<SubscribeOutcome>}
 */
export async function readOutcome(res) {
  if (res.ok) return 'success'
  if (res.status === 400) {
    try {
      const body = await res.json()
      if (body && body.error === 'Email invalide') return 'invalid-email'
    } catch {
      // Unreadable body: generic error below.
    }
  }
  return 'error'
}

/**
 * Sends the signup. Never throws: a network failure is an `'error'` outcome.
 *
 * @param {SubscribeValues} values
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<SubscribeOutcome>}
 */
export async function sendSignup(values, fetchImpl = fetch) {
  try {
    const res = await fetchImpl('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: values.email,
        name: values.name,
        company: values.company,
        role: values.role,
      }),
    })
    return await readOutcome(res)
  } catch {
    return 'error'
  }
}

/** Text of the single `role="status"` region: what a screen reader hears on success or error. */
export function announcementFor(step) {
  if (step === 'success') return `${SUBSCRIBE_COPY.successHeading} ${SUBSCRIBE_COPY.successText}`
  if (step === 'error') return SUBSCRIBE_COPY.errorHeading
  return ''
}
