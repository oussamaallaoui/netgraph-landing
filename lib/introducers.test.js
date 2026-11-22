import { describe, expect, it } from 'vitest'
import { MAX_GROUPS, MAX_INTRODUCERS, MENTION_CUES, introducers } from './introducers.js'
import { MAX_REQUEST_LENGTH, buildIndex, match } from './match.js'
import { REFERENCE_REQUESTS } from './fixtures/reference-requests.js'
import { STOPWORDS, scan } from './text.js'
import { INTRODUCER_CONTACTS } from './fixtures/introducer-contacts.js'
import { makeSyntheticContacts } from './fixtures/synthetic.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'

const NBSP = ' '
const sample = buildIndex(SAMPLE_CONTACTS)
const qa = buildIndex([...SAMPLE_CONTACTS, ...INTRODUCER_CONTACTS])

const ids = (r) => r.people.map((p) => p.contact.id)
const person = (id, firstName, lastName, company, position = 'Analyste') =>
  ({ id, firstName, lastName, fullName: `${firstName} ${lastName}`.trim(), company, position })

const unrelated = buildIndex([person('u1', 'Ali', 'Témoin', 'Kappa Nova')])

const NO_COMPANY = { status: 'no_company', companyLabel: null, people: [], total: 0, groups: [], groupsTotal: 0 }
const notFound = (companyLabel) => ({ status: 'not_found', companyLabel, people: [], total: 0, groups: [], groupsTotal: 0 })

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

  it.each(['SARL', 'SA', 'SAS', 'Co', 'Ltd', 'Inc', '& Co'])(
    '#22: « chez Oasis Capital Démo %s » opens the same section, with the same people, as without the suffix',
    (suffix) => {
      const plain = introducers("Rencontrer quelqu'un chez Oasis Capital Démo", sample)
      const suffixed = introducers(`Rencontrer quelqu'un chez Oasis Capital Démo ${suffix}`, sample)
      expect(suffixed).toEqual(plain)
      expect(suffixed).toMatchObject({ status: 'found', companyLabel: 'Oasis Capital Démo', total: 3 })
    },
  )

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
    // An index whose company keys share no word with these names (#35 invariant).
    expect(introducers(request, unrelated)).toEqual(notFound(label))
  })

  it('on the sample, a name containing « Démo » (a word of several company keys) is never « absent »', () => {
    for (const request of ["chez L'Oréal Démo", 'chez 3D Démo Studio', "Le DAF d'Imaginaria Démo"]) {
      expect(introducers(request, sample), request).toEqual(NO_COMPANY)
    }
    expect(introducers('chez Zéroboîte Industries.', sample)).toEqual(notFound('Zéroboîte Industries'))
  })

  it('a name sharing a word with a known company is never « absent » (#35 invariant)', () => {
    expect(introducers("Être présenté à quelqu'un chez Zéroboîte Industries", sample)).toEqual(notFound('Zéroboîte Industries'))
    // « atlas » is a word of « atlas conseil », « zeroboite » is not: no section, no notice.
    expect(introducers('chez Atlas Zéroboîte', sample)).toEqual(NO_COMPANY)
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

describe('introducers: short company name (#35)', () => {
  const groupIds = (r) => r.groups.map((g) => g.people.map((p) => p.contact.id))

  it.each([
    "Rencontrer quelqu'un chez ATLAS",
    'chez Atlas',
    'chez Atlas SA',
    'chez ATLAS SARL',
    'chez SARL Atlas',
    'Le DAF de Atlas',
  ])('« %s » opens the same section, with the same people, as « chez Atlas Conseil »', (request) => {
    const full = introducers("Rencontrer quelqu'un chez Atlas Conseil", sample)
    expect(full).toMatchObject({ status: 'found', companyLabel: 'Atlas Conseil', total: 3, groups: [], groupsTotal: 0 })
    expect(introducers(request, sample)).toEqual(full)
  })

  it.each([
    ['chez Oasis', 'Oasis Capital Démo'],
    ['chez Oasis Capital', 'Oasis Capital Démo'],
    ['chez SARL Oasis', 'Oasis Capital Démo'], // QA note on #40: a legal form typed before the name
    ['chez Capital Oasis', 'Oasis Capital Démo'], // whole words, any order
    ['le DAF de Fictiva SA', 'Fictiva Banque'],
    ['chez Fictiva', 'Fictiva Banque'],
    ['chez Medinova', 'Medinova Démo'],
  ])('« %s » → found « %s »', (request, label) => {
    const r = introducers(request, sample)
    expect(r).toMatchObject({ status: 'found', companyLabel: label, groups: [], groupsTotal: 0 })
    expect(r).toEqual(introducers(`chez ${label}`, sample))
  })

  it('a short name shared by two companies → found_many, each person only in their own company', () => {
    const r = introducers("Rencontrer quelqu'un chez Exempla", sample)
    expect(r).toMatchObject({ status: 'found_many', companyLabel: null, people: [], total: 0, groupsTotal: 2 })
    expect(r.groups.map((g) => [g.companyLabel, g.total])).toEqual([['Assurances Exempla', 2], ['Exempla Média', 1]])
    expect(groupIds(r)).toEqual([['s19', 's18'], ['s29']]) // Sofia Prête-Nom, Tarik Mannequin; Lina Spécimen
    for (const g of r.groups) {
      // A group is exactly the `found` section of its company.
      const { companyLabel, people, total } = introducers(`chez ${g.companyLabel}`, sample)
      expect(g).toEqual({ companyLabel, people, total })
      for (const p of g.people) {
        expect(p.contact.company.toLowerCase()).toContain('exempla')
        expect(p.why).toContain(`chez ${g.companyLabel}`)
      }
    }
  })

  it(`at most ${MAX_GROUPS} groups, sorted by total then label; groupsTotal counts every company`, () => {
    expect(MAX_GROUPS).toBe(3)
    const r = introducers('chez Démo', qa)
    expect(r.status).toBe('found_many')
    // oasis capital demo, medinova demo, universite demo, startup lab demo, logistica demo, atelier demo, foulia demo
    expect(r.groupsTotal).toBe(7)
    expect(r.groups.map((g) => [g.companyLabel, g.total])).toEqual([
      ['Foulia Démo', 25],
      ["L'Atelier Démo", 3],
      ['Oasis Capital Démo', 3],
    ])
    expect(r.groups[0].people).toHaveLength(MAX_INTRODUCERS)
  })

  it('ties on total are broken by label with French collation', () => {
    const idx = buildIndex([
      person('a', 'Ali', 'Un', 'Zeta Nova'),
      person('b', 'Bea', 'Deux', 'Élan Nova'),
      person('c', 'Cyr', 'Trois', 'Alpha Nova'),
    ])
    const r = introducers('chez Nova', idx)
    expect(r.groups.map((g) => g.companyLabel)).toEqual(['Alpha Nova', 'Élan Nova', 'Zeta Nova'])
    expect(r.groupsTotal).toBe(3)
  })

  it('a word the user types for a known company still wins: rule 1 before the short-name rule', () => {
    expect(introducers('chez Exempla Média', sample)).toMatchObject({ status: 'found', companyLabel: 'Exempla Média', total: 1 })
  })

  it.each(['chez Finance', 'chez Conseil', 'chez Finance SA', 'chez Conseil SARL', 'Rencontrer quelqu’un chez Finance'])(
    'generic word « %s » → no_company, as today',
    (request) => {
      expect(introducers(request, qa)).toEqual(NO_COMPANY)
      expect(introducers(request, sample)).toEqual(NO_COMPANY)
    },
  )

  it('lowercase short names after « chez » are names since #49 (see « #49 — lowercase names »)', () => {
    expect(introducers('chez atlas', sample)).toEqual(introducers('chez Atlas', sample))
  })

  it('an absent short name → not_found with the name as typed', () => {
    expect(introducers('chez Zéroboîte', sample)).toEqual(notFound('Zéroboîte'))
    expect(introducers('chez Imaginaria', sample)).toEqual(notFound('Imaginaria'))
    // No company of this file is spelled with « SARL »: the legal form stays in the label.
    expect(introducers('chez SARL Zéroboîte', unrelated)).toEqual(notFound('SARL Zéroboîte'))
    expect(introducers('chez Zéroboîte SARL', unrelated)).toEqual(notFound('Zéroboîte SARL'))
  })

  it('AC 4: a legal form of the name spelled in a company of the file (« Oasis Capital Démo SARL ») → no_company, not « absent »', () => {
    for (const index of [sample, qa]) {
      for (const request of ['chez SARL Zéroboîte', 'chez Zéroboîte SARL', 'Le DAF de Zéroboîte SARL']) {
        expect(introducers(request, index), request).toEqual(NO_COMPANY)
      }
    }
    // « SA » is spelled in « ATLAS CONSEIL SA » (sample) and « FOULIA DÉMO SA » (QA file).
    expect(introducers('chez Zéroboîte SA', sample)).toEqual(NO_COMPANY)
    // The section rule is unchanged: a legal form is still dropped from the short name.
    expect(introducers('chez SARL Oasis', qa)).toMatchObject({ status: 'found', companyLabel: 'Oasis Capital Démo' })
  })

  it('invariant (AC 4): for every QA reference request, not_found never coexists with a match() reason citing a word of the name', () => {
    const requests = [
      ...REFERENCE_REQUESTS.map((r) => r.request),
      "Rencontrer quelqu'un chez ATLAS", 'chez Atlas', 'chez Oasis', 'chez Oasis Capital', 'chez SARL Oasis Capital Démo',
      'chez SARL Oasis', 'chez Atlas Zéroboîte', 'chez Exempla', 'chez Finance', "chez L'Oréal Démo", 'chez 3D Démo Studio',
      'chez Zéroboîte Industries', 'chez Atlasia', 'chez Fictiva SA', 'Le DAF de Capital Zéroboîte',
      'chez SARL Zéroboîte', 'chez Zéroboîte SARL', 'chez Zéroboîte SA',
    ]
    let checked = 0
    for (const index of [sample, qa]) {
      for (const request of requests) {
        const r = introducers(request, index)
        if (r.status !== 'not_found') continue
        checked++
        // The name's own words: normalised, stopwords dropped, legal forms kept (« Zéroboîte SARL »).
        const nameWords = new Set(scan(r.companyLabel).map((t) => t.norm).filter((w) => !STOPWORDS.has(w)))
        for (const m of match(request, index).results) {
          for (const reason of m.reasons) {
            const cited = scan(reason.label).map((t) => t.norm)
            expect(cited.some((w) => nameWords.has(w)), `${request} / ${reason.label}`).toBe(false)
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0) // R12 « Zéroboîte Industries » at least
  })

  it('every result carries groups and groupsTotal', () => {
    for (const request of ['chez Atlas Conseil', 'chez Zéroboîte', 'Recruter un auditeur financier', 'chez Exempla']) {
      const r = introducers(request, sample)
      expect(Array.isArray(r.groups), request).toBe(true)
      expect(typeof r.groupsTotal, request).toBe('number')
      if (r.status !== 'found_many') expect([r.groups, r.groupsTotal]).toEqual([[], 0])
    }
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

describe('#49 — lowercase names', () => {
  const synthetic = buildIndex(makeSyntheticContacts(2000))

  it('« chez atlas » gives the same result as « chez ATLAS »', () => {
    const upper = introducers("Rencontrer quelqu'un chez ATLAS", sample)
    expect(upper).toMatchObject({ status: 'found', companyLabel: 'Atlas Conseil' })
    expect(introducers("Rencontrer quelqu'un chez atlas", sample)).toEqual(upper)
  })

  it.each([
    ['oasis', 'Oasis', 'found'],
    ['exempla', 'Exempla', 'found_many'],
    ['démo', 'Démo', 'found_many'],
  ])('« chez %s » gives the same result as « chez %s » (%s)', (lower, capitalised, status) => {
    const upper = introducers(`Rencontrer quelqu'un chez ${capitalised}`, sample)
    expect(upper.status).toBe(status)
    expect(introducers(`Rencontrer quelqu'un chez ${lower}`, sample)).toEqual(upper)
  })

  it('« chez sarl oasis » gives the same result as « chez SARL Oasis »', () => {
    const upper = introducers('chez SARL Oasis', sample)
    expect(upper).toMatchObject({ status: 'found', companyLabel: 'Oasis Capital Démo' })
    expect(introducers('chez sarl oasis', sample)).toEqual(upper)
  })

  it.each([
    'chez finance',
    'chez moi',
    'chez nous',
    // Would open a section with the naive fix (tech lead's measure on #49): article or « l' » first.
    'chez le lab',
    "chez l'université",
    'chez les assurances',
    'chez le média',
  ])('« %s » → no_company', (request) => {
    expect(introducers(request, sample)).toEqual(NO_COMPANY)
  })

  it('« chez les assurances » → no_company on 2,000 synthetic contacts', () => {
    expect(introducers('chez les assurances', synthetic)).toEqual(NO_COMPANY)
  })

  it('a lowercase name that matches no company → no_company, never the « absent » notice', () => {
    expect(introducers('chez zéroboîte industries', sample)).toEqual(NO_COMPANY)
    expect(introducers('chez coiffeur', sample)).toEqual(NO_COMPANY)
    expect(introducers('chez Zéroboîte Industries', sample)).toEqual(notFound('Zéroboîte Industries'))
  })

  it("only « chez » accepts a lowercase name: « quelqu'un de » and « at » still need an uppercase letter", () => {
    const idx = buildIndex([person('c1', 'Ali', 'Témoin', 'Confiance Capital'), person('c2', 'Bea', 'Essai', 'Atlas Conseil')])
    expect(introducers("Rencontrer quelqu'un de confiance", idx)).toEqual(NO_COMPANY)
    expect(introducers('someone at atlas', idx)).toEqual(NO_COMPANY)
    expect(introducers('someone at Atlas', idx)).toMatchObject({ status: 'found', companyLabel: 'Atlas Conseil' })
    expect(introducers('chez confiance', idx)).toEqual(introducers('chez Confiance', idx))
    expect(introducers('chez confiance', idx)).toMatchObject({ status: 'found', companyLabel: 'Confiance Capital' })
  })

  it.each([
    ['Un contact chez orange ou chez Atlas', 'chez Atlas'],
    ["quelqu'un chez coiffeur, chez Atlas", 'chez Atlas'],
    ['chez total ou chez Oasis', 'chez Oasis'],
  ])('« %s »: a lowercase ordinary word does not hide a company named later (= « %s »)', (request, alone) => {
    const expected = introducers(alone, sample)
    expect(expected.status).toBe('found')
    expect(introducers(request, sample)).toEqual(expected)
  })

  it('« chez coiffeur, chez Zéroboîte » → not_found for the capitalised name, as before #49', () => {
    expect(introducers('chez coiffeur, chez Zéroboîte', sample)).toEqual(notFound('Zéroboîte'))
  })

  // False-positive measure on #49: 80 ordinary lowercase phrases after « chez » (the 55 of the
  // tech lead's measure and 25 from the dev): pronouns, possessives, indefinites, articles,
  // « l' », vocabulary and everyday words.
  const ORDINARY = [
    'moi', 'nous', 'vous', 'eux', 'lui', 'elle', 'elles', 'toi', 'soi',
    'mon employeur', 'mon ancien employeur', 'ma boîte', 'mes parents', 'notre client', 'nos clients',
    'votre cabinet', 'leur banque', 'ses amis',
    'un cabinet de conseil', 'une startup', 'des investisseurs', 'un ami', 'une banque',
    'le client', 'la banque', 'le médecin', 'le dentiste', 'le coiffeur', 'le notaire', 'le garage',
    'le boulanger', 'le fournisseur', 'le partenaire', 'le lab', 'le média', 'le groupe', 'la mairie',
    'la poste', 'la clinique', 'la concurrence', 'les assurances', 'les concurrents', 'les impôts',
    "l'école", "l'université", "l'avocat", "l'hôpital", "l'agence",
    'finance', 'conseil', 'audit', 'recrutement', 'total', 'orange', 'maroc',
    "quelqu'un", 'personne', 'les clients', 'un client', 'ma banque', 'les médias', 'nos partenaires',
    'des amis', 'capital', 'le cabinet', 'la startup', 'le fonds', 'la holding', 'le concurrent',
    'eux autres', 'les autres', 'celui-ci', 'quelque part', 'free', 'nova', 'atlantique', 'demain',
    'toujours', 'tout le monde', 'eux-mêmes',
  ]

  it('the list holds 80 distinct phrases', () => {
    expect(ORDINARY).toHaveLength(80)
    expect(new Set(ORDINARY).size).toBe(80)
  })

  it.each(ORDINARY)('« chez %s » opens no section, on the sample and on 2,000 synthetic contacts', (phrase) => {
    for (const request of [`chez ${phrase}`, `Rencontrer quelqu'un chez ${phrase}`]) {
      expect(introducers(request, sample), request).toEqual(NO_COMPANY)
      expect(introducers(request, synthetic), request).toEqual(NO_COMPANY)
    }
  })
})
