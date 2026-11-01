// Performance budget (#6, B6): buildIndex + match on 5,000 synthetic contacts under 200 ms
// in Node, so the first search after an import or a reload (index included) has a wide
// margin inside the 2 s browser target (PO, 2026-10-29).
import { describe, expect, it } from 'vitest'
import { introducers } from './introducers.js'
import { buildIndex, match } from './match.js'
import { REFERENCE_REQUESTS } from './fixtures/reference-requests.js'
import { makeSyntheticContacts } from './fixtures/synthetic.js'

const BUDGET_MS = 200

describe('performance', () => {
  const contacts = makeSyntheticContacts(5000)

  it(`builds the index and answers a request on 5,000 contacts in under ${BUDGET_MS} ms`, () => {
    const t0 = performance.now()
    const index = buildIndex(contacts)
    const { results } = match('Trouver ma prochaine mission de conseil en finance', index)
    const elapsed = performance.now() - t0
    expect(results.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(BUDGET_MS)
  })

  it(`answers every reference request on 5,000 contacts in under ${BUDGET_MS} ms in total`, () => {
    const index = buildIndex(contacts)
    const t0 = performance.now()
    for (const ref of REFERENCE_REQUESTS) match(ref.request, index)
    expect(performance.now() - t0).toBeLessThan(BUDGET_MS)
  })

  it(`#7: match + introducers for every reference request on 5,000 contacts in under ${BUDGET_MS} ms in total`, () => {
    const index = buildIndex(contacts)
    const t0 = performance.now()
    for (const ref of REFERENCE_REQUESTS) {
      match(ref.request, index)
      introducers(ref.request, index)
    }
    expect(introducers('chez Fictiva Banque', index).status).toBe('found')
    expect(performance.now() - t0).toBeLessThan(BUDGET_MS)
  })
})
