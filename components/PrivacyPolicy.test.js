// Body of /confidentialite (#12): rendered to static HTML (no jsdom). The copy is the PO's text
// on issue #12, with the founder's 2026-11-21 addition in « Pourquoi nous les utilisons ».
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PrivacyPolicy from './PrivacyPolicy'

const html = renderToStaticMarkup(createElement(PrivacyPolicy))
const clean = s =>
  s.replace(/<[^>]+>/g, '').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const text = clean(html)
const tags = tag => [...html.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => clean(m[1]))

describe('PrivacyPolicy', () => {
  it('has one h1, then one h2 per section in the PO order', () => {
    expect(tags('h1')).toEqual(['Confidentialité'])
    expect(tags('h2')).toEqual([
      'Qui est responsable de vos données',
      'Les données que nous collectons',
      'Pourquoi nous les utilisons',
      'Où elles sont conservées',
      'Combien de temps nous les gardons',
      'Vos droits',
      '« Essayer maintenant » : vos contacts restent sur votre appareil',
      'Cookies et traceurs',
      'Mises à jour de cette page',
    ])
  })

  it('lists exactly what #11 stores, and nothing else', () => {
    expect(tags('li').slice(0, 6)).toEqual([
      'votre adresse email ;',
      'votre nom ;',
      'votre entreprise ;',
      'votre rôle ;',
      'la date de votre inscription ;',
      "l'origine de votre inscription (aujourd'hui, toujours la page d'accueil de NetGraph).",
    ])
    expect(text).toContain(
      "C'est tout. Votre inscription ne contient ni votre adresse IP, ni d'informations sur votre navigateur.",
    )
  })

  it('says company and role are also used to choose whom to invite first (founder, 2026-11-21)', () => {
    expect(text).toContain(
      'Nous les utilisons uniquement pour la beta de NetGraph : pour vous recontacter à son sujet et, ' +
        "d'après votre entreprise et votre rôle, pour choisir qui inviter en premier. Nous ne les vendons pas, " +
        'nous ne les utilisons pas pour de la publicité et nous ne vous inscrivons à aucune autre liste.',
    )
  })

  it('keeps the [RESPONSABLE] placeholder for the founder to fill before merge', () => {
    expect(text).toContain(
      "Vos données d'inscription sont traitées par [RESPONSABLE], qui édite NetGraph. " +
        'Pour toute question sur vos données, écrivez à contact@netgraph.app.',
    )
  })

  it('names the EU region of Upstash, and Vercel transit without a region', () => {
    expect(text).toContain(
      "Vos données d'inscription sont enregistrées dans une base de données de notre prestataire Upstash, " +
        "dans sa région de l'Union européenne, à Francfort (Allemagne).",
    )
    expect(text).toContain(
      "Le site est hébergé par Vercel : votre inscription passe par ses serveurs avant d'être enregistrée.",
    )
  })

  it('gives the retention period, the rights and the authorities', () => {
    expect(text).toContain(
      "Nous gardons votre inscription jusqu'à la création de votre compte NetGraph. " +
        'Si vous nous le demandez avant, nous la supprimons plus tôt.',
    )
    expect(tags('li').slice(6)).toEqual([
      "l'accès : savoir quelles données nous avons sur vous et en recevoir une copie ;",
      'la rectification : corriger une donnée inexacte ;',
      'la suppression : effacer votre inscription ;',
      "l'opposition : que nous cessions d'utiliser vos données. Nous ne vous recontacterons alors plus.",
    ])
    expect(text).toContain('vous pouvez vous adresser à la CNDP au Maroc')
  })

  it('explains that contacts imported on « Essayer maintenant » stay on the device', () => {
    expect(text).toContain(
      'Sur la page « Essayer maintenant », les contacts que vous importez (export LinkedIn, fichier de contacts ' +
        'de votre téléphone) sont lus et conservés uniquement dans votre navigateur, sur cet appareil. ' +
        'Ils ne sont jamais envoyés à NetGraph, pas plus que votre demande ni les messages proposés.',
    )
    expect(text).toContain(
      'Le bouton « Effacer mes données de cet appareil » supprime tout ce que NetGraph a enregistré dans ce navigateur.',
    )
  })

  it('says there are no cookies and shows the update date', () => {
    expect(text).toContain("Ce site ne dépose aucun cookie et n'utilise ni outil de mesure d'audience")
    expect(text).toContain('Dernière mise à jour : 21 novembre 2026')
  })

  it('links the contact address by mailto and has a focusable link back home', () => {
    const links = [...html.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)].map(([, a, l]) => ({ a, l: clean(l) }))
    const mail = links.filter(x => x.a.includes('href="mailto:contact@netgraph.app"'))
    expect(mail.length).toBeGreaterThanOrEqual(2)
    expect(mail.every(x => x.l === 'contact@netgraph.app')).toBe(true)
    const home = links.find(x => x.l === "Retour à l'accueil")
    expect(home.a).toContain('href="/"')
    expect(links.every(x => x.a.includes('focus-visible:outline-violet'))).toBe(true)
  })

  it('uses no text colour below 4.5:1 and loads nothing from another origin', () => {
    expect(html).not.toMatch(/text-gray-400|text-signal/)
    expect(html).not.toMatch(/(src|href)="https?:/)
    expect(html).not.toContain('<script')
  })
})
