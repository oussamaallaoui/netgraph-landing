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
import { SignupStoreConfigError } from './signups.js'

export { SignupStoreConfigError }

/** @typedef {import('./types.js').RedisLike} RedisLike */

/** Retries after a failed fetch (default backoff, about 0.2 s in total). */
export const REDIS_RETRIES = 2
/** Per-request timeout, in milliseconds. */
export const REDIS_TIMEOUT_MS = 3000

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
  client = new Redis({
    url,
    token,
    enableTelemetry: false,
    retry: { retries: REDIS_RETRIES },
    // The FUNCTION form is required: a new timeout signal per request, and in @upstash/redis
    // 1.41.0 (HttpClient.request) only the function form makes an abort throw. A plain
    // AbortSignal that fires is turned into a fake 200 with `result: null`; SET … NX would then
    // return null, which reads as « already signed up »: we would answer 200 without saving.
    // With the function form the TimeoutError is thrown (no retry) and the route answers 500.
    signal: () => AbortSignal.timeout(REDIS_TIMEOUT_MS),
  })
  return client
}

/** Forgets the cached clients. Tests only: no app code may call it. */
export function resetRedisForTests() {
  client = null
  memory = null
}
