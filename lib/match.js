// Request → people who can help (#6). Pure, runs in the browser, never throws.
//
//   const index = buildIndex(contacts)            // once per import
//   const { results, requestConcepts } = match('Trouver un DAF', index)
//
// Technique (tech lead, #6): rules and a vocabulary, no AI, no search library.
// 1. Each contact's position and company are normalised (lib/text.js) and searched for
//    vocabulary phrases (lib/vocabulary.js); the company also gets its companyKey (#7).
// 2. The request (first 300 characters) is normalised the same way. A known company
//    named in it is found first (whole companyKey, longest wins); its words are then
//    used for nothing else. The other words give concepts, request-only hints,
//    seniority words (ignored on the request side) and free words.
// 3. Score: concept in the position (strong) or in the company (medium), free word in
//    the position or company (weak), company named in the request (strong), plus small
//    bonuses (same term as typed, hint, seniority). A person is shown only if a concept,
//    a free word or the named company matches their position or company: a hint or
//    seniority alone is never enough (PO, 2026-10-29).
// 4. Order: score desc, then fullName (French collation), then id. At most 10.

import { companyKeyTokens } from './company.js'
import { whyText } from './explain.js'
import { STOPWORDS, contentTokens, scan, stem, tokenize } from './text.js'
import { CONCEPTS, SENIORITY_TERMS } from './vocabulary.js'

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').ContactIndex} ContactIndex */
/** @typedef {import('./types.js').MatchResult} MatchResult */
/** @typedef {import('./types.js').MatchOutput} MatchOutput */
/** @typedef {import('./types.js').MatchOptions} MatchOptions */
/** @typedef {import('./types.js').Reason} Reason */

export const MAX_REQUEST_LENGTH = 300
export const MAX_RESULTS = 10

/** All ranking weights, tuned against lib/fixtures/reference-requests.js. */
export const WEIGHTS = Object.freeze({
  conceptPosition: 10, // a concept of the request is in the position
  conceptCompany: 4, // … or only in the company name
  impliedFactor: 0.5, // concept only implied by the request (« DAF » → finance)
  exactTerm: 2, // the position uses the same term as the request (« private equity »)
  hintPosition: 3, // request-only hint (« mission » → conseil) in the position
  hintCompany: 1, // … in the company name
  termPosition: 5, // a free word of the request is in the position
  termCompany: 4, // … in the company name
  companyMentioned: 9, // the request names the contact's company
  seniority: 1, // the position is senior (directeur, partner, CEO…)
})

const SENIOR = '\u0000senior'

// ---------------------------------------------------------------------------
// Vocabulary, compiled once
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Phrase
 * @property {string} concept   concept id, or SENIOR
 * @property {string} key       stems joined by spaces (identifies the term)
 * @property {string[]} stems
 */

/**
 * @typedef {Object} CompiledVocabulary
 * @property {Map<string, Phrase[]>} byFirst     first stem → phrases starting with it
 * @property {Map<string, string[]>} hints       stem → concept ids
 * @property {Map<string, string[]>} implies     concept id → implied concept ids
 * @property {Map<string, string>} labels        concept id → French label
 * @property {Set<string>} words                 every normalised word and stem of the vocabulary
 */

/** @type {CompiledVocabulary|null} */
let compiled = null

function vocabulary() {
  if (compiled) return compiled
  /** @type {CompiledVocabulary} */
  const v = { byFirst: new Map(), hints: new Map(), implies: new Map(), labels: new Map(), words: new Set() }
  const addPhrase = (concept, term) => {
    const norms = tokenize(term)
    if (norms.length === 0) return
    const stems = norms.map(stem)
    for (const w of norms) v.words.add(w)
    for (const s of stems) v.words.add(s)
    const key = stems.join(' ')
    const list = v.byFirst.get(stems[0]) ?? []
    if (!list.some((p) => p.concept === concept && p.key === key)) list.push({ concept, key, stems })
    v.byFirst.set(stems[0], list)
  }
  for (const c of CONCEPTS) {
    v.labels.set(c.id, c.label)
    if (c.implies?.length) v.implies.set(c.id, [...c.implies])
    for (const t of c.terms) addPhrase(c.id, t)
    for (const h of c.hints ?? []) {
      for (const w of tokenize(h)) {
        const s = stem(w)
        v.words.add(w)
        v.words.add(s)
        const ids = v.hints.get(s) ?? []
        if (!ids.includes(c.id)) ids.push(c.id)
        v.hints.set(s, ids)
      }
    }
  }
  for (const t of SENIORITY_TERMS) addPhrase(SENIOR, t)
  compiled = v
  return v
}

/**
 * Every vocabulary phrase found in a sequence of stems (overlaps allowed).
 *
 * @param {string[]} stems
 * @returns {Array<{ phrase: Phrase, at: number }>}
 */
function findPhrases(stems) {
  const { byFirst } = vocabulary()
  const found = []
  for (let i = 0; i < stems.length; i++) {
    const candidates = byFirst.get(stems[i])
    if (!candidates) continue
    for (const phrase of candidates) {
      const n = phrase.stems.length
      if (i + n > stems.length) continue
      let ok = true
      for (let k = 1; k < n && ok; k++) ok = stems[i + k] === phrase.stems[k]
      if (ok) found.push({ phrase, at: i })
    }
  }
  return found
}

/**
 * True if a normalised word belongs to the vocabulary (concept term, hint or seniority).
 * Used to ignore one-word company names such as « Conseil » (#7 shares this rule).
 *
 * @param {string} word
 * @returns {boolean}
 */
export function isVocabularyWord(word) {
  const { words } = vocabulary()
  return words.has(word) || words.has(stem(word))
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} FieldAnalysis
 * @property {Set<string>} stems                        content words (stemmed)
 * @property {Map<string, Set<string>>} concepts        concept id → term keys found (empty set: implied only)
 * @property {boolean} senior
 */

/** @type {FieldAnalysis} */
const EMPTY_FIELD = Object.freeze({ stems: new Set(), concepts: new Map(), senior: false })

/**
 * @param {string} text
 * @returns {FieldAnalysis}
 */
function analyzeField(text) {
  const stems = tokenize(text).map(stem)
  if (stems.length === 0) return EMPTY_FIELD
  /** @type {Map<string, Set<string>>} */
  const concepts = new Map()
  let senior = false
  for (const { phrase } of findPhrases(stems)) {
    if (phrase.concept === SENIOR) {
      senior = true
      continue
    }
    const keys = concepts.get(phrase.concept) ?? new Set()
    keys.add(phrase.key)
    concepts.set(phrase.concept, keys)
  }
  const { implies } = vocabulary()
  for (const id of [...concepts.keys()]) {
    for (const implied of implies.get(id) ?? []) {
      if (!concepts.has(implied)) concepts.set(implied, new Set())
    }
  }
  return { stems: new Set(stems), concepts, senior }
}

/**
 * @typedef {Object} IndexEntry
 * @property {Contact} contact
 * @property {FieldAnalysis} position
 * @property {FieldAnalysis} company
 * @property {string} companyKey   '' when no company
 */

/**
 * @typedef {Object} ContactIndexData   the shape behind ContactIndex (opaque to the UI;
 *   lib/introducers.js (#7) may read `entries`, `companies` and use findCompanyMentions)
 * @property {1} version
 * @property {IndexEntry[]} entries                  input order; non-object items skipped
 * @property {Map<string, number[]>} companies      companyKey → indexes into entries
 * @property {Set<string>} mentionable              company keys that may be detected in a request
 * @property {number} maxKeyWords
 */

/**
 * Builds the matching index once per import. Never throws; a non-array gives an empty index.
 *
 * @param {ReadonlyArray<Contact>} contacts
 * @returns {ContactIndex}
 */
export function buildIndex(contacts) {
  /** @type {ContactIndexData} */
  const index = { version: 1, entries: [], companies: new Map(), mentionable: new Set(), maxKeyWords: 0 }
  if (!Array.isArray(contacts)) return index
  /** @type {Map<string, FieldAnalysis>} */
  const fieldCache = new Map()
  /** @type {Map<string, string[]>} */
  const keyCache = new Map()
  const field = (value) => {
    if (typeof value !== 'string' || value.trim() === '') return EMPTY_FIELD
    let a = fieldCache.get(value)
    if (!a) {
      a = analyzeField(value)
      fieldCache.set(value, a)
    }
    return a
  }
  for (const contact of contacts) {
    if (!contact || typeof contact !== 'object') continue
    const company = typeof contact.company === 'string' ? contact.company : ''
    let keyWords = keyCache.get(company)
    if (!keyWords) {
      keyWords = companyKeyTokens(company)
      keyCache.set(company, keyWords)
    }
    const key = keyWords.join(' ')
    const i = index.entries.length
    index.entries.push({ contact, position: field(contact.position), company: field(contact.company), companyKey: key })
    if (!key) continue
    const list = index.companies.get(key)
    if (list) {
      list.push(i)
      continue
    }
    index.companies.set(key, [i])
    const single = keyWords.length === 1
    if (single && (keyWords[0].length < 2 || STOPWORDS.has(keyWords[0]) || isVocabularyWord(keyWords[0]))) continue
    index.mentionable.add(key)
    index.maxKeyWords = Math.max(index.maxKeyWords, keyWords.length)
  }
  return index
}

function isIndex(index) {
  return Boolean(index) && typeof index === 'object' && Array.isArray(index.entries) &&
    index.companies instanceof Map && index.mentionable instanceof Set
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} CompanyMention
 * @property {string} key        companyKey found in the request
 * @property {string} surface    the company as typed in the request
 * @property {number[]} tokens   indexes in scan(text) covered by the mention
 * @property {boolean} generic   every non-stopword word of the key is a vocabulary word
 *                               (« Finance Conseil »): its words still count as concepts
 */

/**
 * Known companies named in the request: whole companyKeys of the index, longest first,
 * non-overlapping, in request order. Generic one-word names (« Conseil ») are ignored.
 * Shared with lib/introducers.js (#7). Never throws.
 *
 * @param {string} request       call it with the same (truncated) text you scan
 * @param {ContactIndex} index
 * @returns {CompanyMention[]}   `tokens` are indexes into scan(request)
 */
export function findCompanyMentions(request, index) {
  if (typeof request !== 'string' || !isIndex(index) || index.mentionable.size === 0) return []
  const scanned = scan(request)
  // Same words as companyKey: « & » becomes « et », inside a token (« m&a » → m et a)
  // or between two tokens (« Ernst & Young », « ERNST&YOUNG »).
  const words = []
  const from = [] // scanned token each word belongs to
  const canStart = []
  const canEnd = []
  scanned.forEach((t, i) => {
    if (i > 0 && request.slice(scanned[i - 1].end, t.start).includes('&')) {
      words.push('et')
      from.push(i)
      canStart.push(false)
      canEnd.push(false)
    }
    const parts = t.norm.split('&')
    parts.forEach((part, k) => {
      if (k > 0) {
        words.push('et')
        from.push(i)
        canStart.push(false)
        canEnd.push(false)
      }
      words.push(part)
      from.push(i)
      // A mention starts and ends on whole request words (« m&a » is not « a »).
      canStart.push(k === 0)
      canEnd.push(k === parts.length - 1)
    })
  })
  const mentions = []
  let i = 0
  while (i < words.length) {
    let found = 0
    if (canStart[i]) {
      for (let n = Math.min(index.maxKeyWords, words.length - i); n >= 1; n--) {
        if (!canEnd[i + n - 1]) continue
        const key = words.slice(i, i + n).join(' ')
        if (!index.mentionable.has(key)) continue
        const first = from[i]
        const last = from[i + n - 1]
        const tokens = []
        for (let k = first; k <= last; k++) tokens.push(k)
        const content = key.split(' ').filter((w) => !STOPWORDS.has(w))
        mentions.push({
          key,
          surface: request.slice(scanned[first].start, scanned[last].end),
          tokens,
          generic: content.length > 0 && content.every(isVocabularyWord),
        })
        found = n
        break
      }
    }
    i += found || 1
  }
  return mentions
}

/**
 * @typedef {Object} RequestConcept
 * @property {string} id
 * @property {boolean} implied
 * @property {Set<string>} keys   term keys typed in the request
 */

/**
 * @typedef {Object} AnalyzedRequest
 * @property {RequestConcept[]} concepts
 * @property {string[]} hints                          concept ids hinted (not in concepts)
 * @property {Array<{ stem: string, surface: string }>} terms   free words
 * @property {CompanyMention[]} mentions
 */

/**
 * @param {string} text
 * @param {ContactIndex} index
 * @returns {AnalyzedRequest}
 */
function analyzeRequest(text, index) {
  const scanned = scan(text)
  const mentions = findCompanyMentions(text, index)
  // A company's words are used for nothing else, unless they are all vocabulary words:
  // « Finance Conseil » must not take « finance » and « conseil » from everyone else.
  const consumed = new Set(mentions.filter((m) => !m.generic).flatMap((m) => m.tokens))
  const content = contentTokens(scanned.filter((t, i) => !consumed.has(i)), text)
    .map((t) => ({ stem: stem(t.norm), surface: t.surface }))
  const stems = content.map((t) => t.stem)
  const covered = new Array(content.length).fill(false)

  /** @type {Map<string, RequestConcept>} */
  const concepts = new Map()
  for (const { phrase, at } of findPhrases(stems)) {
    for (let k = 0; k < phrase.stems.length; k++) covered[at + k] = true
    if (phrase.concept === SENIOR) continue
    const c = concepts.get(phrase.concept) ?? { id: phrase.concept, implied: false, keys: new Set() }
    c.keys.add(phrase.key)
    concepts.set(phrase.concept, c)
  }
  const { implies, hints: hintWords } = vocabulary()
  for (const c of [...concepts.values()]) {
    for (const id of implies.get(c.id) ?? []) {
      if (!concepts.has(id)) concepts.set(id, { id, implied: true, keys: new Set() })
    }
  }

  const hints = []
  content.forEach((t, i) => {
    const ids = hintWords.get(t.stem)
    if (!ids) return
    covered[i] = true
    for (const id of ids) if (!concepts.has(id) && !hints.includes(id)) hints.push(id)
  })

  const terms = []
  const seen = new Set()
  content.forEach((t, i) => {
    if (covered[i] || t.stem.length < 2 || seen.has(t.stem)) return
    seen.add(t.stem)
    terms.push(t)
  })

  return { concepts: [...concepts.values()], hints, terms, mentions }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function intersects(a, b) {
  for (const x of a) if (b.has(x)) return true
  return false
}

/**
 * @param {IndexEntry} entry
 * @param {AnalyzedRequest} req
 * @returns {{ score: number, reasons: Reason[] } | null}   null: not shown
 */
function scoreEntry(entry, req) {
  const { labels, implies } = vocabulary()
  let score = 0
  let qualified = false
  /** @type {Array<Reason & { w: number }>} */
  const found = []

  for (const m of req.mentions) {
    if (m.key === entry.companyKey) {
      score += WEIGHTS.companyMentioned
      qualified = true
      found.push({ field: 'company', kind: 'company_mentioned', label: m.surface, w: WEIGHTS.companyMentioned })
    }
  }
  for (const c of req.concepts) {
    const factor = c.implied ? WEIGHTS.impliedFactor : 1
    const inPosition = entry.position.concepts.get(c.id)
    if (inPosition) {
      const w = WEIGHTS.conceptPosition * factor + (!c.implied && intersects(c.keys, inPosition) ? WEIGHTS.exactTerm : 0)
      score += w
      qualified = true
      found.push({ field: 'position', kind: 'concept', concept: c.id, label: labels.get(c.id), w })
    } else if (entry.company.concepts.has(c.id)) {
      const w = WEIGHTS.conceptCompany * factor
      score += w
      qualified = true
      found.push({ field: 'company', kind: 'concept', concept: c.id, label: labels.get(c.id), w })
    }
  }
  for (const t of req.terms) {
    if (entry.position.stems.has(t.stem)) {
      score += WEIGHTS.termPosition
      qualified = true
      found.push({ field: 'position', kind: 'term', label: t.surface, w: WEIGHTS.termPosition })
    } else if (entry.company.stems.has(t.stem)) {
      score += WEIGHTS.termCompany
      qualified = true
      found.push({ field: 'company', kind: 'term', label: t.surface, w: WEIGHTS.termCompany })
    }
  }
  if (!qualified) return null
  for (const id of req.hints) {
    if (entry.position.concepts.has(id)) {
      score += WEIGHTS.hintPosition
      found.push({ field: 'position', kind: 'concept', concept: id, label: labels.get(id), hint: true, w: WEIGHTS.hintPosition })
    } else if (entry.company.concepts.has(id)) {
      score += WEIGHTS.hintCompany
      found.push({ field: 'company', kind: 'concept', concept: id, label: labels.get(id), hint: true, w: WEIGHTS.hintCompany })
    }
  }
  if (entry.position.senior) score += WEIGHTS.seniority

  // « DAF » also counts as finance: say it once (keep the more precise concept).
  const kept = found.filter((r) => r.kind !== 'concept' || !found.some((o) =>
    o !== r && o.kind === 'concept' && o.field === r.field && (implies.get(o.concept) ?? []).includes(r.concept)))
  kept.sort((a, b) => b.w - a.w)
  return { score, reasons: kept.map(({ w, ...reason }) => reason) }
}

const collator = new Intl.Collator('fr')

function limitFrom(options) {
  const limit = options && typeof options === 'object' ? options.limit : undefined
  if (typeof limit !== 'number' || Number.isNaN(limit)) return MAX_RESULTS
  return Math.max(0, Math.min(MAX_RESULTS, Math.floor(limit)))
}

/**
 * Finds the people of the index who can help with the request. Never throws.
 *
 * @param {string} request       as typed; only the first 300 characters are used
 * @param {ContactIndex} index   from buildIndex
 * @param {MatchOptions} [options]
 * @returns {MatchOutput}
 */
export function match(request, index, options) {
  const text = typeof request === 'string' ? request.slice(0, MAX_REQUEST_LENGTH) : ''
  if (!text.trim() || !isIndex(index)) return { results: [], requestConcepts: [] }
  const req = analyzeRequest(text, index)
  const requestConcepts = req.concepts.map((c) => c.id)
  const limit = limitFrom(options)
  if (limit === 0 || (req.concepts.length === 0 && req.terms.length === 0 && req.mentions.length === 0)) {
    return { results: [], requestConcepts }
  }

  const candidates = []
  for (const entry of index.entries) {
    const scored = scoreEntry(entry, req)
    if (scored) candidates.push({ entry, ...scored })
  }
  candidates.sort((a, b) =>
    b.score - a.score ||
    collator.compare(a.entry.contact.fullName ?? '', b.entry.contact.fullName ?? '') ||
    String(a.entry.contact.id ?? '').localeCompare(String(b.entry.contact.id ?? '')))

  /** @type {MatchResult[]} */
  const results = candidates.slice(0, limit).map(({ entry, score, reasons }) => ({
    contact: entry.contact,
    score,
    reasons,
    why: whyText(entry.contact, reasons),
  }))
  return { results, requestConcepts }
}
