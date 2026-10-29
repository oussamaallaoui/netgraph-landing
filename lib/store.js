// Browser persistence for /essayer (#5, ADR 0001). The only module that touches
// IndexedDB or localStorage.
//
// - Contacts: IndexedDB database 'netgraph', object store 'kv', key 'contacts', one
//   record replaced on each import. No localStorage fallback: if IndexedDB is
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
export const SCHEMA_VERSION = 1
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

function isValidRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.schemaVersion === SCHEMA_VERSION &&
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

/**
 * Load the stored contacts.
 * Resolves to null when nothing is stored, IndexedDB is unavailable or fails, or the
 * record has another schemaVersion or is malformed (that record is then deleted).
 * Never rejects.
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
    if (!isValidRecord(value)) {
      await run(db, 'readwrite', (store) => store.delete(CONTACTS_KEY)).catch(() => {})
      return null
    }
    return value
  } catch {
    return null
  } finally {
    db?.close()
  }
}

/**
 * Replace the stored contacts with this import.
 * Resolves to { persisted: false } when IndexedDB is unavailable or the write fails
 * (the UI then keeps the contacts in memory only). Never rejects.
 *
 * @param {{ contacts: Contact[], isSample: boolean }} input
 * @returns {Promise<SaveResult>}
 */
export async function saveContacts(input) {
  const { contacts, isSample } = input ?? {}
  if (!Array.isArray(contacts) || typeof isSample !== 'boolean') return { persisted: false }
  const idb = getIndexedDB()
  if (!idb) return { persisted: false }

  /** @type {StoredContacts} */
  let record
  try {
    record = {
      schemaVersion: SCHEMA_VERSION,
      isSample,
      importedAt: new Date().toISOString(),
      contacts: contacts.filter((c) => c && typeof c === 'object').map(pickContactFields),
    }
  } catch {
    return { persisted: false }
  }

  let db = null
  try {
    db = await openDb(idb, { createIfMissing: true })
    if (!db) return { persisted: false }
    await run(db, 'readwrite', (store) => store.put(record, CONTACTS_KEY))
    return { persisted: true }
  } catch {
    return { persisted: false }
  } finally {
    db?.close()
  }
}

/**
 * Delete everything NetGraph stored on this device: the whole 'netgraph' IndexedDB
 * database and every localStorage key starting with 'netgraph:'. Never rejects.
 *
 * @returns {Promise<void>}
 */
export async function clearAllData() {
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
  if (!idb) return
  await new Promise((resolve) => {
    try {
      const request = idb.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve(undefined)
      request.onerror = () => resolve(undefined)
      // onblocked: our own connections are closed after each operation and other tabs
      // close theirs on 'versionchange', so success follows.
    } catch {
      resolve(undefined)
    }
  })
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
