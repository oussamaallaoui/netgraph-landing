// Beta signup storage (#11, ADR 0003). Pure apart from the injected Redis client.
//
// One key per address, written with one SET … NX: the duplicate check and the write are a single
// atomic command, so two identical signups can never both be written and two different ones are
// both kept. The route answers new and existing addresses the same way; `created` exists only
// for tests and must never be returned, logged or branched on by the route.

// No import of `@upstash/redis` here: lib/redis.js stays the only file that imports the SDK, and
// errors are recognised by their `name`.

/** @typedef {import('./types.js').RedisLike} RedisLike */
/** @typedef {import('./types.js').SignupRecord} SignupRecord */
/** @typedef {import('./subscribe.js').Signup} Signup */

/**
 * Missing storage configuration (thrown by getRedis in lib/redis.js, which re-exports it).
 * The message names the variables, never their values.
 */
export class SignupStoreConfigError extends Error {
  constructor() {
    super('Signup store is not configured: KV_REST_API_URL and KV_REST_API_TOKEN are required')
    this.name = 'SignupStoreConfigError'
  }
}

/** Error names from `@upstash/redis` 1.41.0 and the platform, by category (closed list). */
const CATEGORY_BY_NAME = Object.freeze({
  SignupStoreConfigError: 'config',
  UrlError: 'config', // malformed KV_REST_API_URL, thrown by new Redis()
  UpstashError: 'upstash',
  UpstashJSONParseError: 'upstash', // subclass of UpstashError: unreadable response body
  TypeError: 'network', // fetch failed
  AbortError: 'network',
  TimeoutError: 'network', // AbortSignal.timeout fired (per-request timeout)
})

/**
 * `signup:<email>` in production, `<env>:signup:<email>` elsewhere (`preview:signup:…`,
 * `development:signup:…`, `local:signup:…` when VERCEL_ENV is not set).
 *
 * @param {string} email   already validated (trimmed, lowercased)
 * @param {string|undefined} [env]
 * @returns {string}
 */
export function signupKey(email, env = process.env.VERCEL_ENV) {
  return env === 'production' ? `signup:${email}` : `${env || 'local'}:signup:${email}`
}

/**
 * @param {Signup} signup   from validateSignup
 * @param {Date} now
 * @returns {SignupRecord}
 */
export function signupRecord(signup, now) {
  const { email, name, company, role } = signup
  return { v: 1, email, name, company, role, date: now.toISOString(), source: 'landing' }
}

/**
 * Saves a signup unless the address is already signed up (the original stays unchanged).
 * Throws whatever the client throws.
 *
 * @param {RedisLike} redis
 * @param {Signup} signup   from validateSignup
 * @param {Date} [now]
 * @returns {Promise<{ created: boolean }>}
 */
export async function addSignup(redis, signup, now = new Date()) {
  const result = await redis.set(signupKey(signup.email), signupRecord(signup, now), { nx: true })
  return { created: result === 'OK' }
}

/**
 * Closed list of categories for the one log line on a storage failure. Never log the error
 * itself: `@upstash/redis` messages can quote the command, which holds the email and the record.
 *
 * @param {unknown} err
 * @returns {'config'|'upstash'|'network'|'unknown'}
 */
export function errorCategory(err) {
  if (err instanceof SignupStoreConfigError) return 'config'
  if (err instanceof TypeError) return 'network'
  const name = err && typeof err === 'object' ? /** @type {{ name?: unknown }} */ (err).name : undefined
  return (typeof name === 'string' && Object.hasOwn(CATEGORY_BY_NAME, name)) ? CATEGORY_BY_NAME[name] : 'unknown'
}
