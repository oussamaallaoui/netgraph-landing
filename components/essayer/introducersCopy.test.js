import { describe, expect, it } from 'vitest'
import {
  NOTICE_LABEL_MAX,
  SHOWN_MAX,
  introducersCountLine,
  introducersHeading,
  introducersMessage,
  notFoundNotice,
  searchAnnouncement,
  showsIntroducers,
} from './introducersCopy'
import { NO_RESULTS_TITLE, resultsSummary } from './search'
import { buildIndex, match } from '../../lib/match.js'
import { introducers, MAX_INTRODUCERS } from '../../lib/introducers.js'
import { SAMPLE_CONTACTS } from '../../lib/fixtures/sample-contacts.js'
import { EXAMPLE_REQUESTS } from '../../lib/vocabulary.js'

const person = (id) => ({ contact: { id, fullName: id }, why: 'x' })
const found = (n, total = n) => ({
  status: 'found',
  companyLabel: 'Atlas Conseil',
  people: Array.from({ length: n }, (_, i) => person(`p${i}`)),
  total,
})

describe('introducersHeading', () => {
  it('uses the PO heading with the section label', () => {
    expect(introducersHeading('Atlas Conseil')).toBe('Qui peut vous présenter chez Atlas Conseil')
    expect(introducersHeading('  Oasis   Capital Démo ')).toBe('Qui peut vous présenter chez Oasis Capital Démo')
  })
})

describe('introducersCountLine', () => {
  it('singular for one person', () => {
    expect(introducersCountLine(1, 'Atlas Conseil')).toBe(
      "1 personne de votre réseau travaille chez Atlas Conseil d'après votre fichier.",
    )
  })

  it('plural from two people up to the cap', () => {
    expect(introducersCountLine(3, 'Atlas Conseil')).toBe(
      "3 personnes de votre réseau travaillent chez Atlas Conseil d'après votre fichier.",
    )
    expect(introducersCountLine(20, 'Atlas Conseil')).toBe(
      "20 personnes de votre réseau travaillent chez Atlas Conseil d'après votre fichier.",
    )
  })

  it('« Plus de 20 » over the cap', () => {
    expect(introducersCountLine(25, 'Atlas Conseil')).toBe(
      "Plus de 20 personnes de votre réseau travaillent chez Atlas Conseil d'après votre fichier. " +
        'Voici les 20 premières par ordre alphabétique.',
    )
  })

  it('the cap matches lib/introducers.js', () => {
    expect(SHOWN_MAX).toBe(MAX_INTRODUCERS)
  })
})

describe('notFoundNotice', () => {
  const hint = 'Si cette entreprise porte un autre nom dans votre fichier, citez ce nom.'

  it('quotes the company as typed up to 40 characters', () => {
    expect(notFoundNotice('Zéroboîte Industries')).toBe(
      `Aucune personne de votre réseau ne travaille chez Zéroboîte Industries d'après votre fichier. ${hint}`,
    )
    const forty = 'A'.repeat(NOTICE_LABEL_MAX)
    expect(notFoundNotice(forty)).toContain(`chez ${forty} d'après`)
  })

  it('uses the generic wording above 40 characters or when empty', () => {
    const generic = `Aucune personne de votre réseau ne travaille dans l'entreprise que vous citez d'après votre fichier. ${hint}`
    expect(notFoundNotice('A'.repeat(NOTICE_LABEL_MAX + 1))).toBe(generic)
    expect(notFoundNotice('')).toBe(generic)
    expect(notFoundNotice(null)).toBe(generic)
  })
})

describe('introducersMessage / showsIntroducers', () => {
  it('found → count line, not_found → notice, no_company → nothing', () => {
    expect(introducersMessage(found(3))).toBe(introducersCountLine(3, 'Atlas Conseil'))
    expect(introducersMessage({ status: 'not_found', companyLabel: 'Zéroboîte Industries', people: [], total: 0 })).toBe(
      notFoundNotice('Zéroboîte Industries'),
    )
    expect(introducersMessage({ status: 'no_company', companyLabel: null, people: [], total: 0 })).toBeNull()
    expect(introducersMessage(null)).toBeNull()
    expect(showsIntroducers({ status: 'no_company', companyLabel: null, people: [], total: 0 })).toBe(false)
  })

  it('uses total, not the capped list, for the count', () => {
    expect(introducersMessage(found(20, 25))).toMatch(/^Plus de 20 personnes/)
  })

  it('a found result with no people shows nothing (never an empty section)', () => {
    expect(showsIntroducers(found(0, 0))).toBe(false)
  })
})

describe('searchAnnouncement', () => {
  it('is exactly the #6 summary when no company is named (AC 5)', () => {
    const none = { status: 'no_company', companyLabel: null, people: [], total: 0 }
    expect(searchAnnouncement(none, 4)).toBe(resultsSummary(4))
    expect(searchAnnouncement(none, 0)).toBe(NO_RESULTS_TITLE)
  })

  it('puts the introducer line first, then the #6 summary, in one message', () => {
    expect(searchAnnouncement(found(3), 5)).toBe(
      "3 personnes de votre réseau travaillent chez Atlas Conseil d'après votre fichier. " +
        '5 personnes de votre réseau peuvent vous aider',
    )
    const absent = { status: 'not_found', companyLabel: 'Zéroboîte Industries', people: [], total: 0 }
    expect(searchAnnouncement(absent, 0)).toBe(`${notFoundNotice('Zéroboîte Industries')} ${NO_RESULTS_TITLE}`)
  })
})

// The screen relies on these properties of lib/introducers.js on the sample data.
describe('introducer area on the sample data', () => {
  const index = buildIndex(SAMPLE_CONTACTS)
  const ids = (r) => r.people.map((p) => p.contact.id).sort()

  it('R2 « Atlas Conseil »: s01, s02, s03 under the most frequent spelling', () => {
    const r = introducers('Rencontrer le DAF de Atlas Conseil', index)
    expect(r.status).toBe('found')
    expect(ids(r)).toEqual(['s01', 's02', 's03'])
    expect(introducersHeading(r.companyLabel)).toBe('Qui peut vous présenter chez Atlas Conseil')
    expect(introducersMessage(r)).toBe("3 personnes de votre réseau travaillent chez Atlas Conseil d'après votre fichier.")
  })

  it('« chez ATLAS CONSEIL SA » gives the same section', () => {
    const r = introducers('Être présenté chez ATLAS CONSEIL SA', index)
    expect(r.status).toBe('found')
    expect(ids(r)).toEqual(['s01', 's02', 's03'])
    expect(r.companyLabel).toBe('Atlas Conseil')
  })

  it('every introducer sentence is non-empty and gender-neutral', () => {
    const r = introducers('Rencontrer quelqu’un chez Fictiva Banque', index)
    expect(r.people.length).toBeGreaterThan(0)
    for (const { why } of r.people) {
      expect(why.trim().length).toBeGreaterThan(0)
      expect(why).not.toMatch(/\b(il|elle)\b/i)
    }
  })

  it('a company not in the file gives the notice; no company gives nothing', () => {
    const absent = introducers('Rencontrer quelqu’un chez Zéroboîte Industries', index)
    expect(absent.status).toBe('not_found')
    expect(absent.people).toEqual([])
    expect(showsIntroducers(absent)).toBe(true)
    expect(showsIntroducers(introducers('Trouver un DAF', index))).toBe(false)
  })

  it('no example request opens an introducer area (their focus goes to the #6 heading)', () => {
    for (const example of EXAMPLE_REQUESTS) {
      expect(showsIntroducers(introducers(example, index)), example).toBe(false)
    }
    // Sanity: the #6 list is still there for them.
    expect(match('Recruter un auditeur financier', index).results.length).toBeGreaterThan(0)
  })
})
