import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

// next.config.js lives at the repo root; this test sits in lib/ because Vitest only
// collects lib/**/*.test.js.
const require = createRequire(import.meta.url)
const nextConfig = require('../next.config.js')

describe('next.config.js headers (ADR 0001)', () => {
  it('serves /essayer with connect-src self and no-referrer', async () => {
    const rules = await nextConfig.headers()
    const essayer = rules.find((r) => r.source === '/essayer')
    expect(essayer).toBeDefined()
    expect(essayer.headers).toEqual(
      expect.arrayContaining([
        { key: 'Content-Security-Policy', value: "connect-src 'self'" },
        { key: 'Referrer-Policy', value: 'no-referrer' },
      ]),
    )
  })

  it('does not add these headers to other routes', async () => {
    const rules = await nextConfig.headers()
    expect(rules.map((r) => r.source)).toEqual(['/essayer'])
  })
})
