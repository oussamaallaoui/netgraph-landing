// The Redis client for beta signups (#11, ADR 0003). The only file that imports `@upstash/redis`.
//
// Configured from KV_REST_API_URL and KV_REST_API_TOKEN only (set by Vercel's Upstash
// integration), explicitly rather than Redis.fromEnv(), with telemetry off. The other variables
// the integration injects (KV_REST_API_READ_ONLY_TOKEN, KV_URL, REDIS_URL) are not used.
//
// Locally, SIGNUP_STORE=memory swaps in an in-memory store (lib/memoryRedis.js) so nobody needs
// the real credentials. The switch is ignored on Vercel (VERCEL is set), so a deployment can
// never fall back to memory and silently lose signups.
//
// Never log the URL, the token or an error from the client (its message can quote the command).

import { Redis } from '@upstash/redis'
import { createMemoryRedis } from './memoryRedis.js'

/** @typedef {import('./types.js').RedisLike} RedisLike */

/** Missing storage configuration. The message names the variables, never their values. */
export class SignupStoreConfigError extends Error {
  constructor() {
    super('Signup store is not configured: KV_REST_API_URL and KV_REST_API_TOKEN are required')
    this.name = 'SignupStoreConfigError'
  }
}

/** @type {RedisLike | null} */
let client = null
/** @type {RedisLike | null} */
let memory = null

/**
 * Lazy singleton. Throws SignupStoreConfigError when KV_REST_API_URL or KV_REST_API_TOKEN is
 * missing (outside the local memory mode). Reads process.env on every call until it succeeds.
 *
 * @returns {RedisLike}
 */
export function getRedis() {
  const env = process.env
  if (env.SIGNUP_STORE === 'memory' && !env.VERCEL) {
    memory ??= createMemoryRedis()
    return memory
  }
  if (client) return client
  const url = env.KV_REST_API_URL
  const token = env.KV_REST_API_TOKEN
  if (!url || !token) throw new SignupStoreConfigError()
  client = new Redis({ url, token, enableTelemetry: false })
  return client
}

/** Forgets the cached clients (tests only). */
export function resetRedisForTests() {
  client = null
  memory = null
}
