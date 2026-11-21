import { describe, expect, it } from 'vitest'
import { createMemoryRedis } from './memoryRedis.js'

// Fake data only (@netgraph.test).
const KEY = 'local:signup:test+qa1@netgraph.test'

describe('createMemoryRedis behaves like @upstash/redis for the subset we use', () => {
  it('SET NX: « OK » the first time, null after, value unchanged', async () => {
    const redis = createMemoryRedis()
    expect(await redis.set(KEY, { v: 1, name: 'Sara Démo' }, { nx: true })).toBe('OK')
    expect(await redis.set(KEY, { v: 1, name: 'Autre Nom' }, { nx: true })).toBeNull()
    expect(await redis.get(KEY)).toEqual({ v: 1, name: 'Sara Démo' })
  })

  it('SET without NX overwrites', async () => {
    const redis = createMemoryRedis()
    await redis.set(KEY, { a: 1 }, { nx: true })
    expect(await redis.set(KEY, { a: 2 })).toBe('OK')
    expect(await redis.get(KEY)).toEqual({ a: 2 })
  })

  it('stores a deep copy: later changes to the caller’s object or to a read value never reach it', async () => {
    const redis = createMemoryRedis()
    const value = { v: 1, nested: { name: 'Sara Démo' } }
    await redis.set(KEY, value, { nx: true })
    value.nested.name = 'changé'
    const read = await redis.get(KEY)
    expect(read).toEqual({ v: 1, nested: { name: 'Sara Démo' } })
    read.nested.name = 'changé aussi'
    expect(await redis.get(KEY)).toEqual({ v: 1, nested: { name: 'Sara Démo' } })
    expect(redis.dump().get(KEY)).toEqual({ v: 1, nested: { name: 'Sara Démo' } })
  })

  it('GET of a missing key is null; DEL returns 1 then 0', async () => {
    const redis = createMemoryRedis()
    expect(await redis.get(KEY)).toBeNull()
    await redis.set(KEY, { v: 1 }, { nx: true })
    expect(await redis.del(KEY)).toBe(1)
    expect(await redis.del(KEY)).toBe(0)
    expect(await redis.get(KEY)).toBeNull()
    expect(redis.dump().size).toBe(0)
  })

  it('failNext makes only the next call reject, and nothing is written', async () => {
    const redis = createMemoryRedis()
    const err = new Error('down')
    redis.failNext(err)
    await expect(redis.set(KEY, { v: 1 }, { nx: true })).rejects.toBe(err)
    expect(redis.dump().size).toBe(0)
    expect(await redis.set(KEY, { v: 1 }, { nx: true })).toBe('OK')
  })

  it('{ fail } makes every call reject', async () => {
    const err = new Error('down')
    const redis = createMemoryRedis({ fail: err })
    await expect(redis.set(KEY, { v: 1 }, { nx: true })).rejects.toBe(err)
    await expect(redis.get(KEY)).rejects.toBe(err)
    await expect(redis.del(KEY)).rejects.toBe(err)
    expect(redis.dump().size).toBe(0)
  })

  it('SET NX is atomic under concurrent calls', async () => {
    const redis = createMemoryRedis()
    const results = await Promise.all([1, 2, 3, 4].map((n) => redis.set(KEY, { n }, { nx: true })))
    expect(results.filter((r) => r === 'OK')).toHaveLength(1)
    expect(results.filter((r) => r === null)).toHaveLength(3)
  })
})
