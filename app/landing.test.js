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

describe('#48 — promises', () => {
  it('makes no promise NetGraph does not keep', () => {
    for (const text of ['7 jours', '3 mois', '100 premiers', 'onboarding personnalisé', '100% privées', 'Gratuit · ']) {
      expect(html).not.toContain(text)
    }
  })

  it('shows the true texts', () => {
    for (const text of [
      'Aucune carte requise · Essai sans inscription',
      'Beta en préparation',
      'Les premiers inscrits seront contactés en priorité à l&#x27;ouverture de la beta.',
    ]) {
      expect(html).toContain(text)
    }
  })

  it('lists the three guarantees', () => {
    for (const g of ['Aucune carte requise', 'Vos contacts restent sur votre appareil', 'Aucun message sans votre accord']) {
      expect(html).toContain(`</svg>${g}</span>`)
    }
  })

  it('uses readable colours in the hero line, the #beta badge and the guarantees', () => {
    expect(html).toMatch(/<p class="[^"]*text-slate[^"]*">Aucune carte requise · Essai sans inscription<\/p>/)
    expect(html).toMatch(/<div class="[^"]*bg-violet-light text-violet[^"]*"><span class="[^"]*"><\/span>Beta en préparation<\/div>/)
    expect(html).not.toMatch(/animate-pulse"><\/span>Beta en préparation/)
    expect(html).toMatch(/<div class="[^"]*text-slate[^"]*"><span[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>Aucune carte requise<\/span>/)
  })
})
