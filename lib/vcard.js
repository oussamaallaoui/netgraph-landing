// Phone contacts (.vcf, vCard 2.1 / 3.0 / 4.0) → Contact[] (#9). Pure, never throws, never logs,
// runs in the browser. Contract: « Découpage tech lead Sprint 3 (2026-11-07) » on issue #9, section
// « parseVCard »; typedefs in lib/types.js. No French copy here: the UI maps error codes to messages.
//
// Data minimisation (law 09-08 / GDPR, PO §2): only the name, ONE phone number, ONE email, the company
// (first ORG component) and the job title (TITLE) are kept. Everything else (other numbers, addresses,
// birthdays, notes, photos, URLs, social profiles) is dropped at parse time; PHOTO is never decoded.

import { cleanEmail, shortHash, uniqueId } from './linkedin.js'
import { normalizePhone } from './phone.js'

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').ImportError} ImportError */
/** @typedef {import('./types.js').VCardParseResult} VCardParseResult */

/** More cards than this gives TOO_MANY_ROWS (same cap as LinkedIn). */
export const MAX_CARDS = 30000

/** The only properties we read; every other property is skipped without building its value. */
const WANTED = new Set(['N', 'FN', 'TEL', 'EMAIL', 'ORG', 'TITLE'])
const MOBILE_TYPES = new Set(['cell', 'mobile', 'iphone'])
const BEGIN_LINE = /^[ \t]*BEGIN[ \t]*:[ \t]*VCARD[ \t]*$/i
const END_LINE = /^[ \t]*END[ \t]*:[ \t]*VCARD[ \t]*$/i
const ANY_BEGIN_LINE = /^[ \t]*BEGIN[ \t]*:[ \t]*VCARD[ \t]*$/im

/**
 * True if the first non-blank line (after a BOM) is BEGIN:VCARD, case-insensitive.
 * Used by the UI to detect a phone export whatever the file's name.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isVCardText(text) {
  if (typeof text !== 'string') return false
  return /^\s*BEGIN[ \t]*:[ \t]*VCARD[ \t]*(?:\r\n|\r|\n|$)/i.test(text.replace(/^﻿/, ''))
}

/** @param {ImportError['code']} code */
function failure(code, skipped = 0) {
  return { contacts: [], errors: [{ code }], skipped, unrecognizedPhones: 0 }
}

/** Index of the first `:` outside double quotes (4.0 parameter values may be quoted), or -1. */
function valueSeparator(line) {
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') quoted = !quoted
    else if (ch === ':' && !quoted) return i
  }
  return -1
}

/** Split on `sep` outside double quotes. */
function splitOutsideQuotes(s, sep) {
  const parts = []
  let quoted = false
  let start = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '"') quoted = !quoted
    else if (ch === sep && !quoted) {
      parts.push(s.slice(start, i))
      start = i + 1
    }
  }
  parts.push(s.slice(start))
  return parts
}

/** 'item1.TEL;type=CELL' → 'TEL' (the group is ignored). */
function propertyName(head) {
  const semi = head.indexOf(';')
  const full = (semi === -1 ? head : head.slice(0, semi)).trim()
  const dot = full.lastIndexOf('.')
  return (dot === -1 ? full : full.slice(dot + 1)).toUpperCase()
}

/**
 * Parameters of a property head: 2.1 bare (`TEL;CELL;PREF`), 3.0 `TYPE=CELL,VOICE`, 4.0 `TYPE="cell,voice"`.
 * @returns {{ types: Set<string>, encoding: string, charset: string }}
 */
function parseParams(head) {
  const types = new Set()
  let encoding = ''
  let charset = ''
  const parts = splitOutsideQuotes(head, ';').slice(1)
  for (const part of parts) {
    const eq = part.indexOf('=')
    const key = (eq === -1 ? '' : part.slice(0, eq)).trim().toUpperCase()
    const raw = (eq === -1 ? part : part.slice(eq + 1)).trim()
    const values = splitOutsideQuotes(raw, ',').map((v) => v.replace(/"/g, '').trim().toLowerCase()).filter(Boolean)
    if (key === 'ENCODING' || (key === '' && (raw.toUpperCase() === 'QUOTED-PRINTABLE' || raw.toUpperCase() === 'BASE64' || raw.toUpperCase() === 'B'))) {
      encoding = (values[0] ?? '').toUpperCase()
    } else if (key === 'CHARSET') {
      charset = values[0] ?? ''
    } else if (key === 'TYPE' || key === '') {
      for (const v of values) types.add(v)
    }
  }
  return { types, encoding, charset }
}

const isQuotedPrintableHead = (head) => /(?:^|;)\s*(?:ENCODING\s*=\s*)?QUOTED-PRINTABLE\s*(?:;|$)/i.test(head)

/** Quoted-printable → bytes → text in `charset` (UTF-8 by default; ISO-8859-1 / windows-1252 supported). */
function decodeQuotedPrintable(value, charset) {
  const bytes = []
  const encoder = new TextEncoder()
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(value.slice(i + 1, i + 3))) {
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16))
      i += 2
    } else {
      for (const b of encoder.encode(ch)) bytes.push(b)
    }
  }
  if (WINDOWS_1252_LABELS.has(charset)) return decodeWindows1252(bytes)
  let decoder
  try {
    decoder = new TextDecoder(charset || 'utf-8')
  } catch {
    decoder = new TextDecoder('utf-8')
  }
  return decoder.decode(new Uint8Array(bytes))
}

// WHATWG Encoding reads ISO-8859-1 / Latin-1 as windows-1252. Node's TextDecoder decodes 0x80–0x9F
// as C1 controls instead, so we map them ourselves to get the same result in every runtime.
const WINDOWS_1252_LABELS = new Set(['iso-8859-1', 'iso8859-1', 'latin1', 'latin-1', 'windows-1252', 'cp1252', 'us-ascii', 'ascii'])
const CP1252_HIGH = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ'

function decodeWindows1252(bytes) {
  let out = ''
  for (const b of bytes) out += b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] : String.fromCharCode(b)
  return out
}

/** Split a structured value (N, ORG) on unescaped `;`. */
function splitComponents(value) {
  const parts = []
  let current = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === '\\' && i + 1 < value.length) {
      current += ch + value[i + 1]
      i += 1
    } else if (ch === ';') {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts
}

/** 3.0/4.0 escapes: \, \; \\ \n \N. */
function unescapeText(value) {
  return value.replace(/\\([\\,;nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c))
}

function cleanText(value) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim()
  return s || null
}

/**
 * Logical property lines of the file, unfolded. Lines of properties we don't read (PHOTO, NOTE…) are
 * skipped with their continuation lines, without building their value (base64 photos are most of an
 * iPhone export).
 *
 * @param {string[]} lines
 * @returns {Generator<{ head: string, name: string, value: string } | { marker: 'begin' | 'end' }>}
 */
function* logicalLines(lines) {
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    i += 1
    if (BEGIN_LINE.test(line)) {
      yield { marker: 'begin' }
      continue
    }
    if (END_LINE.test(line)) {
      yield { marker: 'end' }
      continue
    }
    if (line.trim() === '' || line[0] === ' ' || line[0] === '\t') continue // stray continuation or blank
    const sep = valueSeparator(line)
    if (sep === -1) continue
    const head = line.slice(0, sep)
    const name = propertyName(head)
    const wanted = WANTED.has(name)
    const qp = isQuotedPrintableHead(head)
    const chunks = wanted ? [line.slice(sep + 1)] : null
    // vCard 2.1 quoted-printable soft breaks: a line ending with '=' continues on the next line.
    if (qp) {
      let last = line
      while (last.endsWith('=') && i < lines.length && !BEGIN_LINE.test(lines[i]) && !END_LINE.test(lines[i])) {
        if (chunks) chunks[chunks.length - 1] = chunks[chunks.length - 1].slice(0, -1)
        last = lines[i]
        if (chunks) chunks.push(last)
        i += 1
      }
    }
    // Folding (3.0/4.0, and 2.1 base64 bodies): a line starting with a space or a tab continues.
    while (i < lines.length && (lines[i][0] === ' ' || lines[i][0] === '\t')) {
      if (chunks) chunks.push(lines[i].slice(1))
      i += 1
    }
    if (chunks) yield { head, name, value: chunks.join('') }
  }
}

/** Decoded text of a property value (QP + charset), before splitting and unescaping. */
function decodedValue(prop) {
  const params = parseParams(prop.head)
  const value = params.encoding === 'QUOTED-PRINTABLE' ? decodeQuotedPrintable(prop.value, params.charset) : prop.value
  return { value, types: params.types }
}

/** One card's properties → the fields we keep. */
function readCard(props) {
  let nFirst = ''
  let nLast = ''
  let fn = ''
  let company = null
  let position = null
  let email = null
  const tels = []
  for (const prop of props) {
    const { value, types } = decodedValue(prop)
    switch (prop.name) {
      case 'N': {
        if (nFirst || nLast) break
        const [family = '', given = '', middle = ''] = splitComponents(value).map((c) => cleanText(unescapeText(c)) ?? '')
        nFirst = [given, middle].filter(Boolean).join(' ')
        nLast = family
        break
      }
      case 'FN':
        if (!fn) fn = cleanText(unescapeText(value)) ?? ''
        break
      case 'ORG':
        if (company === null) company = cleanText(unescapeText(splitComponents(value)[0] ?? ''))
        break
      case 'TITLE':
        if (position === null) position = cleanText(unescapeText(value))
        break
      case 'EMAIL':
        if (email === null) email = cleanEmail(unescapeText(value))
        break
      case 'TEL': {
        const raw = unescapeText(value).trim()
        if (raw) tels.push({ raw, types })
        break
      }
      default:
        break
    }
  }

  let firstName = nFirst
  let lastName = nLast
  if (!firstName && !lastName && fn) {
    const space = fn.indexOf(' ')
    firstName = space === -1 ? fn : fn.slice(0, space)
    lastName = space === -1 ? '' : fn.slice(space + 1)
  }

  const accepted = []
  for (const tel of tels) {
    const e164 = normalizePhone(tel.raw)
    if (e164) accepted.push({ e164, types: tel.types })
  }
  const pick =
    accepted.find((t) => [...t.types].some((type) => MOBILE_TYPES.has(type))) ??
    accepted.find((t) => t.e164.startsWith('+2126') || t.e164.startsWith('+2127')) ??
    accepted[0]

  return {
    firstName,
    lastName,
    company,
    position,
    email,
    phone: pick ? pick.e164 : null,
    hadTel: tels.length > 0,
  }
}

/**
 * Parse the text of a .vcf export (Android vCard 2.1, iPhone vCard 3.0, vCard 4.0). Never throws.
 *
 * - BOM stripped, CRLF/CR → LF, folded lines and quoted-printable soft breaks unfolded.
 * - `[group.]NAME[;params]:value`: groups (Apple's item1.TEL) ignored; names and parameters
 *   case-insensitive; QUOTED-PRINTABLE decoded with CHARSET (UTF-8 by default).
 * - Name from N (Given [+ Middle] / Family), else FN split on the first space. No name → skipped.
 * - Phone: among the TEL values normalizePhone accepts, the first typed CELL/MOBILE/IPHONE, else the
 *   first Moroccan mobile (+2126/+2127), else the first. Email: the first that passes cleanEmail.
 * - A card without END:VCARD ends at the next BEGIN:VCARD or at the end of the file.
 * - id = 'ph-' + shortHash(basis), basis = 'tel:<E.164>' if a phone, else 'name:first|last|company'
 *   lowercased. A repeated basis is skipped (first kept). contacts.length + skipped === number of cards.
 * - unrecognizedPhones: imported contacts with at least one TEL but none accepted (phone: null).
 *
 * Errors (then contacts is []): EMPTY_FILE · NOT_VCARD (no BEGIN:VCARD line) · NO_CONTACTS ·
 * TOO_MANY_ROWS (more than 30,000 cards).
 *
 * @param {string} text
 * @returns {VCardParseResult}
 */
export function parseVCard(text) {
  try {
    if (typeof text !== 'string') return failure('EMPTY_FILE')
    const body = text.replace(/^﻿/, '')
    if (body.trim() === '') return failure('EMPTY_FILE')
    if (!ANY_BEGIN_LINE.test(body)) return failure('NOT_VCARD')

    const lines = body.split(/\r\n|\r|\n/)
    let cardCount = 0
    for (const line of lines) if (BEGIN_LINE.test(line)) cardCount += 1
    if (cardCount > MAX_CARDS) return failure('TOO_MANY_ROWS')

    /** @type {Contact[]} */
    const contacts = []
    const seenBases = new Set()
    const usedIds = new Set()
    let skipped = 0
    let unrecognizedPhones = 0
    let current = null

    const finish = () => {
      if (current === null) return
      const card = readCard(current)
      current = null
      if (!card.firstName && !card.lastName) {
        skipped += 1
        return
      }
      const basis = card.phone
        ? `tel:${card.phone}`
        : `name:${card.firstName}|${card.lastName}|${card.company ?? ''}`.toLowerCase()
      if (seenBases.has(basis)) {
        skipped += 1
        return
      }
      seenBases.add(basis)
      if (card.hadTel && !card.phone) unrecognizedPhones += 1
      contacts.push({
        id: uniqueId(`ph-${shortHash(basis)}`, usedIds),
        firstName: card.firstName,
        lastName: card.lastName,
        fullName: `${card.firstName} ${card.lastName}`.trim(),
        company: card.company,
        position: card.position,
        connectedOn: null,
        profileUrl: null,
        email: card.email,
        phone: card.phone,
        sources: ['phone'],
      })
    }

    for (const item of logicalLines(lines)) {
      if ('marker' in item) {
        if (item.marker === 'begin') {
          finish()
          current = []
        } else {
          finish()
        }
      } else if (current !== null) {
        current.push(item)
      }
    }
    finish()

    if (contacts.length === 0) return failure('NO_CONTACTS', skipped)
    return { contacts, errors: [], skipped, unrecognizedPhones }
  } catch {
    // Defensive: the parser is not expected to throw, but the UI must never crash on a file.
    return failure('NOT_VCARD')
  }
}
