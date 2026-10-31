import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllData,
  CONTACTS_KEY,
  DB_NAME,
  getPreference,
  loadContacts,
  saveContacts,
  setPreference,
  STORE_NAME,
} from './store.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'

/** Minimal in-memory Web Storage (Node has no localStorage). */
class MemoryStorage {
  constructor() {
    this.map = new Map()
  }
  get length() {
    return this.map.size
  }
  key(i) {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null
  }
  setItem(k, v) {
    this.map.set(k, String(v))
  }
  removeItem(k) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
}

const throwingGetter = (obj, name) =>
  Object.defineProperty(obj, name, {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
  })

async function databaseNames() {
  return (await indexedDB.databases()).map((d) => d.name)
}

/** Write a raw value under the contacts key (simulates an old or corrupt record). */
async function putRaw(value) {
  await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(value, CONTACTS_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/** Read the raw value under the contacts key (undefined if none). */
async function getRaw() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const get = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(CONTACTS_KEY)
      get.onsuccess = () => {
        db.close()
        resolve(get.result)
      }
      get.onerror = () => reject(get.error)
    }
  })
}

/** An extra open connection, as another tab would hold (optionally without a versionchange handler). */
function openRawConnection({ closeOnVersionChange }) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      if (closeOnVersionChange) db.onversionchange = () => db.close()
      resolve(db)
    }
  })
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  globalThis.localStorage = new MemoryStorage()
})

afterEach(() => {
  delete globalThis.indexedDB
  delete globalThis.localStorage
})

describe('saveContacts / loadContacts', () => {
  it('returns null when nothing is stored, without creating the database', async () => {
    expect(await loadContacts()).toBeNull()
    expect(await databaseNames()).not.toContain(DB_NAME)
  })

  it('round-trips a sample import', async () => {
    const before = Date.now()
    expect(await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })).toEqual({ persisted: true })
    const stored = await loadContacts()
    expect(stored.schemaVersion).toBe(1)
    expect(stored.isSample).toBe(true)
    expect(stored.contacts).toEqual(SAMPLE_CONTACTS)
    expect(Date.parse(stored.importedAt)).toBeGreaterThanOrEqual(before - 1000)
    expect(stored.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('replaces the previous import', async () => {
    await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })
    const mine = [{ ...SAMPLE_CONTACTS[0], id: 'li-0000001', sources: ['linkedin'] }]
    await saveContacts({ contacts: mine, isSample: false })
    const stored = await loadContacts()
    expect(stored.isSample).toBe(false)
    expect(stored.contacts).toEqual(mine)
  })

  it('stores only the Contact fields', async () => {
    const extra = { ...SAMPLE_CONTACTS[0], notes: 'should not be stored', raw: ['x'] }
    await saveContacts({ contacts: [extra], isSample: false })
    const [c] = (await loadContacts()).contacts
    expect(c).toEqual(SAMPLE_CONTACTS[0])
    expect(c).not.toHaveProperty('notes')
  })

  it('does not keep a reference to the caller’s objects', async () => {
    const contacts = [{ ...SAMPLE_CONTACTS[0], sources: ['sample'] }]
    await saveContacts({ contacts, isSample: true })
    contacts[0].firstName = 'Changé'
    contacts[0].sources.push('phone')
    const [c] = (await loadContacts()).contacts
    expect(c.firstName).toBe(SAMPLE_CONTACTS[0].firstName)
    expect(c.sources).toEqual(['sample'])
  })

  it('accepts an empty list', async () => {
    expect(await saveContacts({ contacts: [], isSample: false })).toEqual({ persisted: true })
    expect((await loadContacts()).contacts).toEqual([])
  })

  it('returns persisted:false for invalid input, without throwing or writing', async () => {
    for (const input of [undefined, null, {}, { contacts: 'x', isSample: true }, { contacts: [], isSample: 'yes' }]) {
      expect(await saveContacts(input)).toEqual({ persisted: false })
    }
    expect(await databaseNames()).not.toContain(DB_NAME)
  })

  it('a failed save drops the previous import (best effort), so a reload does not bring it back', async () => {
    await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })
    const uncloneable = [{ ...SAMPLE_CONTACTS[0], company: () => 'x' }]
    expect(await saveContacts({ contacts: uncloneable, isSample: false })).toEqual({ persisted: false })
    expect(await loadContacts()).toBeNull()
  })

  it('deletes and ignores a record with another schemaVersion', async () => {
    await putRaw({ schemaVersion: 2, isSample: false, importedAt: '2026-10-27T00:00:00.000Z', contacts: [] })
    expect(await loadContacts()).toBeNull()
    expect(await getRaw()).toBeUndefined()
  })

  it('deletes and ignores a malformed record', async () => {
    await putRaw('not a record')
    expect(await loadContacts()).toBeNull()
    expect(await getRaw()).toBeUndefined()
    await putRaw({ schemaVersion: 1, isSample: false, importedAt: 'x', contacts: 'nope' })
    expect(await loadContacts()).toBeNull()
  })
})

describe('clearAllData', () => {
  it('removes the database and every netgraph: key, and nothing else', async () => {
    await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })
    setPreference('tone', 'tu')
    localStorage.setItem('netgraph:other', 'x')
    localStorage.setItem('unrelated', 'keep')
    expect(await databaseNames()).toContain(DB_NAME)

    expect(await clearAllData()).toEqual({ cleared: true })

    expect(await databaseNames()).not.toContain(DB_NAME)
    expect(localStorage.getItem('netgraph:tone')).toBeNull()
    expect(localStorage.getItem('netgraph:other')).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('keep')
    expect(getPreference('tone')).toBeNull()
  })

  it('after clearAllData() nothing remains, even after a reload-style read', async () => {
    await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })
    await clearAllData()
    expect(await loadContacts()).toBeNull()
    expect(await databaseNames()).not.toContain(DB_NAME)
    expect(localStorage.length).toBe(0)
  })

  it('works when nothing was stored', async () => {
    expect(await clearAllData()).toEqual({ cleared: true })
  })

  it('cleared:true when another connection closes on versionchange', async () => {
    await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })
    const other = await openRawConnection({ closeOnVersionChange: true })
    expect(await clearAllData({ blockedTimeoutMs: 200 })).toEqual({ cleared: true })
    expect(await databaseNames()).not.toContain(DB_NAME)
    other.close()
  })

  it('cleared:false when another connection blocks the deletion past the timeout', async () => {
    await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })
    setPreference('tone', 'tu')
    const other = await openRawConnection({ closeOnVersionChange: false })
    const started = Date.now()
    expect(await clearAllData({ blockedTimeoutMs: 50 })).toEqual({ cleared: false })
    expect(Date.now() - started).toBeLessThan(2000)
    expect(await databaseNames()).toContain(DB_NAME)
    // localStorage keys are removed first, whatever happens to the database.
    expect(localStorage.getItem('netgraph:tone')).toBeNull()
    other.close()
  })

  it('cleared:false when deleteDatabase throws', async () => {
    globalThis.indexedDB = {
      open: () => {
        throw new Error('unused')
      },
      deleteDatabase() {
        throw new DOMException('denied', 'SecurityError')
      },
    }
    expect(await clearAllData()).toEqual({ cleared: false })
  })

  it('cleared:false when deleteDatabase fires error', async () => {
    globalThis.indexedDB = {
      open: () => {
        throw new Error('unused')
      },
      deleteDatabase() {
        const req = {}
        queueMicrotask(() => req.onerror?.({ preventDefault() {} }))
        return req
      },
    }
    expect(await clearAllData()).toEqual({ cleared: false })
  })

  it('allows a new import afterwards', async () => {
    await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })
    await clearAllData()
    expect(await saveContacts({ contacts: SAMPLE_CONTACTS.slice(0, 2), isSample: false })).toEqual({ persisted: true })
    expect((await loadContacts()).contacts).toHaveLength(2)
  })
})

describe('preferences', () => {
  it('stores the tone under netgraph:tone', () => {
    expect(getPreference('tone')).toBeNull()
    setPreference('tone', 'tu')
    expect(getPreference('tone')).toBe('tu')
    expect(localStorage.getItem('netgraph:tone')).toBe('tu')
  })

  it('ignores unknown keys, non-string and oversized values', () => {
    setPreference('contacts', 'x')
    setPreference('tone', 42)
    setPreference('tone', 'x'.repeat(101))
    expect(localStorage.length).toBe(0)
    expect(getPreference('contacts')).toBeNull()
  })
})

describe('storage unavailable', () => {
  it('IndexedDB missing → persisted:false, load null, clear resolves, no throw', async () => {
    delete globalThis.indexedDB
    expect(await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })).toEqual({ persisted: false })
    expect(await loadContacts()).toBeNull()
    localStorage.setItem('netgraph:tone', 'vous')
    expect(await clearAllData()).toEqual({ cleared: true })
    expect(localStorage.getItem('netgraph:tone')).toBeNull()
  })

  it('IndexedDB access throws (blocked storage) → persisted:false, no throw', async () => {
    throwingGetter(globalThis, 'indexedDB')
    expect(await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })).toEqual({ persisted: false })
    expect(await loadContacts()).toBeNull()
    expect(await clearAllData()).toEqual({ cleared: true })
  })

  it('indexedDB.open throws or fails → persisted:false, load null', async () => {
    globalThis.indexedDB = {
      open() {
        throw new DOMException('denied', 'InvalidStateError')
      },
      deleteDatabase() {
        throw new DOMException('denied', 'InvalidStateError')
      },
    }
    expect(await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })).toEqual({ persisted: false })
    expect(await loadContacts()).toBeNull()
    expect(await clearAllData()).toEqual({ cleared: false })

    globalThis.indexedDB = {
      open() {
        const req = {}
        queueMicrotask(() => {
          req.error = new DOMException('denied', 'UnknownError')
          req.onerror?.({ preventDefault() {} })
        })
        return req
      },
    }
    expect(await saveContacts({ contacts: SAMPLE_CONTACTS, isSample: true })).toEqual({ persisted: false })
    expect(await loadContacts()).toBeNull()
  })

  it('localStorage missing or throwing → preferences null / no-op, no throw', async () => {
    delete globalThis.localStorage
    expect(getPreference('tone')).toBeNull()
    expect(() => setPreference('tone', 'tu')).not.toThrow()

    throwingGetter(globalThis, 'localStorage')
    expect(getPreference('tone')).toBeNull()
    expect(() => setPreference('tone', 'tu')).not.toThrow()
    expect(await clearAllData()).toEqual({ cleared: true })
  })

  it('localStorage.setItem throwing (quota) → no throw', () => {
    globalThis.localStorage = {
      getItem: () => null,
      setItem() {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    expect(() => setPreference('tone', 'tu')).not.toThrow()
  })
})
