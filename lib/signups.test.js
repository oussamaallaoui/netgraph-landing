import { describe, expect, it } from 'vitest'
import { createMemoryRedis } from './memoryRedis.js'
import { SignupStoreConfigError, addSignup, errorCategory, signupKey, signupRecord } from './signups.js'

// Fake data only (@netgraph.test, invented names).
const sara = { email: 'test+qa1@netgraph.test', name: 'Sara Démo', company: 'Fictiva Conseil', role: 'DAF' }
const NOW = new Date('2026-11-15T10:00:00.000Z')
const LATER = new Date('2026-11-16T09:30:00.000Z')

describe('signupKey', () => {
  it('has no prefix in production only', () => {
    expect(signupKey('test+qa1@netgraph.test', 'production')).toBe('signup:test+qa1@netgraph.test')
    expect(signupKey('test+qa1@netgraph.test', 'preview')).toBe('preview:signup:test+qa1@netgraph.test')
    expect(signupKey('test+qa1@netgraph.test', 'development')).toBe('development:signup:test+qa1@netgraph.test')
  })

  it('uses « local » when VERCEL_ENV is not set', () => {
    expect(signupKey('test+qa1@netgraph.test', undefined)).toBe('local:signup:test+qa1@netgraph.test')
    expect(signupKey('test+qa1@netgraph.test', '')).toBe('local:signup:test+qa1@netgraph.test')
  })
})

describe('signupRecord', () => {
  it('has exactly the ADR 0003 shape', () => {
    expect(signupRecord(sara, NOW)).toEqual({
      v: 1,
      email: 'test+qa1@netgraph.test',
      name: 'Sara Démo',
      company: 'Fictiva Conseil',
      role: 'DAF',
      date: '2026-11-15T10:00:00.000Z',
      source: 'landing',
    })
  })

  it('drops any other field', () => {
    expect(Object.keys(signupRecord({ ...sara, ip: '192.0.2.1', extra: 'x' }, NOW)).sort())
      .toEqual(['company', 'date', 'email', 'name', 'role', 'source', 'v'])
  })
})

describe('addSignup', () => {
  const key = signupKey(sara.email)

  it('saves one record under the address key', async () => {
    const redis = createMemoryRedis()
    expect(await addSignup(redis, sara, NOW)).toEqual({ created: true })
    expect([...redis.dump()]).toEqual([[key, signupRecord(sara, NOW)]])
  })

  it('twice: one record, the original unchanged', async () => {
    const redis = createMemoryRedis()
    await addSignup(redis, sara, NOW)
    expect(await addSignup(redis, { ...sara, name: 'Quelqu’un d’autre', company: 'Autre Démo' }, LATER)).toEqual({ created: false })
    expect(redis.dump().size).toBe(1)
    expect(redis.dump().get(key)).toEqual(signupRecord(sara, NOW))
  })

  it('issues exactly one SET … NX', async () => {
    const calls = []
    const redis = createMemoryRedis()
    const spy = { ...redis, set: (...args) => { calls.push(args); return redis.set(...args) } }
    await addSignup(spy, sara, NOW)
    expect(calls).toEqual([[key, signupRecord(sara, NOW), { nx: true }]])
  })

  it('two different addresses at the same time: both kept', async () => {
    const redis = createMemoryRedis()
    const other = { ...sara, email: 'test+qa2@netgraph.test' }
    const results = await Promise.all([addSignup(redis, sara, NOW), addSignup(redis, other, NOW)])
    expect(results).toEqual([{ created: true }, { created: true }])
    expect(redis.dump().size).toBe(2)
  })

  it('the same address twice at the same time: exactly one created', async () => {
    const redis = createMemoryRedis()
    const results = await Promise.all([addSignup(redis, sara, NOW), addSignup(redis, sara, LATER)])
    expect(results.filter((r) => r.created)).toHaveLength(1)
    expect(redis.dump().size).toBe(1)
  })

  it('throws whatever the client throws', async () => {
    const redis = createMemoryRedis()
    const err = new Error('down')
    redis.failNext(err)
    await expect(addSignup(redis, sara, NOW)).rejects.toBe(err)
  })
})

describe('errorCategory', () => {
  const named = (name) => Object.assign(new Error('ERR … test+qa1@netgraph.test'), { name })

  it('maps errors to the closed list', () => {
    expect(errorCategory(new SignupStoreConfigError())).toBe('config')
    expect(errorCategory(named('UpstashError'))).toBe('upstash')
    expect(errorCategory(new TypeError('fetch failed'))).toBe('network')
    expect(errorCategory(named('AbortError'))).toBe('network')
    expect(errorCategory(new Error('x'))).toBe('unknown')
  })

  it('maps the other @upstash/redis errors and the request timeout (#11 amendment)', () => {
    expect(errorCategory(named('UpstashJSONParseError'))).toBe('upstash')
    expect(errorCategory(named('UrlError'))).toBe('config')
    expect(errorCategory(named('TimeoutError'))).toBe('network')
    expect(errorCategory(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))).toBe('network')
    for (const odd of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) expect(errorCategory(named(odd))).toBe('unknown')
  })

  it('SignupStoreConfigError names the variables, never a value', () => {
    const err = new SignupStoreConfigError()
    expect(err.name).toBe('SignupStoreConfigError')
    expect(err.message).toContain('KV_REST_API_URL')
    for (const odd of [undefined, null, 'UpstashError', 42, {}]) expect(errorCategory(odd)).toBe('unknown')
  })
})
