// LinkedIn Connections.csv → Contact[] (#5). Pure, never throws, runs in the browser.
// Contract: tech lead's breakdown on issue #5 (typedefs in lib/types.js).
// No French copy here: the UI maps error codes to messages (components/essayer/importErrors.js).
// Never log anything from the file: it is personal data of people who never signed up.

import { parseCsv } from './csv.js'

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').ImportError} ImportError */
/** @typedef {import('./types.js').ParseResult} ParseResult */

/** The header row must appear within the first HEADER_SCAN_ROWS rows. */
export const HEADER_SCAN_ROWS = 20

/** More data rows than this gives TOO_MANY_ROWS (LinkedIn's connection limit). */
export const MAX_DATA_ROWS = 30000

// Accepted header names, compared after normalizeHeader(). English names are
// LinkedIn's; French aliases are provisional until the tech lead checks a real export (TL1).
const COLUMN_ALIASES = {
  firstName: ['first name', 'prenom'],
  lastName: ['last name', 'nom', 'nom de famille'],
  profileUrl: ['url', 'profile url', 'url du profil'],
  email: ['email address', 'e-mail address', 'email', 'adresse e-mail', 'adresse email', 'e-mail'],
  company: ['company', 'entreprise', 'societe'],
  position: ['position', 'poste'],
  connectedOn: ['connected on', 'date de connexion', 'connecte le'],
}

/** Columns that must all be present for a row to count as the header. */
const REQUIRED_COLUMNS = ['firstName', 'lastName', 'company', 'position']

const MONTHS = {
  // English (LinkedIn's format: '27 Oct 2026')
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  // French (provisional, accents removed by normalizeWord)
  janv: 1, janvier: 1, fevr: 2, fev: 2, fevrier: 2, mars: 3, avr: 4, avril: 4, mai: 5,
  juin: 6, juil: 7, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11,
  decembre: 12,
}

const LINKEDIN_URL = /^https:\/\/(www\.)?linkedin\.com\/\S*$/i
const SIMPLE_EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** 'Prénom ' → 'prenom', 'First  Name' → 'first name', 'Adresse e-mail' → 'adresse e-mail'. */
export function normalizeHeader(s) {
  return stripAccents(String(s ?? '').replace(/^﻿/, ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeWord(s) {
  return stripAccents(s).toLowerCase().replace(/\.$/, '')
}

/**
 * Map a candidate header row to column indexes, or null if it is not the header.
 * @param {string[]} row
 * @returns {Record<string, number>|null}
 */
function headerColumns(row) {
  const cols = {}
  row.forEach((cell, index) => {
    const name = normalizeHeader(cell)
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (cols[key] === undefined && aliases.includes(name)) {
        cols[key] = index
        break
      }
    }
  })
  return REQUIRED_COLUMNS.every((key) => cols[key] !== undefined) ? cols : null
}

/**
 * LinkedIn's '27 Oct 2026' → '2026-10-27'. Also accepts '27 oct. 2026', '27 octobre 2026',
 * 'YYYY-MM-DD' and 'DD/MM/YYYY'. Returns null if unparseable or not a real date.
 *
 * @param {string} value
 * @returns {string|null}
 */
export function parseConnectedOn(value) {
  const s = String(value ?? '').trim()
  if (!s) return null
  let y
  let m
  let d
  let match
  if ((match = /^(\d{1,2})[\s-]+([A-Za-zÀ-ÿ]+\.?)[\s-]+(\d{4})$/.exec(s))) {
    d = Number(match[1])
    m = MONTHS[normalizeWord(match[2])]
    y = Number(match[3])
  } else if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    y = Number(match[1])
    m = Number(match[2])
    d = Number(match[3])
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) {
    d = Number(match[1])
    m = Number(match[2])
    y = Number(match[3])
  } else {
    return null
  }
  if (!m || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 9999) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Keep only https://www.linkedin.com/… or https://linkedin.com/… URLs, else null.
 * @param {string} value
 * @returns {string|null}
 */
export function cleanProfileUrl(value) {
  const s = String(value ?? '').trim()
  if (!s || s.length > 2000 || !LINKEDIN_URL.test(s)) return null
  try {
    const url = new URL(s)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || (host !== 'www.linkedin.com' && host !== 'linkedin.com')) return null
    if (url.username || url.password || url.port) return null
  } catch {
    return null
  }
  return s
}

/**
 * Simple validity check (something@domain.tld, no spaces), else null.
 * @param {string} value
 * @returns {string|null}
 */
export function cleanEmail(value) {
  const s = String(value ?? '').trim()
  if (!s || s.length > 254 || !SIMPLE_EMAIL.test(s)) return null
  return s
}

function cleanText(value) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim()
  return s || null
}

/** 32-bit FNV-1a over the UTF-16 code units, as 7 base-36 characters. */
export function shortHash(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36).padStart(7, '0')
}

/**
 * 'li-' + short hash of (profileUrl || firstName|lastName|company).
 * Case-insensitive so the same person exported twice gets the same id.
 */
function contactId(profileUrl, firstName, lastName, company) {
  const basis = profileUrl
    ? profileUrl.toLowerCase().replace(/\/+$/, '')
    : `${firstName}|${lastName}|${company ?? ''}`.toLowerCase()
  return `li-${shortHash(basis)}`
}

function isBlankRow(row) {
  return row.every((cell) => cell.trim() === '')
}

/** @param {ImportError['code']} code */
function failure(code, line) {
  /** @type {ImportError} */
  const error = line === undefined ? { code } : { code, line }
  return { contacts: [], errors: [error], skipped: 0 }
}

/**
 * Parse the text of a LinkedIn Connections.csv. Never throws.
 *
 * - Finds the header row (First Name, Last Name, Company, Position, matched by name,
 *   case- and accent-insensitive) in the first 20 rows, skipping LinkedIn's notes.
 * - Keeps only the Contact fields; other columns are dropped.
 * - Rows with neither a first nor a last name are dropped and counted in `skipped`.
 * - Duplicate ids keep the first row (not counted in `skipped`).
 *
 * Errors (then contacts is []):
 * - EMPTY_FILE: no text, or only whitespace.
 * - NOT_LINKEDIN_EXPORT: no header row in the first 20 rows.
 * - TOO_MANY_ROWS: more than 30,000 non-blank data rows.
 * - NO_CONTACTS: header found, zero valid rows.
 * `line` is the 1-based CSV row of the header (NO_CONTACTS, TOO_MANY_ROWS).
 *
 * @param {string} text
 * @returns {ParseResult}
 */
export function parseLinkedInCsv(text) {
  try {
    if (typeof text !== 'string' || text.replace(/^﻿/, '').trim() === '') return failure('EMPTY_FILE')

    const rows = parseCsv(text)
    let headerIndex = -1
    let cols = null
    for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_ROWS); i++) {
      cols = headerColumns(rows[i])
      if (cols) {
        headerIndex = i
        break
      }
    }
    if (!cols) return failure('NOT_LINKEDIN_EXPORT')

    const headerLine = headerIndex + 1
    let dataRows = 0
    for (let i = headerIndex + 1; i < rows.length; i++) {
      if (!isBlankRow(rows[i])) dataRows += 1
    }
    if (dataRows > MAX_DATA_ROWS) return failure('TOO_MANY_ROWS', headerLine)

    const get = (row, key) => (cols[key] === undefined ? '' : row[cols[key]] ?? '')
    /** @type {Contact[]} */
    const contacts = []
    const seen = new Set()
    let skipped = 0

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (isBlankRow(row)) continue
      const firstName = cleanText(get(row, 'firstName')) ?? ''
      const lastName = cleanText(get(row, 'lastName')) ?? ''
      if (!firstName && !lastName) {
        skipped += 1
        continue
      }
      const company = cleanText(get(row, 'company'))
      const profileUrl = cleanProfileUrl(get(row, 'profileUrl'))
      const id = contactId(profileUrl, firstName, lastName, company)
      if (seen.has(id)) continue
      seen.add(id)
      contacts.push({
        id,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        company,
        position: cleanText(get(row, 'position')),
        connectedOn: parseConnectedOn(get(row, 'connectedOn')),
        profileUrl,
        email: cleanEmail(get(row, 'email')),
        phone: null,
        sources: ['linkedin'],
      })
    }

    if (contacts.length === 0) return { ...failure('NO_CONTACTS', headerLine), skipped }
    return { contacts, errors: [], skipped }
  } catch {
    // Defensive: the parser is not expected to throw, but the UI must never crash on a file.
    return failure('NOT_LINKEDIN_EXPORT')
  }
}
