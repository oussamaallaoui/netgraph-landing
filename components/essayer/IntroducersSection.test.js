// IntroducersSection for found_many (#35): rendered to static HTML (no jsdom), inside the drafts
// context so each card shows « Préparer un message ».
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import IntroducersSection from './IntroducersSection'
import { DraftsContext } from './DraftsContext'
import { foundManyIntro, foundManyOverflow, introducersCountLine, introducersHeading } from './introducersCopy'

const draftsApi = {
  request: '',
  preferredTone: 'vous',
  setPreferredTone() {},
  getEdit: () => undefined,
  setEdit() {},
  announce() {},
}

const person = (id, fullName, company) => ({
  contact: { id, fullName, company, firstName: fullName.split(' ')[0], lastName: fullName.split(' ')[1] ?? '' },
  why: `${fullName} travaille chez ${company}.`,
})
const group = (companyLabel, names, total = names.length) => ({
  companyLabel,
  people: names.map((n, i) => person(`${companyLabel}-${i}`, n, companyLabel)),
  total,
})
const many = (groups, groupsTotal = groups.length) => ({
  status: 'found_many',
  companyLabel: null,
  people: [],
  total: 0,
  groups,
  groupsTotal,
})

/** Escape like React does for text content, so expected copy can be searched in the HTML. */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;')

function render(intro, isSample = false) {
  const focusRef = { current: null }
  const html = renderToStaticMarkup(
    createElement(DraftsContext.Provider, { value: draftsApi }, createElement(IntroducersSection, { intro, isSample, focusRef })),
  )
  return html
}

function sections(html) {
  return [...html.matchAll(/<section aria-labelledby="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => ({
    labelledBy: m[1],
    body: m[2],
  }))
}

const count = (html, needle) => html.split(needle).length - 1

describe('IntroducersSection, found_many with 2 groups', () => {
  const intro = many([
    group('Assurances Exempla', ['Ali Un', 'Bea Deux']),
    group('Exempla Média', ['Cyr Trois']),
  ])
  const html = render(intro, true)
  const secs = sections(html)

  it('one section per company, each labelled by its own h2 with a unique id', () => {
    expect(secs).toHaveLength(2)
    const ids = secs.map((s) => s.labelledBy)
    expect(new Set(ids).size).toBe(2)
    secs.forEach((s, i) => {
      const label = intro.groups[i].companyLabel
      expect(s.body).toContain(`<h2 id="${s.labelledBy}"`)
      expect(s.body).toContain(esc(introducersHeading(label)))
      expect(s.body).toContain(esc(introducersCountLine(intro.groups[i].total, label)))
    })
    // Same levels as found: an h2 per company, an h3 per person card, nothing else.
    expect(count(html, '<h2')).toBe(2)
    expect(count(html, '<h3')).toBe(3)
    expect(html).not.toMatch(/<h[14-6][ >]/)
  })

  it('intro line once, before the first section; no overflow line', () => {
    expect(count(html, esc(foundManyIntro(2, 2)))).toBe(1)
    expect(html.indexOf(esc(foundManyIntro(2, 2)))).toBeLessThan(html.indexOf('<section'))
    expect(html).not.toContain('autre entreprise')
    expect(html).not.toContain('autres entreprises')
  })

  it('the sample badge once, above the first section', () => {
    expect(count(html, 'Contacts d&#x27;exemple (fictifs)')).toBe(1)
    expect(html.indexOf('Contacts d&#x27;exemple')).toBeLessThan(html.indexOf('<section'))
  })

  it('only the first heading is the focus target, described by the intro line', () => {
    expect(count(html, 'tabindex="-1"')).toBe(1)
    const introId = html.match(/<p id="([^"]+)"[^>]*>Le nom que vous citez/)[1]
    expect(secs[0].body).toMatch(new RegExp(`<h2 id="${secs[0].labelledBy}" tabindex="-1" aria-describedby="${introId}"`))
    expect(secs[1].body).not.toContain('aria-describedby')
  })

  it("each company's cards stay in its own section, in the lib's order, with a draft button", () => {
    expect(secs[0].body).toContain('Ali Un')
    expect(secs[0].body).toContain('Bea Deux')
    expect(secs[0].body).not.toContain('Cyr Trois')
    expect(secs[1].body).toContain('Cyr Trois')
    expect(secs[0].body.indexOf('Ali Un')).toBeLessThan(secs[0].body.indexOf('Bea Deux'))
    expect(count(secs[0].body, 'Préparer un message')).toBe(2)
    expect(count(secs[1].body, 'Préparer un message')).toBe(1)
  })

  it('no badge with the user’s own file', () => {
    expect(render(intro, false)).not.toContain('Contacts d&#x27;exemple')
  })
})

describe('IntroducersSection, found_many with 3 groups and overflow', () => {
  const intro = many(
    [group('Foulia Démo', ['Ali Un'], 25), group("L'Atelier Démo", ['Bea Deux']), group('Oasis Capital Démo', ['Cyr Trois'])],
    7,
  )
  const html = render(intro, true)
  const secs = sections(html)

  it('three sections in order, unique ids, intro line with « Voici les 3 »', () => {
    expect(secs).toHaveLength(3)
    expect(new Set(secs.map((s) => s.labelledBy)).size).toBe(3)
    const headings = secs.map((s) => s.body.match(/<h2[^>]*>([^<]*)<\/h2>/)[1])
    expect(headings).toEqual(intro.groups.map((g) => esc(introducersHeading(g.companyLabel))))
    expect(html).toContain(esc(foundManyIntro(7, 3)))
    // The count line uses each group's own total (« Plus de 20 » for 25).
    expect(secs[0].body).toContain('Plus de 20 personnes de votre réseau travaillent chez Foulia Démo')
  })

  it('overflow line once, after the last section', () => {
    const overflow = esc(foundManyOverflow(4))
    expect(count(html, overflow)).toBe(1)
    expect(html.indexOf(overflow)).toBeGreaterThan(html.lastIndexOf('</section>'))
  })

  it('singular overflow with one company left out', () => {
    const one = render(many(intro.groups, 4))
    expect(one).toContain(esc(foundManyOverflow(1)))
  })
})

describe('IntroducersSection, other statuses', () => {
  it('found: one section with a unique id, the badge inside it', () => {
    const html = render({ status: 'found', companyLabel: 'Atlas Conseil', people: [person('s01', 'Ali Un', 'Atlas Conseil')], total: 1, groups: [], groupsTotal: 0 }, true)
    const secs = sections(html)
    expect(secs).toHaveLength(1)
    expect(secs[0].body).toContain('Contacts d&#x27;exemple')
    expect(secs[0].body).toContain(`<h2 id="${secs[0].labelledBy}" tabindex="-1"`)
    expect(html).not.toContain('Le nom que vous citez')
  })

  it('no_company and an empty found_many render nothing', () => {
    expect(render({ status: 'no_company', companyLabel: null, people: [], total: 0, groups: [], groupsTotal: 0 })).toBe('')
    expect(render(many([]))).toBe('')
  })
})
