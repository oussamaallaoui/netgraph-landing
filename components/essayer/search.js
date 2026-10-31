// Pure helpers and copy for the request and results step of /essayer (#6).
// No React, no DOM, no logging: the request (« demande ») and the contacts stay in memory.
// Copy: PO clarifications on #6 (2026-10-29).

export const REQUEST_LABEL = 'Que cherchez-vous ?'
export const EMPTY_REQUEST_MESSAGE =
  'Décrivez ce que vous cherchez, par exemple un métier, un secteur ou une entreprise.'
export const NO_RESULTS_TITLE = 'Aucune personne de votre réseau ne correspond à cette demande.'
export const NO_RESULTS_HELP = 'Citez un métier, un secteur ou une entreprise. Par exemple :'
export const FEW_RESULTS_TIP = 'Pour élargir la recherche, citez un métier, un secteur ou une entreprise.'
export const WHY_LABEL = 'Pourquoi cette personne'

/** Results at or below this count get the « élargir la recherche » tip (PO: 1 or 2 results). */
export const FEW_RESULTS_MAX = 2

/**
 * The request to search for, or null when there is nothing to search (empty or only spaces).
 * The text is kept as typed: lib/match.js normalises it and applies the 300-character cap.
 * @param {unknown} value
 * @returns {string | null}
 */
export function requestToSearch(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  return value
}

/**
 * Summary announced and shown above the list.
 * « 1 personne de votre réseau peut vous aider » / « 7 personnes de votre réseau peuvent vous aider ».
 * @param {number} n  number of results (≥ 1; 0 uses NO_RESULTS_TITLE)
 */
export function resultsSummary(n) {
  if (!n || n < 1) return NO_RESULTS_TITLE
  return n === 1
    ? '1 personne de votre réseau peut vous aider'
    : `${n} personnes de votre réseau peuvent vous aider`
}

/**
 * Which screen the results area shows.
 * @param {Array<unknown>} results
 * @returns {'none' | 'few' | 'list'}
 */
export function resultsOutcome(results) {
  const n = Array.isArray(results) ? results.length : 0
  if (n === 0) return 'none'
  return n <= FEW_RESULTS_MAX ? 'few' : 'list'
}

/**
 * The href for a contact's LinkedIn profile link, or null when no link must be shown.
 * Only https://www.linkedin.com/… or https://linkedin.com/… (no credentials, no port).
 * Checked again here because the stored record could have been changed on the device.
 * @param {unknown} value
 * @returns {string | null}
 */
export function linkedInHref(value) {
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (!s || s.length > 2000 || !/^https:\/\/(www\.)?linkedin\.com\//i.test(s)) return null
  try {
    const url = new URL(s)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || (host !== 'www.linkedin.com' && host !== 'linkedin.com')) return null
    if (url.username || url.password || url.port) return null
    return url.href
  } catch {
    return null
  }
}

/**
 * Up to two initials for the avatar disc (design system: people appear as initials).
 * « Sara Démo » → « SD »; « Leïla » → « L »; nothing usable → ''.
 * @param {{ firstName?: string | null, lastName?: string | null, fullName?: string | null }} contact
 */
export function initialsOf(contact) {
  const first = typeof contact?.firstName === 'string' ? contact.firstName.trim() : ''
  const last = typeof contact?.lastName === 'string' ? contact.lastName.trim() : ''
  let parts = [first, last].filter(Boolean)
  if (parts.length === 0) {
    const full = typeof contact?.fullName === 'string' ? contact.fullName.trim() : ''
    parts = full.split(/\s+/).filter(Boolean)
    if (parts.length > 2) parts = [parts[0], parts[parts.length - 1]]
  }
  return parts
    .map((p) => Array.from(p.replace(/^[^\p{L}\p{N}]+/u, ''))[0] ?? '')
    .join('')
    .toLocaleUpperCase('fr')
}
