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

// The demo rotates through REQUESTS and only the first one is in the server HTML, so the name checks
// read the source of app/page.js too.
describe('#34 — fictional example', () => {
  const REAL_NAMES = /McKinsey|CIH Bank|Deloitte|BMCE|Attijari|\bOCP\b|Finance Is\./
  const NOTE = 'Exemple fictif — noms et entreprises inventés'

  it('names no real company, in the source or in the HTML', () => {
    expect(source).not.toMatch(REAL_NAMES)
    expect(html).not.toMatch(REAL_NAMES)
  })

  it('labels the graph nodes with the short fictional names', () => {
    const orgs = [...source.matchAll(/org: '([^']+)'/g)].map(m => m[1])
    expect(orgs).toEqual(['Quartzia', 'Zélia', 'Audivia', 'Nordacap', 'Tamsa', 'Phosfora', 'Iléa'])
  })

  it('uses the full fictional names in the requests, the results and the agent card', () => {
    expect(source.match(/'Directeur, Nordacap'/g)).toHaveLength(2)
    for (const text of [
      "'Responsable achats, Phosfora'",
      "'Partner, Fonds Iléa'",
      "'Senior Manager, Audivia'",
      "'Head of Strategy, Banque Tamsa'",
      "'Être présenté à quelqu\\'un chez Phosfora'",
    ]) {
      expect(source).toContain(text)
    }
    expect(html).toContain('Associée, Quartzia Conseil')
    expect(html).toContain('Jérôme chez Nordacap.')
  })

  it('no longer shows the testimonials', () => {
    expect(html).not.toContain('Ce que disent les premiers utilisateurs')
    expect(source).not.toContain('TESTIMONIALS')
  })

  it('marks each of the three examples as fictional, in a readable colour', () => {
    expect(html.split(`<p class="text-center text-xs text-slate mt-3">${NOTE}</p>`)).toHaveLength(4)
    expect(html.split(NOTE)).toHaveLength(4)
    expect(html).not.toContain('Exemple de démonstration')
    // one note right after each example, in page order
    const at = (s) => html.indexOf(s)
    const notes = [...html.matchAll(new RegExp(NOTE, 'g'))].map(m => m.index)
    expect(at('Nouvelle demande')).toBeLessThan(notes[0])
    expect(notes[0]).toBeLessThan(at('Une demande, les bonnes personnes, classées'))
    expect(at('Head of Strategy, Banque Tamsa')).toBeLessThan(notes[1])
    expect(notes[1]).toBeLessThan(at('De votre besoin à la bonne introduction'))
    expect(at('Jérôme chez Nordacap')).toBeLessThan(notes[2])
    expect(notes[2]).toBeLessThan(at('id="beta"'))
  })

  it('shows © 2026 in the footer', () => {
    expect(html).toContain('NetGraph © 2026')
    expect(html).not.toContain('© 2025')
  })

  it('never calls the beta free (pricing not decided)', () => {
    expect(html).not.toMatch(/gratuit/i)
  })
})
