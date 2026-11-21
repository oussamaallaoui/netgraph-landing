// Short privacy notice under the signup form (#12): rendered to static HTML (no jsdom).
// The copy is the PO's approved text (issue #12), with the founder's 2026-11-21 addition:
// company and role are also used to choose whom to invite first.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SignupPrivacyNotice from './SignupPrivacyNotice'

const html = renderToStaticMarkup(createElement(SignupPrivacyNotice))
const text = html.replace(/<[^>]+>/g, '').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim()

describe('SignupPrivacyNotice', () => {
  it('says which data is collected, why, how long, and how to ask for deletion', () => {
    expect(text).toBe(
      'Nous utilisons votre email, votre nom, votre entreprise et votre rôle uniquement pour la beta de NetGraph : ' +
        "vous recontacter à son sujet et, d'après votre entreprise et votre rôle, choisir qui inviter en premier. " +
        "Nous les gardons jusqu'à la création de votre compte, et les supprimons plus tôt si vous le demandez à " +
        'contact@netgraph.app. En savoir plus',
    )
  })

  it('links « En savoir plus » to /confidentialite in the same tab, with a visible focus ring', () => {
    const links = [...html.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)]
    expect(links).toHaveLength(1)
    const [, attrs, label] = links[0]
    expect(label).toBe('En savoir plus')
    expect(attrs).toContain('href="/confidentialite"')
    expect(attrs).not.toContain('target=')
    expect(attrs).toContain('focus-visible:outline-violet')
  })

  it('uses a readable text colour (slate), never gray-400 or signal', () => {
    expect(html).toContain('text-slate')
    expect(html).not.toMatch(/text-gray-400|text-signal/)
  })
})
