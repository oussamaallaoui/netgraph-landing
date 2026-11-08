import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllData,
  CONTACTS_KEY,
  DB_NAME,
  DB_VERSION,
  getPreference,
  loadContacts,
  saveContacts,
  SCHEMA_VERSION,
  setPreference,
  STORE_NAME,
} from './store.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'
import { combineSources, withImport } from './merge.js'

const T1 = new Date('2026-11-10T09:00:00.000Z')
const T2 = new Date('2026-11-11T09:00:00.000Z')
const sampleRecord = (contacts = SAMPLE_CONTACTS) => withImport(null, 'sample', contacts, T1)
const asLinkedin = (c) => ({ ...c, id: `li-${c.id}`, sources: ['linkedin'] })
const linkedinRecord = (contacts = SAMPLE_CONTACTS.map(asLinkedin)) => withImport(null, 'linkedin', contacts, T1)
const PHONE_CONTACT = {
  id: 'ph-00000000001', firstName: 'Démo', lastName: 'Sara', fullName: 'Démo Sara', company: null, position: null,
  connectedOn: null, profileUrl: null, email: null, phone: '+212600000004', sources: ['phone'],
}

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

describe('saveContacts / loadContacts (v2)', () => {
  it('returns null when nothing is stored, without creating the database', async () => {
    expect(await loadContacts()).toBeNull()
    expect(await databaseNames()).not.toContain(DB_NAME)
  })

  it('round-trips a sample record', async () => {
    const record = sampleRecord()
    expect(await saveContacts(record)).toEqual({ persisted: true })
    const stored = await loadContacts()
    expect(stored).toEqual(record)
    expect(stored.schemaVersion).toBe(2)
    expect(SCHEMA_VERSION).toBe(2)
    expect(DB_VERSION).toBe(1)
  })

  it('round-trips a LinkedIn + phone record, merged on read by combineSources', async () => {
    const record = withImport(linkedinRecord(), 'phone', [PHONE_CONTACT], T2)
    expect(await saveContacts(record)).toEqual({ persisted: true })
    const stored = await loadContacts()
    expect(stored).toEqual(record)
    const { contacts, merged } = combineSources(stored)
    expect(merged).toBe(1)
    expect(contacts).toHaveLength(SAMPLE_CONTACTS.length)
    expect(contacts.find((c) => c.id === 'li-s01')).toMatchObject({ phone: '+212600000004', sources: ['linkedin', 'phone'] })
  })

  it('replaces the previous record whole', async () => {
    await saveContacts(sampleRecord())
    const mine = linkedinRecord([asLinkedin(SAMPLE_CONTACTS[0])])
    await saveContacts(mine)
    expect(await loadContacts()).toEqual(mine)
  })

  it('stores only the Contact fields, in every source', async () => {
    const extra = { ...PHONE_CONTACT, notes: 'should not be stored', raw: ['x'] }
    await saveContacts(withImport(linkedinRecord([{ ...asLinkedin(SAMPLE_CONTACTS[0]), adr: 'x' }]), 'phone', [extra], T2))
    const stored = await loadContacts()
    expect(stored.sources.phone.contacts).toEqual([PHONE_CONTACT])
    expect(stored.sources.linkedin.contacts[0]).not.toHaveProperty('adr')
  })

  it('does not keep a reference to the caller’s objects', async () => {
    const record = sampleRecord([{ ...SAMPLE_CONTACTS[0], sources: ['sample'] }])
    await saveContacts(record)
    record.sources.sample.contacts[0].firstName = 'Changé'
    record.sources.sample.contacts[0].sources.push('phone')
    const [c] = (await loadContacts()).sources.sample.contacts
    expect(c.firstName).toBe(SAMPLE_CONTACTS[0].firstName)
    expect(c.sources).toEqual(['sample'])
  })

  it('accepts a source with an empty list', async () => {
    expect(await saveContacts(linkedinRecord([]))).toEqual({ persisted: true })
    expect(combineSources(await loadContacts()).contacts).toEqual([])
  })

  it('returns persisted:false for anything but a valid v2 record, without throwing or writing', async () => {
    const valid = linkedinRecord()
    const invalid = [
      undefined, null, {}, 'x',
      { contacts: SAMPLE_CONTACTS, isSample: true }, // the v1 call shape
      { ...valid, schemaVersion: 1 },
      { ...valid, isSample: true }, // isSample without sources.sample
      { ...valid, importedAt: 42 },
      { ...valid, sources: {} },
      { ...valid, sources: { instagram: { importedAt: 'x', contacts: [] } } },
      { ...valid, sources: { linkedin: { importedAt: 'x', contacts: 'nope' } } },
      { ...valid, sources: { linkedin: { contacts: [] } } },
      { ...sampleRecord(), sources: { ...sampleRecord().sources, phone: { importedAt: 'x', contacts: [] } } },
    ]
    for (const input of invalid) expect(await saveContacts(input)).toEqual({ persisted: false })
    expect(await databaseNames()).not.toContain(DB_NAME)
  })

  it('a failed save drops the previous record (best effort), so a reload does not bring it back', async () => {
    await saveContacts(sampleRecord())
    const uncloneable = linkedinRecord([{ ...asLinkedin(SAMPLE_CONTACTS[0]), company: () => 'x' }])
    expect(await saveContacts(uncloneable)).toEqual({ persisted: false })
    expect(await loadContacts()).toBeNull()
  })

  it('deletes and ignores a record with an unknown schemaVersion', async () => {
    for (const version of [0, 3, '2', undefined]) {
      await putRaw({ ...linkedinRecord(), schemaVersion: version })
      expect(await loadContacts()).toBeNull()
      expect(await getRaw()).toBeUndefined()
    }
  })

  it('deletes and ignores a malformed record', async () => {
    const malformed = [
      'not a record',
      { schemaVersion: 1, isSample: false, importedAt: 'x', contacts: 'nope' },
      { schemaVersion: 2, isSample: false, importedAt: 'x', contacts: [] },
      { ...linkedinRecord(), sources: { linkedin: { importedAt: 'x', contacts: 'nope' } } },
      { ...linkedinRecord(), sources: { linkedin: { importedAt: 'x', contacts: [] }, other: {} } },
      { ...sampleRecord(), isSample: false },
    ]
    for (const value of malformed) {
      await putRaw(value)
      expect(await loadContacts()).toBeNull()
      expect(await getRaw()).toBeUndefined()
    }
  })
})

describe('v1 → v2 migration', () => {
  const v1 = (isSample, contacts) => ({ schemaVersion: 1, isSample, importedAt: '2026-10-28T08:00:00.000Z', contacts })

  it('migrates a v1 sample record to sources.sample and writes it back', async () => {
    await putRaw(v1(true, SAMPLE_CONTACTS))
    const expected = {
      schemaVersion: 2,
      isSample: true,
      importedAt: '2026-10-28T08:00:00.000Z',
      sources: { sample: { importedAt: '2026-10-28T08:00:00.000Z', contacts: SAMPLE_CONTACTS } },
    }
    expect(await loadContacts()).toEqual(expected)
    expect(await getRaw()).toEqual(expected)
  })

  it('migrates a v1 LinkedIn record to sources.linkedin, keeping the contacts, and writes it back', async () => {
    const contacts = SAMPLE_CONTACTS.map(asLinkedin)
    await putRaw(v1(false, [...contacts.slice(0, 2), { ...contacts[2], extra: 'dropped' }]))
    const stored = await loadContacts()
    expect(stored).toEqual({
      schemaVersion: 2,
      isSample: false,
      importedAt: '2026-10-28T08:00:00.000Z',
      sources: { linkedin: { importedAt: '2026-10-28T08:00:00.000Z', contacts: contacts.slice(0, 3) } },
    })
    expect(await getRaw()).toEqual(stored)
    expect(combineSources(stored).contacts).toEqual(contacts.slice(0, 3))
    // A later phone import keeps the migrated LinkedIn contacts.
    const next = withImport(stored, 'phone', [PHONE_CONTACT], T2)
    expect(await saveContacts(next)).toEqual({ persisted: true })
    expect(Object.keys((await loadContacts()).sources)).toEqual(['linkedin', 'phone'])
  })

  it('still returns the migrated record when the write-back fails', async () => {
    await putRaw(v1(false, SAMPLE_CONTACTS.map(asLinkedin)))
    const originalPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function put() {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
    try {
      const stored = await loadContacts()
      expect(stored.schemaVersion).toBe(2)
      expect(stored.sources.linkedin.contacts).toHaveLength(SAMPLE_CONTACTS.length)
    } finally {
      IDBObjectStore.prototype.put = originalPut
    }
    // The v1 record is still there and migrates again next time.
    expect((await getRaw()).schemaVersion).toBe(1)
    expect((await loadContacts()).schemaVersion).toBe(2)
    expect((await getRaw()).schemaVersion).toBe(2)
  })

  it('clearAllData after a migration leaves nothing', async () => {
    await putRaw(v1(true, SAMPLE_CONTACTS))
    await loadContacts()
    expect(await clearAllData()).toEqual({ cleared: true })
    expect(await loadContacts()).toBeNull()
    expect(await databaseNames()).not.toContain(DB_NAME)
  })
})

describe('clearAllData', () => {
  it('removes the database and every netgraph: key, and nothing else', async () => {
    await saveContacts(sampleRecord())
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
    await saveContacts(sampleRecord())
    await clearAllData()
    expect(await loadContacts()).toBeNull()
    expect(await databaseNames()).not.toContain(DB_NAME)
    expect(localStorage.length).toBe(0)
  })

  it('works when nothing was stored', async () => {
    expect(await clearAllData()).toEqual({ cleared: true })
  })

  it('cleared:true when another connection closes on versionchange', async () => {
    await saveContacts(sampleRecord())
    const other = await openRawConnection({ closeOnVersionChange: true })
    expect(await clearAllData({ blockedTimeoutMs: 200 })).toEqual({ cleared: true })
    expect(await databaseNames()).not.toContain(DB_NAME)
    other.close()
  })

  it('cleared:false when another connection blocks the deletion past the timeout', async () => {
    await saveContacts(sampleRecord())
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
    await saveContacts(sampleRecord())
    await clearAllData()
    expect(await saveContacts(linkedinRecord(SAMPLE_CONTACTS.slice(0, 2).map(asLinkedin)))).toEqual({ persisted: true })
    expect(combineSources(await loadContacts()).contacts).toHaveLength(2)
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
    expect(await saveContacts(sampleRecord())).toEqual({ persisted: false })
    expect(await loadContacts()).toBeNull()
    localStorage.setItem('netgraph:tone', 'vous')
    expect(await clearAllData()).toEqual({ cleared: true })
    expect(localStorage.getItem('netgraph:tone')).toBeNull()
  })

  it('IndexedDB access throws (blocked storage) → persisted:false, no throw', async () => {
    throwingGetter(globalThis, 'indexedDB')
    expect(await saveContacts(sampleRecord())).toEqual({ persisted: false })
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
    expect(await saveContacts(sampleRecord())).toEqual({ persisted: false })
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
    expect(await saveContacts(sampleRecord())).toEqual({ persisted: false })
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
