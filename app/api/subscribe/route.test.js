import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMemoryRedis } from '../../../lib/memoryRedis.js'

// A fresh in-memory store per test stands in for Upstash (#11): no network, no credentials.
// Fake addresses only (@netgraph.test).
const store = { redis: null, configError: false }

vi.mock('../../../lib/redis.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getRedis: vi.fn(() => {
      if (store.configError) throw new actual.SignupStoreConfigError()
      return store.redis
    }),
  }
})

const route = await import('./route.js')
const { signupKey } = await import('../../../lib/signups.js')

const URL = 'http://localhost:3000/api/subscribe'
const METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace']
let spies

function post(body, headers = { 'content-type': 'application/json' }) {
  return route.POST(new Request(URL, { method: 'POST', headers, body }))
}

const allConsoleArgs = () => spies.flatMap(s => s.mock.calls.flat())
const consoleCallCount = () => spies.reduce((n, s) => n + s.mock.calls.length, 0)

function expectNothingLoggedAbout(...needles) {
  const logged = allConsoleArgs().map(a => (typeof a === 'string' ? a : JSON.stringify(a) ?? String(a)))
  for (const needle of needles) {
    for (const line of logged) expect(line).not.toContain(needle)
  }
}

/** Everything a client can observe about a response. */
async function observe(res) {
  return { status: res.status, headers: [...res.headers], body: await res.text() }
}

/** An error shaped like @upstash/redis's UpstashError, whose message quotes the command. */
function upstashError(email) {
  const err = new Error(`ERR something went wrong, command was: ["set","local:signup:${email}","{\\"name\\":\\"Sara Démo\\"}","nx"]`)
  err.name = 'UpstashError'
  return err
}

beforeEach(() => {
  store.redis = createMemoryRedis()
  store.configError = false
  vi.stubEnv('VERCEL_ENV', '')
  spies = METHODS.map(m => vi.spyOn(console, m).mockImplementation(() => {}))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('GET /api/subscribe and other methods', () => {
  it('exports no GET handler (Next.js answers 405 to GET and HEAD)', () => {
    expect(route.GET).toBeUndefined()
    expect(route.HEAD).toBeUndefined()
    expect(route.PUT).toBeUndefined()
    expect(route.DELETE).toBeUndefined()
    expect(route.PATCH).toBeUndefined()
  })

  it('runs on Node.js, never statically', () => {
    expect(route.dynamic).toBe('force-dynamic')
    expect(route.runtime).toBe('nodejs')
  })
})

describe('POST /api/subscribe', () => {
  const signup = {
    email: 'Test+QA1@NetGraph.test',
    name: 'Sara Démo',
    company: 'Fictiva Conseil',
    role: 'Consultant(e) indépendant(e)',
  }
  const KEY = 'local:signup:test+qa1@netgraph.test'

  it('saves a valid signup, returns 200 {"success":true} and logs nothing', async () => {
    const res = await post(JSON.stringify(signup))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"success":true}')

    const saved = store.redis.dump()
    expect([...saved.keys()]).toEqual([KEY])
    expect(saved.get(KEY)).toEqual({
      v: 1,
      email: 'test+qa1@netgraph.test',
      name: 'Sara Démo',
      company: 'Fictiva Conseil',
      role: 'Consultant(e) indépendant(e)',
      date: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/),
      source: 'landing',
    })
    expect(consoleCallCount()).toBe(0)
  })

  it('uses the environment key prefix (preview:, none in production)', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    await post(JSON.stringify(signup))
    vi.stubEnv('VERCEL_ENV', 'production')
    await post(JSON.stringify({ email: 'test+qa2@netgraph.test' }))
    expect([...store.redis.dump().keys()]).toEqual([
      'preview:signup:test+qa1@netgraph.test',
      'signup:test+qa2@netgraph.test',
    ])
  })

  it('answers an address already signed up (other case, spaces) byte-identically, writes nothing, keeps the original', async () => {
    const first = await observe(await post(JSON.stringify(signup)))
    const original = store.redis.dump().get(KEY)

    for (const email of ['TEST+qa1@netgraph.TEST', '  test+qa1@netgraph.test  ', 'test+qa1@netgraph.test']) {
      const again = await observe(await post(JSON.stringify({ email, name: 'Autre Personne', company: 'Autre Démo' })))
      expect(again, email).toEqual(first)
    }
    expect(first).toMatchObject({ status: 200, body: '{"success":true}' })
    expect(store.redis.dump().size).toBe(1)
    expect(store.redis.dump().get(KEY)).toEqual(original)
    expect(consoleCallCount()).toBe(0)
  })

  it('a new address and an existing one get exactly the same response', async () => {
    await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }))
    const existing = await observe(await post(JSON.stringify({ email: 'test+qa1@netgraph.test' })))
    const fresh = await observe(await post(JSON.stringify({ email: 'test+qa2@netgraph.test' })))
    expect(existing).toEqual(fresh)
    expect(fresh.headers.map(([name]) => name)).not.toContain('set-cookie')
  })

  it('keeps two different signups sent at the same time', async () => {
    const responses = await Promise.all([
      post(JSON.stringify({ email: 'test+qa1@netgraph.test' })),
      post(JSON.stringify({ email: 'test+qa2@netgraph.test' })),
    ])
    expect(responses.map(r => r.status)).toEqual([200, 200])
    expect(store.redis.dump().size).toBe(2)
  })

  it('returns 400 « Requête invalide » for malformed JSON, without logging any of the body', async () => {
    const res = await post('test+qa1@netgraph.test')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Requête invalide' })
    expectNothingLoggedAbout('netgraph.test', 'test+qa1')
    expect(store.redis.dump().size).toBe(0)
    expect(consoleCallCount()).toBe(0)
  })

  it('returns 400 for a truncated JSON object containing an email, without logging it', async () => {
    const res = await post('{"email":"test+qa1@netgraph.test","name":"Sara')
    expect(res.status).toBe(400)
    expectNothingLoggedAbout('netgraph.test', 'Sara')
  })

  it('returns 400 for a body over 10 KB', async () => {
    const res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test', name: 'x'.repeat(20 * 1024) }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Requête invalide' })
    expect(store.redis.dump().size).toBe(0)
  })

  it('returns 400 when the declared Content-Length is over 10 KB', async () => {
    const res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }), {
      'content-type': 'application/json',
      'content-length': String(11 * 1024),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for a JSON array, a string or null', async () => {
    for (const body of ['[]', '"test+qa1@netgraph.test"', 'null']) {
      const res = await post(body)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Requête invalide' })
    }
    expectNothingLoggedAbout('netgraph.test')
  })

  it('returns 400 « Requête invalide » for an object name or a 101-character company', async () => {
    let res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test', name: { first: 'Sara' } }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Requête invalide' })

    res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test', company: 'c'.repeat(101) }))
    expect(res.status).toBe(400)
    expect(store.redis.dump().size).toBe(0)
  })

  it('returns 400 « Email invalide » for a missing or invalid email, writes nothing, logs nothing', async () => {
    const bodies = [{}, { email: 'pas-un-email' }, { email: 42 }, { email: '' },
      { email: 'a@b' }, { email: 'a@' }, { email: '@b.ma' }, { email: 'a b@c.ma' }]
    for (const body of bodies) {
      const res = await post(JSON.stringify(body))
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect(await res.text()).toBe('{"error":"Email invalide"}')
    }
    expect(store.redis.dump().size).toBe(0)
    expect(consoleCallCount()).toBe(0)
  })

  it('returns 500 on a storage failure and logs only the fixed line, never the email or the record', async () => {
    store.redis.failNext(upstashError('test+qa10@netgraph.test'))

    const res = await post(JSON.stringify({ ...signup, email: 'test+qa10@netgraph.test' }))
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('{"error":"Erreur serveur"}')

    expect(consoleCallCount()).toBe(1)
    expect(console.error).toHaveBeenCalledWith('subscribe: save failed', 'upstash')
    expectNothingLoggedAbout('netgraph.test', 'Sara', 'Fictiva', 'ERR', 'command')
    expect(store.redis.dump().size).toBe(0)
  })

  it('returns a clean 500 « config » when the env vars are missing', async () => {
    store.configError = true
    const res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Erreur serveur' })
    expect(consoleCallCount()).toBe(1)
    expect(console.error).toHaveBeenCalledWith('subscribe: save failed', 'config')
  })

  it('logs « network » for a fetch failure and « unknown » for anything else', async () => {
    store.redis.failNext(new TypeError('fetch failed test+qa1@netgraph.test'))
    expect((await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }))).status).toBe(500)
    store.redis.failNext(new Error('disk full test+qa1@netgraph.test'))
    expect((await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }))).status).toBe(500)
    expect(console.error.mock.calls).toEqual([
      ['subscribe: save failed', 'network'],
      ['subscribe: save failed', 'unknown'],
    ])
    expectNothingLoggedAbout('netgraph.test')
  })

  it('accepts the address again after a failure (nothing half-written)', async () => {
    store.redis.failNext(upstashError('test+qa1@netgraph.test'))
    expect((await post(JSON.stringify(signup))).status).toBe(500)
    expect((await post(JSON.stringify(signup))).status).toBe(200)
    expect(store.redis.dump().has(signupKey('test+qa1@netgraph.test'))).toBe(true)
  })
})
