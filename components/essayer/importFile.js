// Reads a user-chosen file, works out whether it is a LinkedIn Connections.csv or a phone
// .vcf, and parses it with lib/linkedin.js or lib/vcard.js (#9 contract: detection order
// content → extension → LinkedIn parser; one 50 MB cap for both formats).
// Pure apart from file.text(): no storage, no network, no logging.

import { parseLinkedInCsv } from '../../lib/linkedin.js'
import { isVCardText, parseVCard } from '../../lib/vcard.js'
import { MAX_FILE_BYTES } from './importErrors.js'

/** @typedef {import('../../lib/types.js').Contact} Contact */
/** @typedef {'linkedin'|'phone'} FileSource */

/**
 * @typedef {{ ok: true, source: FileSource, contacts: Contact[], skipped: number, unrecognizedPhones: number }
 *         | { ok: false, code: string, source: FileSource|null }} ImportOutcome
 */

/** The file's extension, lowercased, without the dot ('' when none). */
export function extensionOf(name) {
  const match = /\.([^./\\]+)$/.exec(typeof name === 'string' ? name.trim() : '')
  return match ? match[1].toLowerCase() : ''
}

/** Guess from the name only (used before reading, e.g. for a file that is too large). */
export function sourceFromName(name) {
  const ext = extensionOf(name)
  return ext === 'vcf' || ext === 'vcard' ? 'phone' : 'linkedin'
}

/**
 * Which parser a file goes to, from its text then its name.
 * 'phone' for vCard content or a .vcf/.vcard name, 'linkedin' for a .csv name,
 * null when neither tells (the caller then tries the LinkedIn parser).
 * @param {string} name
 * @param {string} text
 * @returns {FileSource|null}
 */
export function detectSource(name, text) {
  if (isVCardText(text)) return 'phone'
  const ext = extensionOf(name)
  if (ext === 'vcf' || ext === 'vcard') return 'phone'
  if (ext === 'csv') return 'linkedin'
  return null
}

/**
 * @param {{ name?: string, size: number, text: () => Promise<string> }} file  a File (or anything shaped like one)
 * @param {{ maxBytes?: number }} [options]
 * @returns {Promise<ImportOutcome>}
 */
export async function importFile(file, { maxBytes = MAX_FILE_BYTES } = {}) {
  if (!file) return { ok: false, code: 'READ_FAILED', source: null }
  const name = typeof file.name === 'string' ? file.name : ''
  if (file.size > maxBytes) return { ok: false, code: 'FILE_TOO_LARGE', source: sourceFromName(name) }

  let text
  try {
    text = await file.text()
  } catch {
    return { ok: false, code: 'READ_FAILED', source: sourceFromName(name) }
  }

  const detected = detectSource(name, text)
  if (detected === 'phone') {
    const result = parseVCard(text)
    if (!result || result.errors.length > 0) {
      return { ok: false, code: result?.errors[0]?.code ?? 'NOT_VCARD', source: 'phone' }
    }
    return {
      ok: true,
      source: 'phone',
      contacts: result.contacts,
      skipped: result.skipped,
      unrecognizedPhones: result.unrecognizedPhones ?? 0,
    }
  }

  const result = parseLinkedInCsv(text)
  if (!result || result.errors.length > 0) {
    // A .csv that isn't a LinkedIn export keeps the LinkedIn messages; any other file
    // (.txt, .pdf, no extension) that the LinkedIn parser can't read is unsupported.
    if (detected === 'linkedin') {
      return { ok: false, code: result?.errors[0]?.code ?? 'NOT_LINKEDIN_EXPORT', source: 'linkedin' }
    }
    return { ok: false, code: 'UNSUPPORTED_FILE', source: null }
  }
  return { ok: true, source: 'linkedin', contacts: result.contacts, skipped: result.skipped, unrecognizedPhones: 0 }
}
