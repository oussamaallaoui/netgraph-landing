import { describe, expect, it, vi } from 'vitest'
import {
  INITIAL_STATE,
  SUBSCRIBE_COPY,
  announcementFor,
  readOutcome,
  sendSignup,
  subscribeReducer,
} from './subscribeFlow'

const VALUES = { email: 'test+qa1@netgraph.test', name: 'Test QA', company: 'Société Démo', role: 'Autre' }
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function run(actions, start = INITIAL_STATE) {
  return actions.reduce(subscribeReducer, start)
}
const typed = (values) => Object.entries(values).map(([field, value]) => ({ type: 'edit', field, value }))

describe('readOutcome (contract on #11)', () => {
  it('success on 200 without reading the body (no total, no count)', async () => {
    const res = { ok: true, status: 200, json: vi.fn() }
    expect(await readOutcome(res)).toBe('success')
    expect(res.json).not.toHaveBeenCalled()
  })

  it('success on 200 with the exact contract body', async () => {
    expect(await readOutcome(json(200, { success: true }))).toBe('success')
  })

  it('400 Email invalide → invalid-email', async () => {
    expect(await readOutcome(json(400, { error: 'Email invalide' }))).toBe('invalid-email')
  })

  it('other 400, 409, 500, unreadable body → error', async () => {
    expect(await readOutcome(json(400, { error: 'Requête invalide' }))).toBe('error')
    expect(await readOutcome(json(409, { error: 'Déjà inscrit' }))).toBe('error')
    expect(await readOutcome(json(500, { error: 'Erreur serveur' }))).toBe('error')
    expect(await readOutcome(new Response('<html>', { status: 400 }))).toBe('error')
    expect(await readOutcome(new Response('null', { status: 400 }))).toBe('error')
  })
})

describe('sendSignup', () => {
  it('posts the four fields as JSON to /api/subscribe', async () => {
    const fetchImpl = vi.fn(async () => json(200, { success: true }))
    expect(await sendSignup(VALUES, fetchImpl)).toBe('success')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/subscribe')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual(VALUES)
  })

  it('a network error is an error outcome, never a throw', async () => {
    expect(await sendSignup(VALUES, async () => { throw new TypeError('Failed to fetch') })).toBe('error')
  })
})

describe('subscribeReducer', () => {
  it('nothing is focused on load', () => {
    expect(INITIAL_STATE.focus).toBeNull()
  })

  it.each(['a@b', 'a@', '@b.ma', 'a b@c.ma', ''])('invalid address %j stays on the email step, error on, focus on the field', (email) => {
    const s = run([...typed({ email }), { type: 'submitEmail' }])
    expect(s.step).toBe('email')
    expect(s.emailError).toBe(true)
    expect(s.focus).toBe('email')
  })

  it('an address over 254 characters is invalid on the client: the « email invalide » path, not a cut address', () => {
    const email = 'a'.repeat(250) + '@netgraph.test'
    expect(email.length).toBeGreaterThan(254)
    const s = run([...typed({ ...VALUES, email }), { type: 'submitEmail' }])
    expect(s).toMatchObject({ step: 'email', emailError: true, focus: 'email' })
    expect(s.values.email).toBe(email)
  })

  it('the error goes away as soon as the address is edited, not when another field is', () => {
    const wrong = run([...typed({ email: 'a@b' }), { type: 'submitEmail' }])
    expect(subscribeReducer(wrong, { type: 'edit', field: 'name', value: 'x' }).emailError).toBe(true)
    expect(subscribeReducer(wrong, { type: 'edit', field: 'email', value: 'a@b.' }).emailError).toBe(false)
  })

  it('a valid address (any case, spaces around) goes to details and focuses its heading', () => {
    const s = run([...typed({ email: '  Test+QA1@NetGraph.test ' }), { type: 'submitEmail' }])
    expect(s.step).toBe('details')
    expect(s.focus).toBe('heading')
  })

  it('success moves focus to the success heading', () => {
    const s = run([...typed(VALUES), { type: 'submitEmail' }, { type: 'submitting' }, { type: 'result', outcome: 'success' }])
    expect(s).toMatchObject({ step: 'success', loading: false, focus: 'heading' })
  })

  it('server 400 Email invalide: back to the email step, name, company and role kept', () => {
    const s = run([...typed(VALUES), { type: 'submitEmail' }, { type: 'submitting' }, { type: 'result', outcome: 'invalid-email' }])
    expect(s).toMatchObject({ step: 'email', emailError: true, loading: false, focus: 'email' })
    expect(s.values).toEqual(VALUES)
  })

  it('error then « Réessayer »: back to details with every field kept', () => {
    const err = run([...typed(VALUES), { type: 'submitEmail' }, { type: 'submitting' }, { type: 'result', outcome: 'error' }])
    expect(err).toMatchObject({ step: 'error', focus: 'heading' })
    const retry = subscribeReducer(err, { type: 'retry' })
    expect(retry).toMatchObject({ step: 'details', focus: 'heading' })
    expect(retry.values).toEqual(VALUES)
  })

  it('every step change asks for a new focus (focusKey grows)', () => {
    const a = run([...typed(VALUES), { type: 'submitEmail' }])
    const b = subscribeReducer(a, { type: 'result', outcome: 'error' })
    const c = subscribeReducer(b, { type: 'retry' })
    expect(b.focusKey).toBeGreaterThan(a.focusKey)
    expect(c.focusKey).toBeGreaterThan(b.focusKey)
  })
})

describe('copy', () => {
  it('exact success texts, no number, no « déjà inscrit »', () => {
    expect(SUBSCRIBE_COPY.successHeading).toBe('Vous êtes sur la liste !')
    expect(SUBSCRIBE_COPY.successText).toBe("Nous vous contacterons en priorité pour l'accès à la beta.")
    expect(SUBSCRIBE_COPY.invalidEmail).toBe("Cette adresse email n'est pas valide. Vérifiez-la, puis réessayez.")
    expect(SUBSCRIBE_COPY.errorHeading).toBe("Une erreur s'est produite. Réessayez.")
    const all = Object.values(SUBSCRIBE_COPY).join(' ')
    expect(all).not.toMatch(/déjà inscrit/i)
    expect(`${SUBSCRIBE_COPY.successHeading} ${SUBSCRIBE_COPY.successText}`).not.toMatch(/\d/)
  })

  it('the status region speaks only on success and error', () => {
    expect(announcementFor('email')).toBe('')
    expect(announcementFor('details')).toBe('')
    expect(announcementFor('success')).toContain('Vous êtes sur la liste !')
    expect(announcementFor('error')).toBe("Une erreur s'est produite. Réessayez.")
  })
})
