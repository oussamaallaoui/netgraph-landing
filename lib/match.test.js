import { describe, expect, it } from 'vitest'
import { MAX_REQUEST_LENGTH, buildIndex, findCompanyMentions, isVocabularyWord, match } from './match.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'
import { makeSyntheticContacts } from './fixtures/synthetic.js'

const index = buildIndex(SAMPLE_CONTACTS)
const ids = (request, options) => match(request, index, options).results.map((r) => r.contact.id)

function person(id, position, company, fullName = `Personne ${id}`) {
  return { id, firstName: 'Personne', lastName: id, fullName, company, position, connectedOn: null, profileUrl: null, email: null, phone: null, sources: ['sample'] }
}

describe('buildIndex', () => {
  it('never throws on bad input', () => {
    for (const bad of [null, undefined, 'x', 42, {}, [null, 1, 'x']]) {
      expect(() => buildIndex(bad)).not.toThrow()
      expect(match('finance', buildIndex(bad)).results).toEqual([])
    }
  })

  it('stores company keys (shared with #7)', () => {
    expect(index.companies.get('atlas conseil')).toEqual([0, 1, 2])
    expect(index.companies.get('fictiva banque')).toEqual([3, 4, 21])
    expect(index.companies.get('oasis capital demo')).toEqual([11, 12, 29])
  })

  it('ignores generic one-word companies when looking for a company in the request', () => {
    const idx = buildIndex([person('a', 'Associé', 'Conseil'), person('b', 'Consultant', 'Cabinet Fictis')])
    expect(idx.mentionable.has('conseil')).toBe(false)
    expect(idx.mentionable.has('cabinet fictis')).toBe(true)
    expect(isVocabularyWord('conseil')).toBe(true)
    expect(isVocabularyWord('fictiva')).toBe(false)
  })
})

describe('findCompanyMentions', () => {
  it('finds known companies, whatever the case, accents or elision', () => {
    for (const request of ["Rencontrer le DAF d'Atlas Conseil", 'rencontrer la daf d atlas conseil', 'chez ATLAS CONSEIL SA']) {
      expect(findCompanyMentions(request, index).map((m) => m.key)).toEqual(['atlas conseil'])
    }
    const [m] = findCompanyMentions("Être présenté à quelqu'un chez Fictiva Banque", index)
    expect(m.surface).toBe('Fictiva Banque')
  })

  it('prefers the longest key', () => {
    const idx = buildIndex([person('a', 'x', 'Fictiva'), person('b', 'y', 'Fictiva Banque')])
    expect(findCompanyMentions('chez Fictiva Banque', idx).map((m) => m.key)).toEqual(['fictiva banque'])
    expect(findCompanyMentions('chez Fictiva', idx).map((m) => m.key)).toEqual(['fictiva'])
  })

  it('finds nothing for unknown companies', () => {
    expect(findCompanyMentions("Être présenté à quelqu'un chez Zéroboîte Industries", index)).toEqual([])
    expect(findCompanyMentions(null, index)).toEqual([])
  })
})

describe('match', () => {
  it('returns ranked results with reasons and a French sentence', () => {
    const { results, requestConcepts } = match('Trouver ma prochaine mission de conseil en finance', index)
    expect(requestConcepts).toEqual(['conseil', 'finance'])
    expect(results.length).toBeGreaterThan(0)
    for (let i = 1; i < results.length; i++) expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    for (const r of results) {
      expect(r.reasons.length).toBeGreaterThanOrEqual(1)
      expect(r.why.trim().length).toBeGreaterThan(0)
      expect(r.why).not.toMatch(/undefined|null| {2}/)
    }
  })

  it('only returns contacts from the input, as the same objects', () => {
    const input = new Set(SAMPLE_CONTACTS)
    for (const request of ['finance', 'directeur financier', 'conseil', 'Atlas', 'banque', 'partner']) {
      for (const r of match(request, index).results) expect(input.has(r.contact)).toBe(true)
    }
  })

  it('never returns more than 10, and honours a smaller limit', () => {
    const many = Array.from({ length: 40 }, (_, i) => person(`p${i}`, 'Directeur financier', 'Fictiva'))
    const idx = buildIndex(many)
    expect(match('finance', idx).results).toHaveLength(10)
    expect(match('finance', idx, { limit: 50 }).results).toHaveLength(10)
    expect(match('finance', idx, { limit: 3 }).results).toHaveLength(3)
    expect(match('finance', idx, { limit: 0 }).results).toHaveLength(0)
    expect(match('finance', idx, { limit: 'x' }).results).toHaveLength(10)
  })

  it('sorts ties by fullName in French order, the same every time', () => {
    const people = [
      person('1', 'Trésorière', null, 'Émilie Zed'),
      person('2', 'Trésorière', null, 'Zoé Alpha'),
      person('3', 'Trésorière', null, 'Eric Beta'),
      person('4', 'Trésorière', null, 'Élodie Alpha'),
    ]
    const idx = buildIndex(people)
    const order = match('trésorerie', idx).results.map((r) => r.contact.fullName)
    expect(order).toEqual(['Élodie Alpha', 'Émilie Zed', 'Eric Beta', 'Zoé Alpha'])
    expect(match('trésorerie', buildIndex([...people].reverse())).results.map((r) => r.contact.fullName)).toEqual(order)
  })

  it('returns [] for an empty, blank, stopword-only, emoji or punctuation request', () => {
    for (const request of ['', '   ', '\n\t', 'je veux trouver', 'the', 'de la', '🚀💼', '???', 'zzzz qqqq', '2026']) {
      expect(ids(request), JSON.stringify(request)).toEqual([])
    }
    for (const bad of [null, undefined, 42, {}]) expect(match(bad, index)).toEqual({ results: [], requestConcepts: [] })
    expect(match('finance', null).results).toEqual([])
  })

  it('never shows a person on seniority or a request-only hint alone (PO, 2026-10-29)', () => {
    expect(ids('directeur')).toEqual([])
    expect(ids('Trouver un directeur')).toEqual([])
    expect(ids('Trouver une mission')).toEqual([])
    expect(ids('mission de transition')).toEqual([])
  })

  it('only reads the first 300 characters', () => {
    const filler = 'x'.repeat(MAX_REQUEST_LENGTH)
    expect(ids(`${filler} finance`)).toEqual([])
    const end = 'finance'
    const atTheEnd = `${'y '.repeat((MAX_REQUEST_LENGTH - end.length) / 2)}${end}`.slice(0, MAX_REQUEST_LENGTH)
    expect(atTheEnd.length).toBeLessThanOrEqual(MAX_REQUEST_LENGTH)
    expect(ids(atTheEnd).length).toBeGreaterThan(0)
  })

  it('understands English requests and answers in French', () => {
    const { results } = match('Find a partner at a private equity fund', index)
    expect(results[0].contact.id).toBe('s06')
    expect(results[0].why).toContain('son poste correspond à')
  })

  it('matches synonyms: DAF, CFO, directeur financier, inclusive writing', () => {
    for (const request of ['DAF', 'daf', 'CFO', 'directeur financier', 'Directeur·rice financier·ère', 'Directrice Financiere']) {
      expect(ids(request).slice(0, 3).sort(), request).toEqual(['s01', 's10', 's26'])
    }
  })

  it('matches fusions-acquisitions with M&A in positions, and M&A typed as « M & A »', () => {
    expect(ids('fusions-acquisitions').slice(0, 2).sort()).toEqual(['s12', 's28'])
    expect(ids('M & A').slice(0, 2).sort()).toEqual(['s12', 's28'])
    const { results } = match('fusions-acquisitions', index)
    expect(results[0].reasons[0]).toEqual({ field: 'position', kind: 'concept', concept: 'ma', label: 'fusions-acquisitions (M&A)' })
  })

  it('finds people at a company named in the request, and cites it', () => {
    expect(ids('Fictiva Banque').sort()).toEqual(['s04', 's05', 's22'])
    expect(ids('Fictiva').sort()).toEqual(['s04', 's05', 's22'])
    const [first] = match('Rencontrer le DAF de Atlas Conseil', index).results
    expect(first.contact.id).toBe('s01')
    expect(first.reasons.map((r) => r.kind)).toEqual(['concept', 'company_mentioned'])
    expect(first.reasons[1]).toEqual({ field: 'company', kind: 'company_mentioned', label: 'Atlas Conseil' })
  })

  it('quotes free words as typed in the request', () => {
    const [r] = match('Actuaire', index).results
    expect(r.contact.id).toBe('s18')
    expect(r.reasons).toEqual([{ field: 'position', kind: 'term', label: 'Actuaire' }])
  })

  it('says « DAF » once, not also « finance »', () => {
    const [r] = match('DAF', index).results
    expect(r.reasons.filter((x) => x.field === 'position').map((x) => x.concept)).toEqual(['cfo'])
  })

  it('only cites what is in the contact position or company', () => {
    for (const request of ['Trouver ma prochaine mission de conseil en finance', 'Lever des fonds pour ma startup fintech', 'Actuaire', 'Fictiva']) {
      for (const r of match(request, index).results) {
        for (const reason of r.reasons) {
          const field = reason.field === 'position' ? r.contact.position : r.contact.company
          expect(field, `${request} → ${r.contact.id}`).toBeTruthy()
        }
      }
    }
  })

  it('works on a large synthetic file and stays inside it', () => {
    const contacts = makeSyntheticContacts(2000)
    const all = new Set(contacts)
    const { results } = match('directeur financier', buildIndex(contacts))
    expect(results).toHaveLength(10)
    for (const r of results) expect(all.has(r.contact)).toBe(true)
  })
})
