import { describe, expect, it } from 'vitest'
import {
  FEW_RESULTS_TIP,
  NO_RESULTS_TITLE,
  initialsOf,
  linkedInHref,
  requestToSearch,
  resultsOutcome,
  resultsSummary,
} from './search'
import { buildIndex, match } from '../../lib/match.js'
import { EXAMPLE_REQUESTS } from '../../lib/vocabulary.js'
import { SAMPLE_CONTACTS } from '../../lib/fixtures/sample-contacts.js'

describe('requestToSearch', () => {
  it('returns null for empty, whitespace-only and non-string values', () => {
    expect(requestToSearch('')).toBeNull()
    expect(requestToSearch('   \t\n ')).toBeNull()
    expect(requestToSearch(undefined)).toBeNull()
    expect(requestToSearch(42)).toBeNull()
  })

  it('keeps the request as typed (match normalises it)', () => {
    expect(requestToSearch('  Trouver un DAF ')).toBe('  Trouver un DAF ')
  })
})

describe('resultsSummary', () => {
  it('uses the singular for one person', () => {
    expect(resultsSummary(1)).toBe('1 personne de votre réseau peut vous aider')
  })

  it('uses the plural from two people', () => {
    expect(resultsSummary(2)).toBe('2 personnes de votre réseau peuvent vous aider')
    expect(resultsSummary(10)).toBe('10 personnes de votre réseau peuvent vous aider')
  })

  it('falls back to the no-results title for 0', () => {
    expect(resultsSummary(0)).toBe(NO_RESULTS_TITLE)
  })
})

describe('resultsOutcome', () => {
  it('maps 0 → none, 1–2 → few, 3+ → list', () => {
    expect(resultsOutcome([])).toBe('none')
    expect(resultsOutcome(undefined)).toBe('none')
    expect(resultsOutcome([1])).toBe('few')
    expect(resultsOutcome([1, 2])).toBe('few')
    expect(resultsOutcome([1, 2, 3])).toBe('list')
  })
})

describe('linkedInHref', () => {
  it('accepts https LinkedIn profile URLs', () => {
    expect(linkedInHref('https://www.linkedin.com/in/netgraph-exemple-sara')).toBe(
      'https://www.linkedin.com/in/netgraph-exemple-sara',
    )
    expect(linkedInHref('https://linkedin.com/in/x')).toBe('https://linkedin.com/in/x')
  })

  it('rejects anything else', () => {
    for (const bad of [
      null,
      undefined,
      '',
      'http://www.linkedin.com/in/x',
      'javascript:alert(1)',
      'https://www.linkedin.com.evil.test/in/x',
      'https://evil.test/https://www.linkedin.com/in/x',
      'https://user:pw@www.linkedin.com/in/x',
      'https://www.linkedin.com:8443/in/x',
      'https://fr.linkedin.com/in/x',
      'https://www.linkedin.com',
      `https://www.linkedin.com/in/${'a'.repeat(2001)}`,
    ]) {
      expect(linkedInHref(bad)).toBeNull()
    }
  })
})

describe('initialsOf', () => {
  it('takes the first letter of the first and last names', () => {
    expect(initialsOf({ firstName: 'Sara', lastName: 'Démo' })).toBe('SD')
    expect(initialsOf({ firstName: 'Leïla', lastName: '' })).toBe('L')
    expect(initialsOf({ firstName: 'élodie', lastName: 'Échantillon' })).toBe('ÉÉ')
  })

  it('falls back to the full name, then to empty', () => {
    expect(initialsOf({ fullName: 'Kenza Ben Échantillon' })).toBe('KÉ')
    expect(initialsOf({ firstName: '', lastName: '', fullName: '' })).toBe('')
    expect(initialsOf(null)).toBe('')
  })
})

// The screen relies on these properties of the lib on the sample data (PO, 2026-10-29).
describe('request step on the sample data', () => {
  const index = buildIndex(SAMPLE_CONTACTS)

  it('every example request returns results, so its button never leads to the no-results screen', () => {
    for (const example of EXAMPLE_REQUESTS) {
      const { results } = match(example, index)
      expect(results.length, example).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(10)
    }
  })

  it('R11 gives the no-results screen', () => {
    expect(resultsOutcome(match('Apprendre la plongée sous-marine', index).results)).toBe('none')
  })

  it('every card has a non-empty « Pourquoi cette personne » sentence', () => {
    for (const example of EXAMPLE_REQUESTS) {
      for (const r of match(example, index).results) {
        expect(typeof r.why).toBe('string')
        expect(r.why.trim().length).toBeGreaterThan(0)
        expect(r.why).not.toMatch(/undefined|null/)
      }
    }
  })

  it('the few-results tip has the PO copy', () => {
    expect(FEW_RESULTS_TIP).toBe('Pour élargir la recherche, citez un métier, un secteur ou une entreprise.')
  })
})
