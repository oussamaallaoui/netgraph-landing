// TEMP stub — replaced by dev-backend's PR (feat/5-import-linkedin-lib).
// Same contract as issue #5 (loadContacts, saveContacts, clearAllData,
// getPreference, setPreference). Minimal IndexedDB wrapper, untested: it only
// exists so the UI builds and can be checked in the browser.

/** @typedef {import('./types.js').StoredContacts} StoredContacts */

const DB = 'netgraph'
const STORE = 'kv'
const KEY = 'contacts'
const PREFIX = 'netgraph:'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('unavailable'))
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(req && req.result)
    t.onerror = () => reject(t.error)
  })
}

/** @returns {Promise<StoredContacts|null>} */
export async function loadContacts() {
  try {
    const db = await openDb()
    const value = await tx(db, 'readonly', s => s.get(KEY))
    db.close()
    return value && value.schemaVersion === 1 ? value : null
  } catch {
    return null
  }
}

/** @returns {Promise<{ persisted: boolean }>} */
export async function saveContacts({ contacts, isSample }) {
  try {
    const db = await openDb()
    const record = { schemaVersion: 1, isSample: !!isSample, importedAt: new Date().toISOString(), contacts }
    await tx(db, 'readwrite', s => s.put(record, KEY))
    db.close()
    return { persisted: true }
  } catch {
    return { persisted: false }
  }
}

/** @returns {Promise<{ cleared: boolean }>}  never rejects (stub: always cleared: true) */
export async function clearAllData() {
  try {
    await new Promise(resolve => {
      const req = indexedDB.deleteDatabase(DB)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  } catch { /* unavailable */ }
  try {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k))
  } catch { /* unavailable */ }
  return { cleared: true }
}

/** @param {'tone'} key @returns {string|null} */
export function getPreference(key) {
  try { return localStorage.getItem(PREFIX + key) } catch { return null }
}

/** @param {'tone'} key @param {string} value */
export function setPreference(key, value) {
  try { localStorage.setItem(PREFIX + key, value) } catch { /* unavailable */ }
}
