// BetaSignupNotice (#47): shown in the #beta card instead of the signup form until #11 (PR #41) ships.
// Rendered to static HTML (no jsdom).
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import BetaSignupNotice from './BetaSignupNotice'

const html = renderToStaticMarkup(createElement(BetaSignupNotice))

describe('BetaSignupNotice', () => {
  it('shows the exact title, both sentences and the link to /essayer', () => {
    expect(html).toContain('Nous ne collectons aucune donnée pour l&#x27;instant.')
    expect(html).toContain('Il n&#x27;y a rien à remplir : les inscriptions ne sont pas encore ouvertes.')
    expect(html).toContain('En attendant, essayez NetGraph sur vos propres contacts, sans inscription. Ils restent sur votre appareil.')
    expect(html).toMatch(/<a[^>]*href="\/essayer"[^>]*>Essayer maintenant<svg[^>]*aria-hidden="true"/)
  })

  it('asks for no data: no form, field, menu or button', () => {
    for (const tag of ['<form', '<input', '<select', '<textarea', '<button']) {
      expect(html).not.toContain(tag)
    }
  })

  it('reads in order: title, then text, then link', () => {
    const h3 = html.indexOf('<h3')
    const p = html.indexOf('<p')
    const a = html.indexOf('<a')
    expect(h3).toBeGreaterThanOrEqual(0)
    expect(h3).toBeLessThan(p)
    expect(p).toBeLessThan(a)
  })

  it('promises no free offer and no delay', () => {
    for (const text of ['gratuit', '7 jours', '3 mois']) {
      expect(html.toLowerCase()).not.toContain(text)
    }
  })
})
