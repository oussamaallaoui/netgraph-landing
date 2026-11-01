// Who can introduce me at a company (#7). Pure, runs in the browser, never throws, no logging.
//
//   const index = buildIndex(contacts)                                 // lib/match.js, once per import
//   introducers("Rencontrer le DAF d'Atlas Conseil", index)
//   → { status: 'found', companyLabel: 'Atlas Conseil', people: [{ contact, why }, …], total: 3 }
//
// Contract: « Découpage tech lead Sprint 2 (2026-11-01) » on issue #7. Introducers come only
// from the user's own file: every contact whose companyKey is the one named in the request.
//
// How the company is found, on the same first 300 characters as match():
// 1. Known company: the first mention from findCompanyMentions (lib/match.js) that is not
//    generic. A generic mention (every word is a vocabulary word, « Finance Conseil ») counts
//    only right after a cue, so « Trouver un DAF finance conseil » opens no section.
// 2. Unknown company: a cue (MENTION_CUES) followed by a name. The name runs to the end of the
//    text, a punctuation mark, a clause word (« pour », « afin »…) or 6 words; leading articles
//    are dropped. A pronoun (« chez moi »), an indefinite name (« chez un cabinet »), or a name
//    made only of stopwords and vocabulary words gives `no_company`; anything else `not_found`.
// 3. Otherwise `no_company`.

import { introducerWhy } from './explain.js'
import { MAX_REQUEST_LENGTH, findCompanyMentions, isVocabularyWord } from './match.js'
import { STOPWORDS, scan } from './text.js'

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').ContactIndex} ContactIndex */
/** @typedef {import('./types.js').Introducer} Introducer */
/** @typedef {import('./types.js').IntroducersResult} IntroducersResult */
/** @typedef {import('./text.js').ScannedToken} ScannedToken */

export const MAX_INTRODUCERS = 20

/** At most this many words are taken as an unknown company name after a cue. */
export const MAX_NAME_WORDS = 6

/** Role words that make « {rôle} de X » a cue (normalised: lowercase, no accent). */
export const ROLE_WORDS = Object.freeze([
  'daf', 'raf', 'cfo', 'ceo', 'coo', 'cto', 'cmo', 'cio', 'pdg', 'dg', 'drh', 'dsi', 'vp',
  'directeur', 'directrice', 'directeurs', 'directrices', 'dirigeant', 'dirigeante', 'dirigeants',
  'responsable', 'responsables', 'head', 'manager', 'chef', 'associe', 'associee', 'partner',
  'fondateur', 'fondatrice', 'cofondateur', 'cofondatrice', 'president', 'presidente',
  'gerant', 'gerante', 'patron', 'patronne', 'founder', 'director',
])

/**
 * The cues after which a company name is expected, in normalised words (lib/text.js).
 * `then` says what follows the cue words:
 * - 'name': the name starts right after (« chez X », « at X »);
 * - 'de':   « de », « du » or an elided « d' » comes first (« au sein de X », « au sein d'X »);
 * - 'a|de': « à », « de », « du » or « d' » comes first (« quelqu'un à X », « quelqu'un de X »).
 * `elided` is a word that scan() drops before the first cue word and must be there (« quelqu' »).
 * `role: true` stands for any ROLE_WORDS word, with up to 3 words before « de » (« le directeur
 * des achats de X »). Extend this list, not the code.
 */
export const MENTION_CUES = Object.freeze([
  Object.freeze({ words: Object.freeze(['chez']), then: 'name' }),
  Object.freeze({ words: Object.freeze(['au', 'sein']), then: 'de' }),
  Object.freeze({ words: Object.freeze(['at']), then: 'name' }),
  Object.freeze({ words: Object.freeze(['un']), elided: 'quelqu', then: 'a|de' }), // « quelqu'un » (scan drops « quelqu' »)
  Object.freeze({ words: Object.freeze(['quelqu', 'un']), then: 'a|de' }), // « quelqu un »
  Object.freeze({ words: Object.freeze(['quelquun']), then: 'a|de' }),
  Object.freeze({ role: true, then: 'de' }),
])

/** Dropped at the start of a name (« chez la Fictiva » → « Fictiva »). */
const LEADING_ARTICLES = new Set(['le', 'la', 'les', 'the'])

/** A name starting with one of these is not a specific company (« chez un cabinet de conseil »). */
const INDEFINITE = new Set(['un', 'une', 'des', 'a', 'an', 'quelques', 'certains', 'certaines'])

/** « chez moi », « chez eux »… */
const PRONOUNS = new Set(['moi', 'nous', 'vous', 'eux', 'lui', 'elle', 'elles', 'toi', 'soi', 'me', 'us', 'you', 'them', 'him', 'her'])

/** Words that start a new clause and end a name (« chez Zéroboîte pour une mission »). */
const CLAUSE_WORDS = new Set(['pour', 'afin', 'qui', 'que', 'avec', 'sur', 'dans', 'car', 'mais', 'for', 'to', 'with', 'who', 'about'])

/** Punctuation that ends a name. Apostrophes, hyphens and « & » belong to names. */
const NAME_BREAK = /[.,;:!?()[\]{}«»"“”/|\n\r\t…]/

const ROLES = new Set(ROLE_WORDS)
const collator = new Intl.Collator('fr')

/** @returns {IntroducersResult} */
function noCompany() {
  return { status: 'no_company', companyLabel: null, people: [], total: 0 }
}

function isIndex(index) {
  return Boolean(index) && typeof index === 'object' && Array.isArray(index.entries) && index.companies instanceof Map
}

/**
 * True if the token at i is preceded, in the text, by an elided « d' » (scan drops it).
 *
 * @param {string} text
 * @param {ScannedToken[]} tokens
 * @param {number} i
 */
function elidedDe(text, tokens, i) {
  return elidedBefore(text, tokens, i, 'd')
}

/**
 * True if the token at i is preceded by the elided word `word` + apostrophe (« d' », « quelqu' »).
 *
 * @param {string} text
 * @param {ScannedToken[]} tokens
 * @param {number} i
 * @param {string} word   lowercase, no accent
 */
function elidedBefore(text, tokens, i, word) {
  if (i >= tokens.length) return false
  const before = text.slice(i > 0 ? tokens[i - 1].end : 0, tokens[i].start)
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${word}['’ʼ‘\`´]\\s*$`, 'iu').test(before)
}

/** No punctuation between token i - 1 and token i. */
function joined(text, tokens, i) {
  return i > 0 && i < tokens.length && !NAME_BREAK.test(text.slice(tokens[i - 1].end, tokens[i].start))
}

/**
 * Where the name starts after « de » / « du » / « d' » at token i, or -1.
 */
function afterDe(text, tokens, i) {
  if (i >= tokens.length || (i > 0 && !joined(text, tokens, i))) return -1
  if (tokens[i].norm === 'de' || tokens[i].norm === 'du') return i + 1
  if (elidedDe(text, tokens, i)) return i
  return -1
}

/**
 * Token indexes where a company name may start, in request order (one per cue found).
 *
 * @param {string} text
 * @param {ScannedToken[]} tokens
 * @returns {number[]}
 */
function cueStarts(text, tokens) {
  const starts = []
  for (let i = 0; i < tokens.length; i++) {
    for (const cue of MENTION_CUES) {
      let next = -1 // first token after the cue words
      if (cue.role) {
        if (!ROLES.has(tokens[i].norm)) continue
        next = i + 1
      } else {
        const n = cue.words.length
        if (i + n > tokens.length) continue
        let ok = true
        for (let k = 0; k < n && ok; k++) ok = tokens[i + k].norm === cue.words[k] && (k === 0 || joined(text, tokens, i + k))
        if (!ok) continue
        if (cue.elided && !elidedBefore(text, tokens, i, cue.elided)) continue
        next = i + n
      }
      let start = -1
      if (cue.then === 'name') {
        start = next < tokens.length && joined(text, tokens, next) ? next : -1
      } else if (cue.then === 'a|de') {
        start = next < tokens.length && joined(text, tokens, next) && tokens[next].norm === 'a' ? next + 1 : afterDe(text, tokens, next)
      } else if (cue.role) {
        // « le DAF de X », « le directeur financier de X », « le directeur des achats de X »
        for (let j = next; j <= next + 3 && j < tokens.length && start === -1; j++) {
          if (!joined(text, tokens, j) || CLAUSE_WORDS.has(tokens[j].norm)) break
          start = afterDe(text, tokens, j)
        }
      } else {
        start = afterDe(text, tokens, next)
      }
      if (start !== -1 && start < tokens.length && !starts.includes(start)) starts.push(start)
    }
  }
  return starts
}

/** Skips leading articles: the index of the first name word. */
function skipArticles(tokens, start) {
  let i = start
  while (i < tokens.length && LEADING_ARTICLES.has(tokens[i].norm)) i++
  return i
}

/**
 * The unknown company named after a cue at `start`, as typed, or null.
 *
 * @param {string} text
 * @param {ScannedToken[]} tokens
 * @param {number} start
 * @returns {string|null}
 */
function nameAt(text, tokens, start) {
  const first = skipArticles(tokens, start)
  if (first >= tokens.length || (first > start && !joined(text, tokens, first))) return null
  const head = tokens[first].norm
  if (PRONOUNS.has(head) || INDEFINITE.has(head)) return null
  let last = first
  while (last + 1 < tokens.length && last + 1 - first < MAX_NAME_WORDS &&
    joined(text, tokens, last + 1) && !CLAUSE_WORDS.has(tokens[last + 1].norm)) last++
  const words = tokens.slice(first, last + 1)
  if (words.every((t) => STOPWORDS.has(t.norm) || isVocabularyWord(t.norm))) return null
  // Keep an elision attached to the name as typed (« chez L'Oréal Démo »).
  let from = tokens[first].start
  const before = text.slice(first > 0 ? tokens[first - 1].end : 0, from)
  const elision = /(?:^|[^\p{L}\p{N}])(l['’ʼ])$/iu.exec(before)
  if (elision && first === start) from -= elision[1].length
  const label = text.slice(from, tokens[last].end).trim().replace(/[\s.,;:!?…'’-]+$/u, '')
  return label || null
}

/**
 * The most frequent `company` spelling among the entries, trimmed (ties: first in file order).
 *
 * @param {Array<{ contact: Contact }>} entries   in file order
 */
function bestLabel(entries) {
  /** @type {Map<string, number>} */
  const counts = new Map()
  let best = ''
  let bestCount = 0
  for (const { contact } of entries) {
    const spelling = typeof contact.company === 'string' ? contact.company.trim() : ''
    if (!spelling) continue
    const n = (counts.get(spelling) ?? 0) + 1
    counts.set(spelling, n)
    if (n > bestCount) {
      best = spelling
      bestCount = n
    }
  }
  return best
}

/**
 * @param {ContactIndex} index
 * @param {string} key
 * @returns {IntroducersResult}
 */
function found(index, key) {
  const entries = (index.companies.get(key) ?? [])
    .map((i) => index.entries[i])
    .filter((e) => e && e.contact && typeof e.contact === 'object')
  if (entries.length === 0) return noCompany()
  const companyLabel = bestLabel(entries)
  const sorted = [...entries].sort((a, b) =>
    collator.compare(String(a.contact.fullName ?? ''), String(b.contact.fullName ?? '')) ||
    String(a.contact.id ?? '').localeCompare(String(b.contact.id ?? '')))
  /** @type {Introducer[]} */
  const people = sorted.slice(0, MAX_INTRODUCERS).map(({ contact }) => ({ contact, why: introducerWhy(contact, companyLabel) }))
  return { status: 'found', companyLabel, people, total: entries.length }
}

/**
 * Who in the user's own file works at the company named in the request. Never throws.
 *
 * @param {string} request       as typed; only the first 300 characters are used (as match())
 * @param {ContactIndex} index   from buildIndex (lib/match.js)
 * @returns {IntroducersResult}
 */
export function introducers(request, index) {
  try {
    if (typeof request !== 'string' || !isIndex(index)) return noCompany()
    const text = request.slice(0, MAX_REQUEST_LENGTH)
    if (!text.trim()) return noCompany()
    const tokens = scan(text)
    const starts = cueStarts(text, tokens)
    // A name right after a cue, articles skipped (« chez la Finance Conseil »).
    const afterCue = new Set(starts.map((s) => skipArticles(tokens, s)))

    for (const m of findCompanyMentions(text, index)) {
      if (!m.generic || afterCue.has(m.tokens[0])) {
        const result = found(index, m.key)
        if (result.status === 'found') return result
      }
    }
    for (const start of starts) {
      const name = nameAt(text, tokens, start)
      if (name) return { status: 'not_found', companyLabel: name, people: [], total: 0 }
    }
    return noCompany()
  } catch {
    return noCompany()
  }
}
