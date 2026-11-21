import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SubscribeFormView } from './SubscribeForm'
import { INITIAL_STATE, subscribeReducer } from './subscribeFlow'

const ids = { email: 'f-email', emailError: 'f-email-error' }
const VALUES = { email: 'test+qa1@netgraph.test', name: 'Test QA', company: 'Société Démo', role: 'Autre' }
const html = (state) => renderToStaticMarkup(<SubscribeFormView state={state} ids={ids} />)
const at = (patch) => ({ ...INITIAL_STATE, ...patch, values: { ...INITIAL_STATE.values, ...patch.values } })

describe('SubscribeFormView markup', () => {
  it('email step: noValidate, a real label, no error attributes until there is an error', () => {
    const out = html(INITIAL_STATE)
    expect(out).toContain('novalidate=""')
    expect(out).toContain('<label for="f-email"')
    expect(out).toContain('id="f-email"')
    expect(out).not.toContain('aria-invalid')
    expect(out).not.toContain('aria-describedby')
    expect(out).not.toContain('role="alert"')
  })

  it('invalid address: aria-invalid, aria-describedby → the alert, darker red (red-700), never red-500', () => {
    const out = html(at({ emailError: true }))
    expect(out).toContain('aria-invalid="true"')
    expect(out).toContain('aria-describedby="f-email-error"')
    expect(out).toMatch(/<p id="f-email-error" role="alert"[^>]*text-red-700[^>]*>Cette adresse email n&#x27;est pas valide\. Vérifiez-la, puis réessayez\.<\/p>/)
    expect(out).not.toContain('red-500')
    expect(out).not.toContain('Une erreur s&#x27;est produite')
  })

  it('the email field has no maxLength: a pasted long address is never cut silently (QA plan A)', () => {
    const out = html(at({ values: { email: 'a'.repeat(280) + '@netgraph.test' } }))
    expect(out).toMatch(/<input[^>]*id="f-email"[^>]*>/)
    expect(out.match(/<input[^>]*id="f-email"[^>]*>/)[0]).not.toMatch(/maxlength/i)
  })

  it('name and company keep maxLength 100', () => {
    const out = html(at({ step: 'details', values: VALUES }))
    for (const f of ['name', 'company']) {
      expect(out.match(new RegExp(`<input[^>]*id="f-email-${f}"[^>]*>`))[0]).toContain('maxLength="100"')
    }
  })

  it('aria-invalid goes away once the address is edited', () => {
    const edited = subscribeReducer(at({ emailError: true }), { type: 'edit', field: 'email', value: 'a@b.ma' })
    expect(html(edited)).not.toContain('aria-invalid')
  })

  it('details step: every field has a label and keeps its value; heading focusable', () => {
    const out = html(at({ step: 'details', values: VALUES }))
    for (const f of ['name', 'company', 'role']) {
      expect(out).toContain(`<label for="f-email-${f}"`)
      expect(out).toContain(`id="f-email-${f}"`)
    }
    expect(out).toContain('>Prénom et nom</label>')
    expect(out).toContain('>Entreprise</label>')
    expect(out).toContain('value="Test QA"')
    expect(out).toContain('value="Société Démo"')
    expect(out).toMatch(/<h3 tabindex="-1"[^>]*>Dernière étape<\/h3>/)
  })

  it('success: exact texts, focusable heading, announced in the status region, no number', () => {
    const out = html(at({ step: 'success' }))
    expect(out).toMatch(/<h3 tabindex="-1"[^>]*>Vous êtes sur la liste !<\/h3>/)
    expect(out).toContain('Nous vous contacterons en priorité pour l&#x27;accès à la beta.')
    expect(out).toMatch(/<p role="status" class="sr-only">Vous êtes sur la liste ! Nous vous contacterons/)
    expect(out.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'")).not.toMatch(/\d/)
    expect(out).not.toMatch(/déjà inscrit/i)
  })

  it('error: focusable heading, « Réessayer » button, announced in the status region', () => {
    const out = html(at({ step: 'error' }))
    expect(out).toMatch(/<h3 tabindex="-1"[^>]*text-red-700[^>]*>Une erreur s&#x27;est produite\. Réessayez\.<\/h3>/)
    expect(out).toMatch(/<button type="button"[^>]*>Réessayer<\/button>/)
    expect(out).toContain('<p role="status" class="sr-only">Une erreur s&#x27;est produite. Réessayez.</p>')
  })

  it('exactly one status region on every step', () => {
    for (const step of ['email', 'details', 'success', 'error']) {
      expect(html(at({ step })).match(/role="status"/g)).toHaveLength(1)
    }
  })

  it('animations are switched off under prefers-reduced-motion', () => {
    for (const step of ['details', 'success']) {
      const out = html(at({ step }))
      if (out.includes('animate-fade-up')) expect(out).toContain('motion-reduce:animate-none')
    }
  })
})
