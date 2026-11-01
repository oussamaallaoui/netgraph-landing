import { describe, expect, it } from 'vitest'
import { introducerWhy, whyText } from './explain.js'

const NBSP = ' '
const q = (s) => `«${NBSP}${s}${NBSP}»`

const sara = { id: 's01', fullName: 'Sara Démo', position: 'Directrice financière', company: 'Atlas Conseil' }
const head = 'Directrice financière chez Atlas Conseil'

const posConcept = (label) => ({ field: 'position', kind: 'concept', concept: 'x', label })
const compConcept = (label) => ({ field: 'company', kind: 'concept', concept: 'x', label })
const posTerm = (label) => ({ field: 'position', kind: 'term', label })
const compTerm = (label) => ({ field: 'company', kind: 'term', label })
const named = (label = 'Atlas Conseil') => ({ field: 'company', kind: 'company_mentioned', label })

describe('whyText (PO copy, 2026-10-31)', () => {
  it('R1 s01: concept in the position and in the company, second verb dropped', () => {
    expect(whyText(sara, [posConcept('finance'), compConcept('conseil')])).toBe(
      `${head} : son poste relève de ${q('finance')} et son entreprise de ${q('conseil')}, comme dans votre demande.`,
    )
  })

  it('R2 s01: the named company comes first, whatever the order of the reasons', () => {
    expect(whyText(sara, [posConcept('direction financière (DAF, CFO)'), named()])).toBe(
      `${head} : son entreprise est celle que vous citez et son poste relève de ${q('direction financière (DAF, CFO)')}, comme dans votre demande.`,
    )
  })

  it('R4 s04: named company alone, no ending', () => {
    const karim = { fullName: 'Karim Essai', position: 'Directeur des risques', company: 'Fictiva Banque' }
    expect(whyText(karim, [named('Fictiva Banque')])).toBe('Directeur des risques chez Fictiva Banque : son entreprise est celle que vous citez.')
  })

  it('R8 s08: two concepts in the position, field said once, no elision', () => {
    const mehdi = { fullName: 'Mehdi Brouillon', position: 'Manager audit financier', company: 'Exemplia Audit' }
    expect(whyText(mehdi, [posConcept('finance'), posConcept('audit')])).toBe(
      `Manager audit financier chez Exemplia Audit : son poste relève de ${q('finance')} et de ${q('audit')}, comme dans votre demande.`,
    )
  })

  it('free words: « contient » for the position and the company name', () => {
    expect(whyText(sara, [posTerm('Directrice')])).toBe(`${head} : son poste contient ${q('Directrice')}, comme dans votre demande.`)
    expect(whyText(sara, [compTerm('Atlas')])).toBe(`${head} : le nom de son entreprise contient ${q('Atlas')}, comme dans votre demande.`)
    expect(whyText(sara, [posTerm('a'), posTerm('b')])).toBe(`${head} : son poste contient ${q('a')} et ${q('b')}, comme dans votre demande.`)
  })

  it('mixed kinds and fields', () => {
    expect(whyText(sara, [posConcept('finance'), posTerm('Directrice')])).toBe(
      `${head} : son poste relève de ${q('finance')} et contient ${q('Directrice')}, comme dans votre demande.`,
    )
    expect(whyText(sara, [posConcept('finance'), compTerm('Atlas')])).toBe(
      `${head} : son poste relève de ${q('finance')} et le nom de son entreprise contient ${q('Atlas')}, comme dans votre demande.`,
    )
    expect(whyText(sara, [compConcept('conseil'), compTerm('Atlas')])).toBe(
      `${head} : son entreprise relève de ${q('conseil')} et son nom contient ${q('Atlas')}, comme dans votre demande.`,
    )
  })

  it('never says « son entreprise » twice with a named company', () => {
    const text = whyText(sara, [named(), compConcept('conseil')])
    expect(text).toBe(`${head} : son entreprise est celle que vous citez et relève de ${q('conseil')}, comme dans votre demande.`)
    expect(text.match(/son entreprise/g)).toHaveLength(1)
  })

  it('cites at most 2 reasons, strongest first, without repeating a label', () => {
    const text = whyText(sara, [posConcept('finance'), posTerm('Finance'), posConcept('audit'), compConcept('conseil')])
    expect(text).toBe(`${head} : son poste relève de ${q('finance')} et de ${q('audit')}, comme dans votre demande.`)
  })

  it('never cites a hint reason (the user did not type it)', () => {
    const hint = { field: 'position', kind: 'concept', concept: 'independant', label: 'indépendant', hint: true }
    expect(whyText(sara, [posConcept('finance'), hint])).toBe(`${head} : son poste relève de ${q('finance')}, comme dans votre demande.`)
    expect(whyText(sara, [hint])).toBe(`${head} : correspond à votre demande.`)
  })

  it('works without a company', () => {
    const ilyas = { fullName: 'Ilyas Cobaye', position: "Consultant indépendant en finance d'entreprise", company: null }
    const text = whyText(ilyas, [posConcept('finance'), named('x')])
    expect(text).toBe(`Consultant indépendant en finance d'entreprise : son poste relève de ${q('finance')}, comme dans votre demande.`)
    expect(text).not.toMatch(/chez|null|undefined/)
  })

  it('works without a position', () => {
    expect(whyText({ fullName: 'A B', position: '', company: 'Fictiva Banque' }, [named('Fictiva Banque')])).toBe(
      'Fictiva Banque : son entreprise est celle que vous citez.',
    )
    expect(whyText({ fullName: 'A B', position: null, company: 'Fictiva Banque' }, [compTerm('Fictiva')])).toBe(
      `Fictiva Banque : le nom de son entreprise contient ${q('Fictiva')}, comme dans votre demande.`,
    )
  })

  it('never returns an empty or broken sentence', () => {
    for (const [contact, reasons] of [[{}, []], [null, null], [{ fullName: 'A B' }, undefined], [{ position: '  x  y ' }, [null]]]) {
      const text = whyText(contact, reasons)
      expect(text.trim().length).toBeGreaterThan(0)
      expect(text).not.toMatch(/undefined|null| {2}/)
    }
    expect(whyText({ position: '  x  y ' }, [])).toBe('x y : correspond à votre demande.')
    expect(whyText({ fullName: 'A B' }, [])).toBe('A B : correspond à votre demande.')
  })
})

describe('introducerWhy (PO copy, Sprint 2 §3)', () => {
  const tail = `${NBSP}: vous pouvez lui demander de vous orienter vers la bonne personne ou de vous présenter.`

  it('uses the first name and the section label, gender-neutral', () => {
    const text = introducerWhy({ ...sara, firstName: 'Sara' }, 'Atlas Conseil')
    expect(text).toBe(`Sara travaille chez Atlas Conseil${tail}`)
    expect(text).not.toMatch(/\b(il|elle)\b/)
  })

  it('uses the section label, not the contact’s own spelling', () => {
    const youssef = { firstName: 'Youssef', fullName: 'Youssef Exemple', company: 'ATLAS CONSEIL SA' }
    expect(introducerWhy(youssef, 'Atlas Conseil')).toBe(`Youssef travaille chez Atlas Conseil${tail}`)
  })

  it('keeps accented and hyphenated first names as written', () => {
    expect(introducerWhy({ firstName: 'Leïla', fullName: 'Leïla Pilote' }, 'Démoventures')).toBe(`Leïla travaille chez Démoventures${tail}`)
    expect(introducerWhy({ firstName: 'Marie-Ève', fullName: 'Marie-Ève Démo' }, 'Nova Démo')).toBe(`Marie-Ève travaille chez Nova Démo${tail}`)
  })

  it('falls back to the full name when the first name is empty', () => {
    expect(introducerWhy({ firstName: '  ', fullName: 'Démo' }, 'Nova Démo')).toBe(`Démo travaille chez Nova Démo${tail}`)
    expect(introducerWhy({ firstName: '', lastName: 'Démo', fullName: ' Démo  Fictif ' }, 'Nova Démo')).toBe(`Démo Fictif travaille chez Nova Démo${tail}`)
  })

  it('puts a no-break space (U+00A0) before « : »', () => {
    const text = introducerWhy({ ...sara, firstName: 'Sara' }, 'Atlas Conseil')
    expect(text).toContain('Conseil : vous')
    expect(text).not.toContain('Conseil :')
  })

  it('never returns an empty or broken sentence', () => {
    for (const [contact, label] of [[{}, ''], [null, null], [undefined, undefined], [{ company: 'Nova Démo' }, '  ']]) {
      const text = introducerWhy(contact, label)
      expect(text.trim().length).toBeGreaterThan(0)
      expect(text).not.toMatch(/undefined|null| {2}/)
    }
    expect(introducerWhy({ company: 'Nova Démo' }, '')).toBe(`Cette personne travaille chez Nova Démo${tail}`)
    expect(introducerWhy({}, '')).toBe(`Cette personne travaille dans cette entreprise${tail}`)
  })
})
