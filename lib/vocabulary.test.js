import { describe, expect, it } from 'vitest'
import { CONCEPTS, EXAMPLE_REQUESTS, SENIORITY_TERMS } from './vocabulary.js'
import { REFERENCE_REQUESTS } from './fixtures/reference-requests.js'
import { tokenize } from './text.js'

describe('CONCEPTS', () => {
  const ids = CONCEPTS.map((c) => c.id)

  it('has unique ids, a French label and terms for each concept', () => {
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of CONCEPTS) {
      expect(c.id).toMatch(/^[a-z]+$/)
      expect(c.label.trim().length).toBeGreaterThan(0)
      expect(c.terms.length).toBeGreaterThan(0)
    }
  })

  it('covers the sectors of the target users', () => {
    for (const id of ['finance', 'cfo', 'conseil', 'banque', 'investissement', 'ma', 'associe']) {
      expect(ids).toContain(id)
    }
  })

  it('only implies concepts that exist', () => {
    for (const c of CONCEPTS) for (const id of c.implies ?? []) expect(ids).toContain(id)
  })

  it('has no term made only of stopwords (it could never match)', () => {
    for (const c of CONCEPTS) {
      for (const t of [...c.terms, ...(c.hints ?? [])]) expect(tokenize(t).length, `${c.id}: ${t}`).toBeGreaterThan(0)
    }
    for (const t of SENIORITY_TERMS) expect(tokenize(t).length, t).toBeGreaterThan(0)
  })

  it('has « expert-comptable » (and plurals, with or without hyphen) in audit and finance (PO, 2026-10-31)', () => {
    for (const id of ['audit', 'finance']) {
      const terms = CONCEPTS.find((c) => c.id === id).terms
      for (const t of ['expert-comptable', 'experts-comptables', 'expert comptable', 'experts comptables']) expect(terms, id).toContain(t)
    }
  })

  it('never shows a raw id as a label', () => {
    expect(CONCEPTS.find((c) => c.id === 'ma').label).toBe('fusions-acquisitions (M&A)')
    expect(CONCEPTS.find((c) => c.id === 'cfo').label).not.toBe('cfo')
  })
})

describe('EXAMPLE_REQUESTS', () => {
  it('are R1, R3, R6 and R8 word for word (PO, 2026-10-29)', () => {
    const byId = Object.fromEntries(REFERENCE_REQUESTS.map((r) => [r.id, r.request]))
    expect(EXAMPLE_REQUESTS).toEqual([byId.R1, byId.R3, byId.R6, byId.R8])
  })
})
