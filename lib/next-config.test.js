import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

// next.config.js lives at the repo root; this test sits in lib/ because Vitest only
// collects lib/**/*.test.js and components/**/*.test.js.
const require = createRequire(import.meta.url)
const nextConfig = require('../next.config.js')

const EXPECTED = [
  { key: 'Content-Security-Policy', value: "connect-src 'self'" },
  { key: 'Referrer-Policy', value: 'no-referrer' },
]

/** Minimal matcher for the path patterns used here ('/:path*' and literal paths). */
function sourceMatches(source, path) {
  if (source === '/:path*') return path.startsWith('/')
  return source === path
}

describe('next.config.js headers (ADR 0001)', () => {
  it('has one site-wide rule on /:path* with connect-src self and no-referrer', async () => {
    const rules = await nextConfig.headers()
    expect(rules).toEqual([{ source: '/:path*', headers: EXPECTED }])
  })

  it('applies to / and /essayer (so client-side navigation from / keeps the CSP)', async () => {
    const rules = await nextConfig.headers()
    for (const path of ['/', '/essayer', '/api/subscribe']) {
      const headers = rules.filter((r) => sourceMatches(r.source, path)).flatMap((r) => r.headers)
      expect(headers).toEqual(expect.arrayContaining(EXPECTED))
    }
  })
})
