import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// In-memory stand-in for subscribers.json. Fake addresses only (@netgraph.test).
const disk = { content: null, writeError: null }

vi.mock('fs', () => {
  const readFileSync = vi.fn(() => {
    if (disk.content === null) {
      const err = new Error('ENOENT: no such file or directory')
      err.code = 'ENOENT'
      throw err
    }
    return disk.content
  })
  const writeFileSync = vi.fn((_file, data) => {
    if (disk.writeError) throw disk.writeError
    disk.content = data
  })
  return { default: { readFileSync, writeFileSync }, readFileSync, writeFileSync }
})

const route = await import('./route.js')

const URL = 'http://localhost:3000/api/subscribe'
const METHODS = ['log', 'info', 'warn', 'error', 'debug']
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

beforeEach(() => {
  disk.content = null
  disk.writeError = null
  spies = METHODS.map(m => vi.spyOn(console, m).mockImplementation(() => {}))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/subscribe and other methods', () => {
  it('exports no GET handler (Next.js answers 405 to GET and HEAD)', () => {
    expect(route.GET).toBeUndefined()
    expect(route.HEAD).toBeUndefined()
    expect(route.PUT).toBeUndefined()
    expect(route.DELETE).toBeUndefined()
    expect(route.PATCH).toBeUndefined()
  })
})

describe('POST /api/subscribe', () => {
  const signup = {
    email: 'Test+QA1@NetGraph.test',
    name: 'Sara Démo',
    company: 'Fictiva Conseil',
    role: 'Consultant(e) indépendant(e)',
  }

  it('saves a valid signup, returns 200 with the count, and logs nothing', async () => {
    const res = await post(JSON.stringify(signup))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, total: 1 })

    const saved = JSON.parse(disk.content)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      email: 'test+qa1@netgraph.test',
      name: 'Sara Démo',
      company: 'Fictiva Conseil',
      role: 'Consultant(e) indépendant(e)',
      source: 'landing',
    })
    expect(consoleCallCount()).toBe(0)
  })

  it('counts every subscriber in total', async () => {
    await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }))
    const res = await post(JSON.stringify({ email: 'test+qa2@netgraph.test' }))
    expect(await res.json()).toEqual({ success: true, total: 2 })
  })

  it('returns 409 for the same email in another case, and logs nothing', async () => {
    await post(JSON.stringify(signup))
    const res = await post(JSON.stringify({ email: 'TEST+qa1@netgraph.TEST' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Déjà inscrit' })
    expect(JSON.parse(disk.content)).toHaveLength(1)
    expect(consoleCallCount()).toBe(0)
  })

  it('returns 400 « Requête invalide » for malformed JSON, without logging any of the body', async () => {
    const res = await post('test+qa1@netgraph.test')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Requête invalide' })
    expectNothingLoggedAbout('netgraph.test', 'test+qa1')
    expect(disk.content).toBeNull()
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
    expect(disk.content).toBeNull()
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
    expect(disk.content).toBeNull()
  })

  it('returns 400 « Email invalide » for a missing or invalid email (unchanged)', async () => {
    for (const body of [{}, { email: 'pas-un-email' }, { email: 42 }, { email: '' }]) {
      const res = await post(JSON.stringify(body))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Email invalide' })
    }
  })

  it('returns 500 on a storage failure and logs only the fixed line with the error code', async () => {
    const err = new Error("EROFS: read-only file system, open '/var/task/subscribers.json' test+qa10@netgraph.test")
    err.code = 'EROFS'
    disk.writeError = err

    const res = await post(JSON.stringify({ ...signup, email: 'test+qa10@netgraph.test' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Erreur serveur' })

    expect(consoleCallCount()).toBe(1)
    expect(console.error).toHaveBeenCalledWith('subscribe: save failed', 'EROFS')
    expectNothingLoggedAbout('netgraph.test', 'Sara', 'Fictiva')
  })

  it('logs « unknown » when the storage error has no code', async () => {
    disk.writeError = new Error('disk full')
    const res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }))
    expect(res.status).toBe(500)
    expect(console.error).toHaveBeenCalledWith('subscribe: save failed', 'unknown')
    expect(consoleCallCount()).toBe(1)
  })

  it('treats an unreadable or non-array subscribers file as empty', async () => {
    disk.content = '{"not":"a list"}'
    const res = await post(JSON.stringify({ email: 'test+qa1@netgraph.test' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, total: 1 })
  })
})
