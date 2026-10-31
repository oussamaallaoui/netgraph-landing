// Reads a user-chosen file and parses it with lib/linkedin.js.
// Pure apart from file.text(): no storage, no network, no logging.

import { parseLinkedInCsv } from '../../lib/linkedin.js'
import { MAX_FILE_BYTES } from './importErrors.js'

/** @typedef {import('../../lib/types.js').Contact} Contact */

/**
 * @typedef {{ ok: true, contacts: Contact[], skipped: number }
 *         | { ok: false, code: string }} ImportOutcome
 */

/**
 * @param {{ size: number, text: () => Promise<string> }} file  a File (or anything shaped like one)
 * @param {{ parse?: typeof parseLinkedInCsv, maxBytes?: number }} [options]
 * @returns {Promise<ImportOutcome>}
 */
export async function importFile(file, { parse = parseLinkedInCsv, maxBytes = MAX_FILE_BYTES } = {}) {
  if (!file) return { ok: false, code: 'READ_FAILED' }
  if (file.size > maxBytes) return { ok: false, code: 'FILE_TOO_LARGE' }

  let text
  try {
    text = await file.text()
  } catch {
    return { ok: false, code: 'READ_FAILED' }
  }

  const result = parse(text)
  if (!result || result.errors.length > 0) {
    return { ok: false, code: result?.errors[0]?.code ?? 'NOT_LINKEDIN_EXPORT' }
  }
  return { ok: true, contacts: result.contacts, skipped: result.skipped }
}
