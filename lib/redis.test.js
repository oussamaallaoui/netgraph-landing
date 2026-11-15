import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// No test talks to the network: the real client is replaced by a recorder.
// The URL and token below are obviously fake placeholders, not credentials.
const constructed = []
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor(config) {
      constructed.push(config)
    }
  },
}))

const { SignupStoreConfigError, getRedis, resetRedisForTests } = await import('./redis.js')

const FAKE_URL = 'https://fake-redis.netgraph.test'
const FAKE_TOKEN = 'fake-token-for-tests'

beforeEach(() => {
  constructed.length = 0
  resetRedisForTests()
  for (const name of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'SIGNUP_STORE', 'VERCEL']) vi.stubEnv(name, '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getRedis', () => {
  it('throws SignupStoreConfigError when either variable is missing, without naming a value', () => {
    expect(() => getRedis()).toThrow(SignupStoreConfigError)
    vi.stubEnv('KV_REST_API_URL', FAKE_URL)
    expect(() => getRedis()).toThrow(SignupStoreConfigError)
    vi.stubEnv('KV_REST_API_URL', '')
    vi.stubEnv('KV_REST_API_TOKEN', FAKE_TOKEN)
    let err
    try { getRedis() } catch (e) { err = e }
    expect(err).toBeInstanceOf(SignupStoreConfigError)
    expect(err.name).toBe('SignupStoreConfigError')
    expect(err.message).not.toContain(FAKE_TOKEN)
    expect(constructed).toEqual([])
  })

  it('builds the client from KV_REST_API_URL and KV_REST_API_TOKEN only, telemetry off, once', () => {
    vi.stubEnv('KV_REST_API_URL', FAKE_URL)
    vi.stubEnv('KV_REST_API_TOKEN', FAKE_TOKEN)
    vi.stubEnv('KV_URL', 'redis://other.netgraph.test')
    vi.stubEnv('KV_REST_API_READ_ONLY_TOKEN', 'other-fake-token')
    const a = getRedis()
    const b = getRedis()
    expect(a).toBe(b)
    expect(constructed).toEqual([{ url: FAKE_URL, token: FAKE_TOKEN, enableTelemetry: false }])
  })

  it('SIGNUP_STORE=memory gives one process-wide in-memory store locally', async () => {
    vi.stubEnv('SIGNUP_STORE', 'memory')
    const a = getRedis()
    expect(getRedis()).toBe(a)
    expect(await a.set('k', { v: 1 }, { nx: true })).toBe('OK')
    expect(await getRedis().get('k')).toEqual({ v: 1 })
    expect(constructed).toEqual([])
  })

  it('SIGNUP_STORE=memory is ignored on Vercel (VERCEL set): no silent fallback', () => {
    vi.stubEnv('SIGNUP_STORE', 'memory')
    vi.stubEnv('VERCEL', '1')
    expect(() => getRedis()).toThrow(SignupStoreConfigError)
    vi.stubEnv('KV_REST_API_URL', FAKE_URL)
    vi.stubEnv('KV_REST_API_TOKEN', FAKE_TOKEN)
    getRedis()
    expect(constructed).toEqual([{ url: FAKE_URL, token: FAKE_TOKEN, enableTelemetry: false }])
  })
})
