// In-memory stand-in for the `@upstash/redis` client (#11, ADR 0003 §8). Implements only the
// subset the app uses (RedisLike), with the same return values. Used by the tests and, locally,
// by SIGNUP_STORE=memory through lib/redis.js; never imported by app/ directly.
//
// Values go through JSON like they do over Upstash's REST API, so the store keeps a deep copy
// and later changes to the caller's object never reach it. Data lives as long as the process.

/** @typedef {import('./types.js').RedisLike} RedisLike */

/**
 * @typedef {Object} MemoryRedisOptions
 * @property {Error} [fail]   when set, every call rejects with this error (storage down)
 */

/**
 * @param {MemoryRedisOptions} [options]
 * @returns {RedisLike & { failNext(error: Error): void, dump(): Map<string, object> }}
 */
export function createMemoryRedis({ fail } = {}) {
  /** @type {Map<string, string>} */
  const data = new Map()
  /** @type {Error[]} */
  const queued = []

  // Called synchronously at the start of each command, so a check and its write can never
  // interleave with another command (SET NX stays atomic, as in Redis).
  function check() {
    if (queued.length > 0) throw queued.shift()
    if (fail) throw fail
  }

  return {
    async set(key, value, opts) {
      check()
      const k = String(key)
      if (opts?.nx && data.has(k)) return null
      data.set(k, JSON.stringify(value))
      return 'OK'
    },

    async get(key) {
      check()
      const raw = data.get(String(key))
      return raw === undefined ? null : JSON.parse(raw)
    },

    async del(key) {
      check()
      return data.delete(String(key)) ? 1 : 0
    },

    /** The next call (set, get or del) rejects with `error`; later calls work again. */
    failNext(error) {
      queued.push(error)
    },

    /** A copy of the stored data, values parsed (for tests). */
    dump() {
      return new Map([...data].map(([k, raw]) => [k, JSON.parse(raw)]))
    },
  }
}
