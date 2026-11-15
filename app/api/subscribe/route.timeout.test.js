import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The REAL @upstash/redis client, as configured by lib/redis.js, against a stubbed fetch:
// no network, no credentials (the URL and token are obviously fake placeholders).
//
// Why this test exists (#11, tech lead review of PR #41): in @upstash/redis 1.41.0 a plain
// AbortSignal that fires is turned into a fake 200 with `result: null`, so SET … NX would read
// as « already signed up » and the route would answer 200 without saving. lib/redis.js passes
// the signal as a function, so a timeout must end in a 500, never a 200.

const { POST } = await import('./route.js')
const { resetRedisForTests } = await import('../../../lib/redis.js')

const realTimeout = AbortSignal.timeout.bind(AbortSignal)
let fetchCalls
let spies

/** A fetch that never answers on its own: it only rejects when its signal aborts. */
function hangingFetch(_url, init) {
  fetchCalls.push(init)
  return new Promise((_resolve, reject) => {
    const { signal } = init ?? {}
    if (!signal) return // a request without a timeout would hang forever: the test times out
    if (signal.aborted) reject(signal.reason)
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
}

const post = (body) => POST(new Request('http://localhost:3000/api/subscribe', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body,
}))

beforeEach(() => {
  fetchCalls = []
  resetRedisForTests()
  vi.stubEnv('SIGNUP_STORE', '')
  vi.stubEnv('VERCEL', '1')
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('KV_REST_API_URL', 'https://fake-redis.netgraph.test')
  vi.stubEnv('KV_REST_API_TOKEN', 'fake-token-for-tests')
  vi.stubGlobal('fetch', vi.fn(hangingFetch))
  // Same code path as in production, with 3 s shortened to 20 ms so the test is fast.
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(20))
  spies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetRedisForTests()
})

describe('POST /api/subscribe when Redis does not answer in time', () => {
  it('answers 500 « network », never 200, and does not retry the timed-out request', async () => {
    const res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test', name: 'Sara Démo' }))

    expect(AbortSignal.timeout).toHaveBeenCalledWith(3000)
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('{"error":"Erreur serveur"}')
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0].signal).toBeInstanceOf(AbortSignal)

    const logged = spies.flatMap((s) => s.mock.calls)
    expect(logged).toEqual([['subscribe: save failed', 'network']])
  })

  it('the client rejects with the TimeoutError itself, never a fake result', async () => {
    // With a plain AbortSignal, 1.41.0 swallows the abort and fabricates a response
    // ({"result":null}; with auto-pipelining it then fails later with an unrelated TypeError).
    // Only the function form lets the TimeoutError through.
    const { getRedis } = await import('../../../lib/redis.js')
    const err = await getRedis().set('preview:signup:test+qa1@netgraph.test', { v: 1 }, { nx: true }).then(
      (result) => ({ resolvedWith: result }),
      (e) => e,
    )
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('TimeoutError')
    expect(fetchCalls).toHaveLength(1)
  })
})
