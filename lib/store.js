// Browser persistence for /essayer (#5, ADR 0001). The only module that touches
// IndexedDB or localStorage.
//
// - Contacts: IndexedDB database 'netgraph', object store 'kv', key 'contacts', one
//   record (v2 since #9, ADR 0002: one list per source, built by withImport and merged on
//   read by combineSources in lib/merge.js), written whole on each import. v1 records
//   (Sprints 1–2) are migrated on load. No localStorage fallback: if IndexedDB is
//   unavailable the UI keeps contacts in memory only (saveContacts → persisted: false).
// - Preferences: localStorage 'netgraph:<key>', allow-listed keys only, never contact data.
// - clearAllData(): deletes the whole database and every 'netgraph:*' localStorage key.
//
// Nothing here throws on storage failures (blocked storage, private modes, quota):
// it degrades to "not persisted". Nothing is ever logged.

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').StoredContacts} StoredContacts */
/** @typedef {import('./types.js').SaveResult} SaveResult */
/** @typedef {import('./types.js').PreferenceKey} PreferenceKey */

export const DB_NAME = 'netgraph'
export const DB_VERSION = 1
export const STORE_NAME = 'kv'
export const CONTACTS_KEY = 'contacts'
export const SCHEMA_VERSION = 2
export const PREFERENCE_PREFIX = 'netgraph:'

/** Allowed preference keys. Adding one changes the contract (tech lead). */
const PREFERENCE_KEYS = new Set(['tone'])
const MAX_PREFERENCE_LENGTH = 100

/** Contact fields kept in storage; anything else on the objects is dropped. */
const CONTACT_FIELDS = [
  'id', 'firstName', 'lastName', 'fullName', 'company', 'position',
  'connectedOn', 'profileUrl', 'email', 'phone', 'sources',
]

function getIndexedDB() {
  try {
    const idb = globalThis.indexedDB
    return idb && typeof idb.open === 'function' ? idb : null
  } catch {
    // Some browsers throw on access when storage is blocked.
    return null
  }
}

function getLocalStorage() {
  try {
    const ls = globalThis.localStorage
    return ls && typeof ls.getItem === 'function' ? ls : null
  } catch {
    return null
  }
}

/**
 * Open the database. With `createIfMissing: false`, a database that does not exist
 * yet is not created (the upgrade is aborted) and the promise resolves to null, so
 * reading after clearAllData() leaves no empty 'netgraph' database behind.
 *
 * @param {IDBFactory} idb
 * @param {{ createIfMissing: boolean }} options
 * @returns {Promise<IDBDatabase|null>}
 */
function openDb(idb, { createIfMissing }) {
  return new Promise((resolve, reject) => {
    let request
    try {
      request = idb.open(DB_NAME, DB_VERSION)
    } catch (error) {
      reject(error)
      return
    }
    let aborted = false
    request.onupgradeneeded = (event) => {
      if (!createIfMissing && event.oldVersion === 0) {
        aborted = true
        request.transaction.abort()
        return
      }
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => {
      const db = request.result
      // Let another tab's clearAllData() delete the database without being blocked.
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = (event) => {
      if (aborted) {
        event.preventDefault?.()
        resolve(null)
      } else {
        reject(request.error)
      }
    }
    request.onblocked = () => {
      // An older connection is still open somewhere; success follows once it closes.
    }
  })
}

/**
 * Run one request in a transaction and resolve when the transaction completes.
 * @template T
 * @param {IDBDatabase} db
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} makeRequest
 * @returns {Promise<T>}
 */
function run(db, mode, makeRequest) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const request = makeRequest(tx.objectStore(STORE_NAME))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = () => reject(tx.error ?? request.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

const SOURCE_KEYS = ['sample', 'linkedin', 'phone']

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

function isValidSource(value) {
  return isObject(value) && typeof value.importedAt === 'string' && Array.isArray(value.contacts)
}

/**
 * A v2 record (ADR 0002): sources holds `sample` alone, or one or both of `linkedin` / `phone`,
 * each { importedAt, contacts[] }; isSample ⇔ sources.sample; no other key in sources.
 */
function isValidRecord(value) {
  if (
    !isObject(value) ||
    value.schemaVersion !== SCHEMA_VERSION ||
    typeof value.isSample !== 'boolean' ||
    typeof value.importedAt !== 'string' ||
    !isObject(value.sources)
  ) {
    return false
  }
  const keys = Object.keys(value.sources)
  if (keys.length === 0 || keys.some((key) => !SOURCE_KEYS.includes(key))) return false
  if (!keys.every((key) => isValidSource(value.sources[key]))) return false
  const hasSample = keys.includes('sample')
  if (hasSample && keys.length !== 1) return false
  return value.isSample === hasSample
}

/** The Sprint 1–2 record: { schemaVersion: 1, isSample, importedAt, contacts }. */
function isValidV1Record(value) {
  return (
    isObject(value) &&
    value.schemaVersion === 1 &&
    typeof value.isSample === 'boolean' &&
    typeof value.importedAt === 'string' &&
    Array.isArray(value.contacts)
  )
}

function pickContactFields(contact) {
  const out = {}
  for (const field of CONTACT_FIELDS) {
    const value = contact[field]
    out[field] = field === 'sources' ? (Array.isArray(value) ? [...value] : []) : (value ?? null)
  }
  return out
}

/** A clean copy of a valid v2 record: only the Contact fields, no reference to the caller's objects. */
function cleanRecord(record) {
  const sources = {}
  for (const key of SOURCE_KEYS) {
    const source = record.sources[key]
    if (!source) continue
    sources[key] = {
      importedAt: source.importedAt,
      contacts: source.contacts.filter((c) => c && typeof c === 'object').map(pickContactFields),
    }
  }
  return { schemaVersion: SCHEMA_VERSION, isSample: record.isSample, importedAt: record.importedAt, sources }
}

/** v1 → v2: the sample → sources.sample, a real import → sources.linkedin (the only v1 source). */
function migrateV1(record) {
  const source = { importedAt: record.importedAt, contacts: record.contacts }
  return cleanRecord({
    schemaVersion: SCHEMA_VERSION,
    isSample: record.isSample,
    importedAt: record.importedAt,
    sources: record.isSample ? { sample: source } : { linkedin: source },
  })
}

/**
 * Load the stored contacts record (v2).
 * - A valid v2 record is returned as is.
 * - A valid v1 record is migrated to v2 (sample → sources.sample, otherwise → sources.linkedin),
 *   written back as v2 (best effort: if that write fails, the migrated record is still returned),
 *   and returned.
 * - Resolves to null when nothing is stored, IndexedDB is unavailable or fails, or the record has
 *   an unknown schemaVersion or is malformed (that record is then deleted).
 * Never rejects. Merge the sources with combineSources (lib/merge.js) to get the contacts to show.
 *
 * @returns {Promise<StoredContacts|null>}
 */
export async function loadContacts() {
  const idb = getIndexedDB()
  if (!idb) return null
  let db = null
  try {
    db = await openDb(idb, { createIfMissing: false })
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) return null
    const value = await run(db, 'readonly', (store) => store.get(CONTACTS_KEY))
    if (value === undefined) return null
    if (isValidRecord(value)) return value
    if (isValidV1Record(value)) {
      const migrated = migrateV1(value)
      await run(db, 'readwrite', (store) => store.put(migrated, CONTACTS_KEY)).catch(() => {})
      return migrated
    }
    await run(db, 'readwrite', (store) => store.delete(CONTACTS_KEY)).catch(() => {})
    return null
  } catch {
    return null
  } finally {
    db?.close()
  }
}

/**
 * Replace the stored record with `record` (v2, built by withImport in lib/merge.js), written whole.
 * Only the Contact fields of each contact are kept. Resolves to { persisted: false } when the record
 * is not a valid v2 record (nothing is written), when IndexedDB is unavailable, or when the write
 * fails (the previous record is then deleted, best effort; the UI keeps the contacts in memory
 * only). Never rejects.
 *
 * @param {StoredContacts} record
 * @returns {Promise<SaveResult>}
 */
export async function saveContacts(record) {
  /** @type {StoredContacts} */
  let clean
  try {
    if (!isValidRecord(record)) return { persisted: false }
    clean = cleanRecord(record)
  } catch {
    return { persisted: false }
  }
  const idb = getIndexedDB()
  if (!idb) return { persisted: false }

  let db = null
  try {
    db = await openDb(idb, { createIfMissing: true })
    if (!db) return { persisted: false }
    await run(db, 'readwrite', (store) => store.put(clean, CONTACTS_KEY))
    return { persisted: true }
  } catch {
    // Best effort: drop the previous import so a reload does not bring it back while
    // the UI says the new contacts are kept in memory only.
    if (db) await run(db, 'readwrite', (store) => store.delete(CONTACTS_KEY)).catch(() => {})
    return { persisted: false }
  } finally {
    db?.close()
  }
}

/** How long clearAllData() waits after 'blocked' before reporting cleared: false. */
export const CLEAR_BLOCKED_TIMEOUT_MS = 3000

/**
 * Delete everything NetGraph stored on this device: every localStorage key starting
 * with 'netgraph:' (first), then the whole 'netgraph' IndexedDB database. Never rejects.
 *
 * cleared: true only when deleteDatabase succeeded, or when IndexedDB is unavailable
 * (nothing can have been stored there). cleared: false when deleteDatabase errors or
 * throws, or stays blocked (another tab holds an old connection) for longer than
 * `blockedTimeoutMs`: the data may remain and the UI must not say it was erased.
 *
 * @param {{ blockedTimeoutMs?: number }} [options]   for tests; default 3,000 ms
 * @returns {Promise<import('./types.js').ClearResult>}
 */
export async function clearAllData({ blockedTimeoutMs = CLEAR_BLOCKED_TIMEOUT_MS } = {}) {
  const ls = getLocalStorage()
  if (ls) {
    try {
      const keys = []
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i)
        if (typeof key === 'string' && key.startsWith(PREFERENCE_PREFIX)) keys.push(key)
      }
      for (const key of keys) ls.removeItem(key)
    } catch {
      // Storage blocked: nothing could have been written either.
    }
  }

  const idb = getIndexedDB()
  if (!idb) return { cleared: true }
  const cleared = await new Promise((resolve) => {
    let timer = null
    const done = (value) => {
      if (timer !== null) clearTimeout(timer)
      timer = null
      resolve(value)
    }
    try {
      const request = idb.deleteDatabase(DB_NAME)
      request.onsuccess = () => done(true)
      request.onerror = (event) => {
        event?.preventDefault?.()
        done(false)
      }
      // Our own connections close after each operation and on 'versionchange', so a
      // block means an old connection elsewhere (e.g. an older build in another tab).
      // Success may still follow; give up after the timeout. The deletion request
      // stays queued in the browser and may complete later.
      request.onblocked = () => {
        if (timer === null) timer = setTimeout(() => done(false), blockedTimeoutMs)
      }
    } catch {
      done(false)
    }
  })
  return { cleared }
}

/**
 * Read a UI preference from localStorage ('netgraph:<key>').
 * Returns null for an unknown key, a missing value or when storage is unavailable.
 *
 * @param {PreferenceKey} key
 * @returns {string|null}
 */
export function getPreference(key) {
  if (!PREFERENCE_KEYS.has(key)) return null
  const ls = getLocalStorage()
  if (!ls) return null
  try {
    return ls.getItem(PREFERENCE_PREFIX + key)
  } catch {
    return null
  }
}

/**
 * Store a UI preference in localStorage ('netgraph:<key>'). Never contact data.
 * Ignores unknown keys, non-string values and values over 100 characters;
 * does nothing when storage is unavailable. Never throws.
 *
 * @param {PreferenceKey} key
 * @param {string} value
 * @returns {void}
 */
export function setPreference(key, value) {
  if (!PREFERENCE_KEYS.has(key) || typeof value !== 'string' || value.length > MAX_PREFERENCE_LENGTH) return
  const ls = getLocalStorage()
  if (!ls) return
  try {
    ls.setItem(PREFERENCE_PREFIX + key, value)
  } catch {
    // Quota or blocked storage: the preference is simply not kept.
  }
}
