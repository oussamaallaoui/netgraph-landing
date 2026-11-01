import { describe, expect, it } from 'vitest'
import { MAX_INTRODUCERS, MENTION_CUES, introducers } from './introducers.js'
import { MAX_REQUEST_LENGTH, buildIndex } from './match.js'
import { INTRODUCER_CONTACTS } from './fixtures/introducer-contacts.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'

const NBSP = ' '
const sample = buildIndex(SAMPLE_CONTACTS)
const qa = buildIndex([...SAMPLE_CONTACTS, ...INTRODUCER_CONTACTS])

const ids = (r) => r.people.map((p) => p.contact.id)
const person = (id, firstName, lastName, company, position = 'Analyste') =>
  ({ id, firstName, lastName, fullName: `${firstName} ${lastName}`.trim(), company, position })

const NO_COMPANY = { status: 'no_company', companyLabel: null, people: [], total: 0 }
const notFound = (companyLabel) => ({ status: 'not_found', companyLabel, people: [], total: 0 })

describe('introducers: known company (found)', () => {
  it.each([
    'Rencontrer le DAF de Atlas Conseil',
    "Rencontrer le DAF d'Atlas Conseil",
    'Rencontrer le DAF d’Atlas Conseil',
    'rencontrer la daf d atlas conseil',
    'RENCONTRER LE DAF D’ATLAS CONSEIL',
    'chez ATLAS CONSEIL SA',
  ])('« %s » → s01, s02, s03 sorted by name, label « Atlas Conseil »', (request) => {
    const r = introducers(request, sample)
    expect(r.status).toBe('found')
    expect(r.companyLabel).toBe('Atlas Conseil') // ×2 beats « ATLAS CONSEIL SA » ×1
    expect(ids(r)).toEqual(['s03', 's01', 's02']) // Nadia Fictif, Sara Démo, Youssef Exemple
    expect(r.total).toBe(3)
  })

  it.each([
    "Être présenté à quelqu'un chez Fictiva Banque",
    "etre presente a quelqu'un chez fictiva banque",
    'Le directeur des risques de FICTIVA BANQUE',
  ])('« %s » → s04, s05, s22, label « Fictiva Banque »', (request) => {
    const r = introducers(request, sample)
    expect(r).toMatchObject({ status: 'found', companyLabel: 'Fictiva Banque', total: 3 })
    expect(ids(r)).toEqual(['s22', 's05', 's04']) // Badr, Hanane, Karim
  })

  it('« chez Oasis Capital Démo SARL » → s12, s13, s30, label without the suffix', () => {
    const r = introducers('Être présenté chez Oasis Capital Démo SARL', sample)
    expect(r).toMatchObject({ status: 'found', companyLabel: 'Oasis Capital Démo', total: 3 })
    expect(ids(r)).toEqual(['s12', 's30', 's13']) // Adam, Samir, Yasmine
  })

  it('« chez Atlasia » finds a contact at « Atlasia & Co »', () => {
    const r = introducers('Rencontrer quelqu’un chez Atlasia', qa)
    expect(r).toMatchObject({ status: 'found', companyLabel: 'Atlasia & Co', total: 1 })
    expect(ids(r)).toEqual(['i01'])
    expect(introducers('le DAF d’Atlasia & Co', qa)).toMatchObject({ status: 'found', companyLabel: 'Atlasia & Co' })
  })

  it("« chez L'Atelier Démo »: elision, accents and suffix variants, most frequent spelling wins", () => {
    for (const request of ["chez L'Atelier Démo", 'chez l’atelier demo', 'chez Atelier Démo']) {
      const r = introducers(request, qa)
      expect(r, request).toMatchObject({ status: 'found', companyLabel: "L'Atelier Démo", total: 3 })
      expect(ids(r), request).toEqual(['i04', 'i03', 'i02']) // Ayoub, Élodie, Malik
    }
  })

  it('a label tie goes to the first spelling in file order', () => {
    const idx = buildIndex([person('a', 'Zed', 'Un', 'NOVA DÉMO SA'), person('b', 'Ali', 'Deux', 'Nova Démo')])
    expect(introducers('chez Nova Démo', idx).companyLabel).toBe('NOVA DÉMO SA')
  })

  it('a label tie goes to the first spelling in file order, even when the other one reaches the count first', () => {
    const idx = buildIndex([
      person('a', 'Ali', 'Un', 'Zeta Démo'),
      person('b', 'Bea', 'Deux', 'ZETA DÉMO'),
      person('c', 'Cyr', 'Trois', 'ZETA DÉMO'),
      person('d', 'Dan', 'Quatre', 'Zeta Démo'),
    ])
    expect(introducers('chez Zeta Démo', idx).companyLabel).toBe('Zeta Démo')
    const sorted = buildIndex([
      person('a', 'Ali', 'Un', 'Zeta Démo'),
      person('b', 'Bea', 'Deux', 'Zeta Démo'),
      person('c', 'Cyr', 'Trois', 'ZETA DÉMO'),
      person('d', 'Dan', 'Quatre', 'ZETA DÉMO'),
    ])
    expect(introducers('chez Zeta Démo', sorted).companyLabel).toBe('Zeta Démo')
  })

  it('the label is trimmed', () => {
    const idx = buildIndex([person('a', 'Ali', 'Un', '  Nova Démo  ')])
    expect(introducers('chez Nova Démo', idx).companyLabel).toBe('Nova Démo')
  })

  it('takes the first company in request order when two are named', () => {
    expect(introducers('chez Atlas Conseil et Fictiva Banque', sample).companyLabel).toBe('Atlas Conseil')
    expect(introducers('chez Fictiva Banque ou Atlas Conseil', sample).companyLabel).toBe('Fictiva Banque')
  })

  it('a known company is found even without a cue', () => {
    expect(introducers('Atlas Conseil recrute un DAF', sample)).toMatchObject({ status: 'found', companyLabel: 'Atlas Conseil' })
  })

  it('a known company wins over an unknown one named earlier', () => {
    expect(introducers('chez Zéroboîte, ou bien chez Atlas Conseil', sample).status).toBe('found')
  })

  it('people are the same objects as in the index, each with the introducer sentence', () => {
    const r = introducers('chez Atlas Conseil', sample)
    expect(r.people[0].contact).toBe(SAMPLE_CONTACTS[2])
    expect(r.people.map((p) => p.why)).toEqual([
      `Nadia travaille chez Atlas Conseil${NBSP}: vous pouvez lui demander de vous orienter vers la bonne personne ou de vous présenter.`,
      `Sara travaille chez Atlas Conseil${NBSP}: vous pouvez lui demander de vous orienter vers la bonne personne ou de vous présenter.`,
      // s02's own spelling is « ATLAS CONSEIL SA »: the sentence uses the section label.
      `Youssef travaille chez Atlas Conseil${NBSP}: vous pouvez lui demander de vous orienter vers la bonne personne ou de vous présenter.`,
    ])
    for (const p of r.people) expect(p.why).not.toMatch(/\b(il|elle)\b/)
  })

  it('sorts by full name with French collation, then id', () => {
    const idx = buildIndex([
      person('c', 'Émile', 'Démo', 'Nova Démo'),
      person('b', 'Eva', 'Démo', 'Nova Démo'),
      person('a2', 'Adam', 'Démo', 'Nova Démo'),
      person('a1', 'Adam', 'Démo', 'Nova Démo'),
      person('z', 'zoé', 'Démo', 'Nova Démo'),
    ])
    expect(ids(introducers('chez Nova Démo', idx))).toEqual(['a1', 'a2', 'c', 'b', 'z'])
  })

  it(`lists at most ${MAX_INTRODUCERS} people, with the total before the cap`, () => {
    const r = introducers('Être présenté à quelqu’un chez Foulia Démo', qa)
    expect(r.status).toBe('found')
    expect(r.companyLabel).toBe('Foulia Démo')
    expect(r.total).toBe(25)
    expect(r.people).toHaveLength(MAX_INTRODUCERS)
    const all = INTRODUCER_CONTACTS.filter((c) => /foulia/i.test(c.company)).map((c) => c.fullName)
    const firstTwenty = [...all].sort(new Intl.Collator('fr').compare).slice(0, 20)
    expect(r.people.map((p) => p.contact.fullName)).toEqual(firstTwenty)
  })

  it('only uses the first 300 characters, like match()', () => {
    const pad = 'a'.repeat(MAX_REQUEST_LENGTH)
    expect(introducers(`${pad} chez Atlas Conseil`, sample)).toEqual(NO_COMPANY)
    expect(introducers(`chez Atlas Conseil ${pad}`, sample).status).toBe('found')
  })
})

describe('introducers: generic company names', () => {
  it('« Finance Conseil » without a cue opens no section', () => {
    expect(introducers('Trouver un DAF finance conseil', qa)).toEqual(NO_COMPANY)
    expect(introducers('Finance conseil pour PME', qa)).toEqual(NO_COMPANY)
  })

  it.each([
    'chez Finance Conseil',
    'chez la Finance Conseil',
    'Rencontrer le DAF de Finance Conseil',
    'Quelqu’un au sein de Finance Conseil',
  ])('« %s » → found (right after a cue)', (request) => {
    expect(introducers(request, qa)).toMatchObject({ status: 'found', companyLabel: 'Finance Conseil', total: 1 })
  })

  it('a generic mention without a cue does not hide a later real company', () => {
    expect(introducers('Finance conseil : qui chez Atlas Conseil ?', qa).companyLabel).toBe('Atlas Conseil')
  })
})

describe('introducers: unknown company (not_found)', () => {
  it('R12 → « Zéroboîte Industries », nobody listed', () => {
    expect(introducers("Être présenté à quelqu'un chez Zéroboîte Industries", sample)).toEqual(notFound('Zéroboîte Industries'))
  })

  it.each([
    ['chez Zéroboîte Industries.', 'Zéroboîte Industries'],
    ['Le DAF de Zéroboîte', 'Zéroboîte'],
    ["Le DAF d'Imaginaria Démo", 'Imaginaria Démo'],
    ['Le directeur financier de Zéroboîte', 'Zéroboîte'],
    ['Le directeur des achats de Zéroboîte', 'Zéroboîte'],
    ["Quelqu'un de Zéroboîte", 'Zéroboîte'],
    ['quelqu un de Zéroboîte Labs', 'Zéroboîte Labs'],
    ["Travailler au sein d'Imaginaria", 'Imaginaria'],
    ['au sein de la Zéroboîte', 'Zéroboîte'],
    ['Find someone at Zeroboite Labs', 'Zeroboite Labs'],
    ['chez 3D Démo Studio', '3D Démo Studio'],
    ['chez Zéroboîte, pour une mission', 'Zéroboîte'],
    ['chez Zéroboîte pour une mission', 'Zéroboîte'],
    ["chez L'Oréal Démo", "L'Oréal Démo"],
    ['  chez   Zéroboîte   Industries  ', 'Zéroboîte   Industries'],
  ])('« %s » → « %s »', (request, label) => {
    expect(introducers(request, sample)).toEqual(notFound(label))
  })

  it('a partial name of a known company shows nothing rather than the « absent » notice (PO, #7)', () => {
    for (const request of ["Être présentée à quelqu'un chez ATLAS", 'chez Atlas', 'chez Oasis', 'chez Oasis Capital', 'le DAF de Fictiva SA']) {
      expect(introducers(request, sample), request).toEqual(NO_COMPANY)
    }
    expect(introducers("Être présenté à quelqu'un chez Zéroboîte Industries", sample)).toEqual(notFound('Zéroboîte Industries'))
    expect(introducers('chez Atlas Zéroboîte', sample)).toEqual(notFound('Atlas Zéroboîte'))
    // « Atlasia » is not the word « atlas »: not_found on the sample, found when the file has it.
    expect(introducers('chez Atlasia', sample)).toEqual(notFound('Atlasia'))
    expect(introducers('chez Atlasia', qa)).toMatchObject({ status: 'found', companyLabel: 'Atlasia & Co' })
  })

  it('stops a name after 6 words', () => {
    expect(introducers('chez Alpha Beta Gamma Delta Epsilon Zeta Eta Theta', sample).companyLabel)
      .toBe('Alpha Beta Gamma Delta Epsilon Zeta')
  })

  it('keeps a long name as typed (the UI applies the 40-character rule)', () => {
    const r = introducers('chez Zéroboîte Industries Internationales Méditerranée Holding', sample)
    expect(r.companyLabel).toBe('Zéroboîte Industries Internationales Méditerranée Holding')
    expect(r.companyLabel.length).toBeGreaterThan(40)
  })
})

describe('introducers: no company', () => {
  it.each([
    'Trouver ma prochaine mission de conseil en finance', // R1
    'Recruter un auditeur financier', // R8
    'Trouver un CFO pour une mission de transition',
    'Find a partner at a private equity fund',
    "Vendre une solution aux achats d'un industriel",
    'Responsable achats d’un industriel',
    'chez moi',
    'Venez chez nous',
    'chez eux, demain',
    'chez un cabinet de conseil',
    'chez une banque',
    'chez des investisseurs',
    // Amended contract (tech lead review on PR #25): uppercase start, possessives, no « quelqu'un à X ».
    'Trouver un chef de projet',
    'responsable de la communication',
    "responsable d'agence",
    'DAF de la région',
    "quelqu'un de confiance",
    'Someone good at negotiation',
    'chez mon ancien employeur',
    'chez nos clients',
    'au sein de ma boîte',
    'Au sein de Ma Boîte',
    'chez Mon Ancien Employeur',
    "quelqu'un à Rabat",
    'Quelqu’un à Zéroboîte Labs',
    'chez zéroboîte industries',
    'chez le DAF',
    'chez',
    'chez.',
    'chez, Zéroboîte',
    'au sein de',
    '',
    '   ',
  ])('« %s »', (request) => {
    expect(introducers(request, sample)).toEqual(NO_COMPANY)
  })

  it('a non-string request or a bad index gives no_company and never throws', () => {
    for (const request of [null, undefined, 42, {}, ['chez Atlas Conseil']]) {
      expect(introducers(request, sample)).toEqual(NO_COMPANY)
    }
    for (const index of [null, undefined, {}, [], 'index', { entries: [], companies: {} }]) {
      expect(introducers('chez Atlas Conseil', index)).toEqual(NO_COMPANY)
    }
  })

  it('an empty file names nobody: a company after a cue is not_found', () => {
    expect(introducers('chez Atlas Conseil', buildIndex([]))).toEqual(notFound('Atlas Conseil'))
  })
})

describe('MENTION_CUES', () => {
  it('is a frozen list covering the contract cues', () => {
    expect(Object.isFrozen(MENTION_CUES)).toBe(true)
    const words = MENTION_CUES.filter((c) => c.words).map((c) => c.words.join(' '))
    expect(words).toEqual(expect.arrayContaining(['chez', 'au sein', 'at']))
    expect(MENTION_CUES.some((c) => c.role)).toBe(true)
  })
})
