// #7 quality bar: the expected introducers of every reference request on the sample contacts.
import { describe, expect, it } from 'vitest'
import { introducers } from './introducers.js'
import { buildIndex } from './match.js'
import { REFERENCE_REQUESTS } from './fixtures/reference-requests.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'

const index = buildIndex(SAMPLE_CONTACTS)
const collator = new Intl.Collator('fr')
const byId = Object.fromEntries(SAMPLE_CONTACTS.map((c) => [c.id, c]))

describe('reference requests: introducers', () => {
  it('every reference request states its expected introducers', () => {
    expect(REFERENCE_REQUESTS.filter((r) => !r.introducers).map((r) => r.id)).toEqual([])
  })

  for (const ref of REFERENCE_REQUESTS) {
    it(`${ref.id} « ${ref.request} » → ${ref.introducers?.status}`, () => {
      const r = introducers(ref.request, index)
      expect(r.status).toBe(ref.introducers.status)
      if (ref.introducers.status === 'found') {
        expect(r.companyLabel).toBe(ref.introducers.companyLabel)
        const expected = [...ref.introducers.ids].sort((a, b) => collator.compare(byId[a].fullName, byId[b].fullName))
        expect(r.people.map((p) => p.contact.id)).toEqual(expected)
        expect(r.total).toBe(expected.length)
      } else {
        expect(r.people).toEqual([])
        expect(r.total).toBe(0)
        expect(r.companyLabel).toBe(ref.introducers.status === 'not_found' ? ref.introducers.companyLabel : null)
      }
    })
  }
})
