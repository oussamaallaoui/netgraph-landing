// Quality bar for matching (#6, B5): every reference request against the sample contacts.
// Fails if a mustTop3 id is missing from the top 3, or if a `none` request returns results.
import { describe, expect, it } from 'vitest'
import { buildIndex, match } from './match.js'
import { EXAMPLE_REQUESTS } from './vocabulary.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'
import { REFERENCE_REQUESTS } from './fixtures/reference-requests.js'

const index = buildIndex(SAMPLE_CONTACTS)

describe('reference requests', () => {
  for (const ref of REFERENCE_REQUESTS) {
    it(`${ref.id} « ${ref.request} »`, () => {
      const { results } = match(ref.request, index)
      const ids = results.map((r) => r.contact.id)
      if (ref.none) {
        expect(ids, `${ref.id} should give the empty state`).toEqual([])
        return
      }
      const top3 = ids.slice(0, 3)
      for (const id of ref.mustTop3) expect(top3, `${ref.id}: ${id} not in top 3 (got ${ids.join(', ')})`).toContain(id)
      for (const r of results) {
        expect(r.reasons.length).toBeGreaterThan(0)
        expect(r.why).not.toMatch(/undefined|null/)
      }
    })
  }

  it('every example request returns results on the sample data', () => {
    for (const request of EXAMPLE_REQUESTS) expect(match(request, index).results.length, request).toBeGreaterThan(0)
  })
})
