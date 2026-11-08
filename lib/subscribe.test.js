import { describe, it, expect } from 'vitest'
import { validateSignup, MAX_EMAIL_LENGTH, MAX_FIELD_LENGTH, MAX_BODY_BYTES } from './subscribe.js'

const BAD_BODY = { ok: false, error: 'INVALID_BODY' }
const BAD_EMAIL = { ok: false, error: 'INVALID_EMAIL' }

describe('validateSignup', () => {
  it('accepts a full valid body', () => {
    expect(
      validateSignup({ email: 'test+qa1@netgraph.test', name: 'Sara Démo', company: 'Fictiva Conseil', role: 'DAF' }),
    ).toEqual({
      ok: true,
      value: { email: 'test+qa1@netgraph.test', name: 'Sara Démo', company: 'Fictiva Conseil', role: 'DAF' },
    })
  })

  it('trims and lowercases the email', () => {
    const r = validateSignup({ email: '  Test+QA1@NetGraph.TEST \n' })
    expect(r).toEqual({ ok: true, value: { email: 'test+qa1@netgraph.test', name: '', company: '', role: '' } })
  })

  it('treats missing, undefined and null optional fields as empty strings', () => {
    const r = validateSignup({ email: 'test+qa1@netgraph.test', name: null, company: undefined })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ email: 'test+qa1@netgraph.test', name: '', company: '', role: '' })
  })

  it('trims and collapses whitespace in name, company and role', () => {
    const r = validateSignup({
      email: 'test+qa1@netgraph.test',
      name: '  Sara \t  Démo ',
      company: 'Fictiva\n\nConseil',
      role: ' Consultant(e)   indépendant(e) ',
    })
    expect(r.value).toMatchObject({ name: 'Sara Démo', company: 'Fictiva Conseil', role: 'Consultant(e) indépendant(e)' })
  })

  it('drops extra fields', () => {
    const r = validateSignup({ email: 'test+qa1@netgraph.test', isAdmin: true, date: '1999-01-01', source: 'x' })
    expect(r).toEqual({ ok: true, value: { email: 'test+qa1@netgraph.test', name: '', company: '', role: '' } })
  })

  it('rejects a missing, non-string, empty or invalid email', () => {
    expect(validateSignup({})).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: 42 })).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: ['test+qa1@netgraph.test'] })).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: '' })).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: '   ' })).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: 'pas-un-email' })).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: 'sara@netgraph' })).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: 'sara demo@netgraph.test' })).toEqual(BAD_EMAIL)
    expect(validateSignup({ email: '<sara@netgraph.test>' })).toEqual(BAD_EMAIL)
  })

  it('accepts a 254-character email and rejects a 255-character one', () => {
    const domain = '@netgraph.test'
    const at254 = 'a'.repeat(MAX_EMAIL_LENGTH - domain.length) + domain
    const at255 = 'a'.repeat(MAX_EMAIL_LENGTH + 1 - domain.length) + domain
    expect(at254).toHaveLength(254)
    expect(validateSignup({ email: at254 }).ok).toBe(true)
    expect(validateSignup({ email: at255 })).toEqual(BAD_EMAIL)
  })

  it('rejects a name, company or role that is not a string', () => {
    expect(validateSignup({ email: 'test+qa1@netgraph.test', name: { first: 'Sara' } })).toEqual(BAD_BODY)
    expect(validateSignup({ email: 'test+qa1@netgraph.test', name: 42 })).toEqual(BAD_BODY)
    expect(validateSignup({ email: 'test+qa1@netgraph.test', company: ['Fictiva'] })).toEqual(BAD_BODY)
    expect(validateSignup({ email: 'test+qa1@netgraph.test', role: true })).toEqual(BAD_BODY)
  })

  it('accepts 100 characters and rejects 101 in name, company and role', () => {
    const ok = 'c'.repeat(MAX_FIELD_LENGTH)
    const tooLong = 'c'.repeat(MAX_FIELD_LENGTH + 1)
    expect(validateSignup({ email: 'test+qa1@netgraph.test', company: ok }).ok).toBe(true)
    expect(validateSignup({ email: 'test+qa1@netgraph.test', company: tooLong })).toEqual(BAD_BODY)
    expect(validateSignup({ email: 'test+qa1@netgraph.test', name: tooLong })).toEqual(BAD_BODY)
    expect(validateSignup({ email: 'test+qa1@netgraph.test', role: tooLong })).toEqual(BAD_BODY)
  })

  it('measures the length after collapsing whitespace', () => {
    const padded = '   ' + 'c'.repeat(MAX_FIELD_LENGTH) + '   '
    expect(validateSignup({ email: 'test+qa1@netgraph.test', name: padded }).ok).toBe(true)
  })

  it('rejects a body that is not a plain object', () => {
    for (const body of [null, undefined, 'test+qa1@netgraph.test', 42, true, [], [{ email: 'test+qa1@netgraph.test' }], new Date()]) {
      expect(validateSignup(body)).toEqual(BAD_BODY)
    }
  })

  it('accepts an object with a null prototype', () => {
    const body = Object.assign(Object.create(null), { email: 'test+qa1@netgraph.test' })
    expect(validateSignup(body).ok).toBe(true)
  })

  it('never throws, even on hostile input', () => {
    const hostile = {
      get email() {
        return 'test+qa1@netgraph.test'
      },
      name: Symbol('x'),
    }
    expect(() => validateSignup(hostile)).not.toThrow()
    expect(validateSignup(hostile)).toEqual(BAD_BODY)
  })

  it('exposes the 10 KB body cap the route uses', () => {
    expect(MAX_BODY_BYTES).toBe(10240)
  })
})
