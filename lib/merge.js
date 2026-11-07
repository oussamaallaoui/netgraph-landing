// Contact sources (#9, ADR 0002): one stored list per source, merged on read.
// Pure, never mutates its inputs, never logs. Contract: « Découpage tech lead Sprint 3 (2026-11-07) »
// on issue #9, sections « Storage » and « combineSources »; typedefs in lib/types.js.
//
// Merge rule (approximate; the PO accepts misses): same name tokens in any order, ignoring accents,
// case, hyphens and punctuation, at least two tokens, and EXACTLY ONE LinkedIn contact and EXACTLY ONE
// phone contact with that key. Any ambiguity → no merge. No fuzzy matching, no merge on email or phone.

import { normalize } from './text.js'

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').StoredContacts} StoredContacts */
/** @typedef {import('./types.js').CombinedContacts} CombinedContacts */

export const RECORD_SCHEMA_VERSION = 2
export const SOURCES = Object.freeze(['linkedin', 'phone', 'sample'])

/**
 * The merge key of a contact: its first and last name normalised (lib/text.js: accents, case,
 * hyphens, punctuation), split into words, sorted and joined. null with fewer than two words.
 * « Sara Démo », « Démo Sara », « sara demo » → 'demo sara'; « Ben-Ali » = « Ben Ali ».
 *
 * @param {Contact} contact
 * @returns {string|null}
 */
export function nameKey(contact) {
  if (!contact || typeof contact !== 'object') return null
  const first = typeof contact.firstName === 'string' ? contact.firstName : ''
  const last = typeof contact.lastName === 'string' ? contact.lastName : ''
  const words = normalize(`${first} ${last}`).split(' ').filter(Boolean)
  return words.length < 2 ? null : words.sort().join(' ')
}

const present = (value) => (typeof value === 'string' && value.trim() !== '' ? value : null)

/**
 * The next stored record after importing `contacts` from `source` (ADR 0002).
 * - 'sample' replaces everything.
 * - 'linkedin' / 'phone' replace that source only, keep the other one, and drop the sample.
 * `isSample` and `importedAt` follow. The contacts array is copied; the contacts themselves are
 * not (saveContacts copies their fields on write).
 *
 * @param {StoredContacts|null} record   the current record (v2), or null
 * @param {'linkedin'|'phone'|'sample'} source
 * @param {Contact[]} contacts
 * @param {Date} [now]
 * @returns {StoredContacts}
 * @throws {TypeError} for an unknown source or a non-array `contacts` (a programming error)
 */
export function withImport(record, source, contacts, now = new Date()) {
  if (!SOURCES.includes(source)) throw new TypeError('withImport: unknown source')
  if (!Array.isArray(contacts)) throw new TypeError('withImport: contacts must be an array')
  const importedAt = now.toISOString()
  const entry = { importedAt, contacts: [...contacts] }

  if (source === 'sample') {
    return { schemaVersion: RECORD_SCHEMA_VERSION, isSample: true, importedAt, sources: { sample: entry } }
  }

  const previous =
    record && typeof record === 'object' && record.schemaVersion === RECORD_SCHEMA_VERSION && !record.isSample && record.sources
      ? record.sources
      : {}
  const sources = {}
  for (const key of ['linkedin', 'phone']) {
    if (key === source) sources[key] = entry
    else if (previous[key]) sources[key] = previous[key]
  }
  return { schemaVersion: RECORD_SCHEMA_VERSION, isSample: false, importedAt, sources }
}

function sourceContacts(sources, key) {
  const list = sources?.[key]?.contacts
  return Array.isArray(list) ? list.filter((c) => c && typeof c === 'object') : []
}

/**
 * What the UI shows, matches and drafts from: the record's sources merged.
 * - sample set → its contacts, merged 0.
 * - Otherwise LinkedIn contacts in file order, the merged ones in place, then the unmerged phone
 *   contacts in file order. A merged contact is the LinkedIn contact (same id, name, profileUrl,
 *   connectedOn, company and position) plus the phone contact's number; email, company and position
 *   fall back to the phone contact's when LinkedIn has none. sources: ['linkedin', 'phone'].
 * Unmerged contacts are returned as they are (same objects). Never throws on a malformed record.
 *
 * @param {StoredContacts|null} record
 * @returns {CombinedContacts}
 */
export function combineSources(record) {
  const sources = record && typeof record === 'object' ? record.sources : null
  if (!sources || typeof sources !== 'object') return { contacts: [], merged: 0 }
  if (sources.sample) return { contacts: sourceContacts(sources, 'sample'), merged: 0 }

  const linkedin = sourceContacts(sources, 'linkedin')
  const phone = sourceContacts(sources, 'phone')
  if (phone.length === 0) return { contacts: linkedin, merged: 0 }
  if (linkedin.length === 0) return { contacts: phone, merged: 0 }

  // Each key is computed once (normalize is the costly part). The map gives, for each key, the index
  // of its only contact on that side, or -1 when the key appears more than once.
  const index = (keys) => {
    const map = new Map()
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key !== null) map.set(key, map.has(key) ? -1 : i)
    }
    return map
  }
  const linkedinKeyList = linkedin.map(nameKey)
  const linkedinKeys = index(linkedinKeyList)
  const phoneKeys = index(phone.map(nameKey))

  const consumed = new Set()
  const contacts = []
  let merged = 0
  for (let i = 0; i < linkedin.length; i++) {
    const contact = linkedin[i]
    const key = linkedinKeyList[i]
    const phoneIndex = key === null ? undefined : phoneKeys.get(key)
    if (phoneIndex === undefined || phoneIndex === -1 || linkedinKeys.get(key) === -1) {
      contacts.push(contact)
      continue
    }
    const other = phone[phoneIndex]
    consumed.add(phoneIndex)
    merged += 1
    contacts.push({
      ...contact,
      email: present(contact.email) ?? present(other.email),
      company: present(contact.company) ?? present(other.company),
      position: present(contact.position) ?? present(other.position),
      phone: present(other.phone) ?? present(contact.phone),
      sources: ['linkedin', 'phone'],
    })
  }
  for (let i = 0; i < phone.length; i++) {
    if (!consumed.has(i)) contacts.push(phone[i])
  }
  return { contacts, merged }
}
