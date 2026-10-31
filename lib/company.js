// Company keys (#7 contract, built in #6 because buildIndex stores them).
//
// companyKey('ATLAS CONSEIL SA')        → 'atlas conseil'
// companyKey('Oasis Capital Démo SARL') → 'oasis capital demo'
// companyKey('FICTIVA BANQUE')          → 'fictiva banque'
//
// Lowercase, accents stripped, « & » → « et », punctuation → space, spaces collapsed,
// then trailing legal suffixes removed repeatedly. Elisions are dropped like everywhere
// else in lib/text.js (« L'Atelier » → « atelier »), so a key can be found in a request
// tokenised the same way. No fuzzy matching (typos) this sprint.

import { scan } from './text.js'

/** Trailing legal forms removed from a company name (one or two words). */
export const LEGAL_SUFFIXES = Object.freeze([
  'sa', 's a', 'sas', 'sasu', 'sarl', 'sarlau', 'sarl au', 'snc', 'ltd', 'limited', 'llc', 'inc',
  'corp', 'co', 'plc', 'gmbh', 'ag', 'bv', 'nv', 'spa', 'group', 'groupe',
])

const SUFFIXES = new Set(LEGAL_SUFFIXES)

/**
 * Company name → tokens of its key (stopwords kept, « & » → « et »).
 *
 * @param {unknown} name
 * @returns {string[]}
 */
export function companyKeyTokens(name) {
  if (typeof name !== 'string') return []
  const tokens = scan(name.replace(/&/g, ' et ')).map((t) => t.norm)
  for (;;) {
    const n = tokens.length
    if (n >= 2 && SUFFIXES.has(`${tokens[n - 2]} ${tokens[n - 1]}`)) tokens.length = n - 2
    else if (n >= 1 && SUFFIXES.has(tokens[n - 1])) tokens.length = n - 1
    // « Atlas & Co » → « atlas et » → « atlas »
    else if (n >= 2 && tokens[n - 1] === 'et') tokens.length = n - 1
    else break
  }
  return tokens
}

/**
 * @param {string|null|undefined} name
 * @returns {string}   '' for an empty name, or one made only of legal suffixes
 */
export function companyKey(name) {
  return companyKeyTokens(name).join(' ')
}
