// The landing page (app/page.js) rendered to static HTML (no jsdom; effects do not run).
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import LandingPage from './page'

const html = renderToStaticMarkup(createElement(LandingPage))
const source = readFileSync(new URL('./page.js', import.meta.url), 'utf8')

describe('#47 — until #11 ships', () => {
  it('says signups open soon instead of showing the form', () => {
    expect(html).toContain('Inscriptions à la beta bientôt ouvertes')
    expect(html).toContain('Découvrir la beta')
    expect(html).toContain('Les inscriptions ouvrent bientôt')
    expect(html).toContain('Nous ne collectons aucune donnée pour l&#x27;instant.')
  })

  it('no longer says the beta is open, and asks for no data', () => {
    for (const text of ['Accès beta ouvert', 'Rejoindre la beta gratuite', '<form', '<input', '<select']) {
      expect(html).not.toContain(text)
    }
  })

  it('keeps the nav « Accès beta » link to the section', () => {
    expect(html).toMatch(/<a[^>]*href="#beta"[^>]*>Accès beta<\/a>/)
  })

  it('renders the notice, never the form that calls /api/subscribe', () => {
    expect(source).toContain('<BetaSignupNotice />')
    expect(source).not.toContain('<SubscribeForm')
  })
})
