// Text normalisation for matching (#6) and company keys (#7). Pure, no DOM, no dependency.
//
// normalize('Directrice Financière chez L’Oréal') → 'directrice financiere chez oreal'
// tokenize('Je veux trouver un DAF')               → ['daf']
// stem('directrices')                              → 'directeur'
//
// Rules: lowercase; accents stripped (NFD); œ → oe, æ → ae, ß → ss; typographic
// apostrophes → '; French elisions dropped (l', d', qu', j', n', s', c', m', t', jusqu'…);
// inclusive writing keeps the first form (« Directeur·rice » → directeur); everything that
// is not a letter or a digit separates words, except « M&A », « R&D », « AT&T » (short
// parts joined by &, also written « M & A ») which stay one token.

const COMBINING_MARKS = /[̀-ͯ]/g

const CHAR_FOLDS = {
  'œ': 'oe', 'æ': 'ae', 'ß': 'ss', 'ø': 'o', 'đ': 'd', 'ł': 'l',
  '’': "'", 'ʼ': "'", '‘': "'", '`': "'", '´': "'", 'ʹ': "'", '′': "'",
  '•': '·', '⋅': '·', '∙': '·',
}

/** Elided French words that are dropped when followed by an apostrophe. */
const ELISIONS = new Set(['l', 'd', 'j', 'm', 'n', 's', 't', 'c', 'qu', 'jusqu', 'lorsqu', 'puisqu', 'quoiqu'])

/**
 * Stopwords, applied to the request and to contact fields alike (so phrases match the same
 * way on both sides). French and English grammar words, the generic words of a request
 * (« trouver », « rencontrer », « quelqu'un », « find »…), and the leftovers of inclusive or
 * parenthesised endings (« consultant(e) » → consultant + e).
 */
export const STOPWORDS = new Set([
  // French grammar
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'cet', 'cette', 'chez', 'comme', 'd', 'dans', 'de', 'des', 'du',
  'elle', 'elles', 'en', 'entre', 'et', 'eux', 'il', 'ils', 'je', 'j', 'l', 'la', 'le', 'les', 'leur', 'leurs',
  'lui', 'ma', 'me', 'mes', 'moi', 'mon', 'ne', 'ni', 'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas', 'plus',
  'pour', 'qu', 'que', 'qui', 'quoi', 'sa', 'sans', 'se', 'ses', 'son', 'sur', 'ta', 'te', 'tes', 'toi', 'ton',
  'tu', 'un', 'une', 'vos', 'votre', 'vous', 'y', 'est', 'sont', 'suis', 'etre', 'ete', 'ai', 'avoir', 'ont',
  'aupres', 'via', 'vers', 'tout', 'tous', 'toute', 'toutes', 'tres', 'bien', 'aussi', 'si', 'mais', 'donc',
  'quelqu', 'quelque', 'quelques', 'quelquun', 'autre', 'autres', 'afin', 'certain', 'certaine', 'sous',
  'dont', 'cela', 'ca', 'ici', 'c', 'm', 'n', 's', 't',
  // English grammar
  'an', 'and', 'any', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'i', 'in', 'into', 'is', 'it', 'its',
  'me', 'my', 'of', 'on', 'or', 'our', 'the', 'their', 'to', 'us', 'we', 'who', 'with', 'within', 'some',
  'someone', 'somebody', 'anyone', 'this', 'that', 'these', 'those',
  // Generic request words (FR)
  'trouver', 'trouve', 'chercher', 'cherche', 'recherche', 'rechercher', 'rencontrer', 'rencontre',
  'contacter', 'joindre', 'parler', 'echanger', 'connaitre', 'besoin', 'aide', 'aider', 'veux', 'voudrais',
  'souhaite', 'souhaiterais', 'aimerais', 'aimer', 'pouvoir', 'peut', 'peux', 'faut', 'presente', 'presentee',
  'presenter', 'presentation', 'introduire', 'introduit', 'mettre', 'relation', 'relations', 'contact',
  'contacts', 'personne', 'personnes', 'gens', 'reseau', 'expert', 'experte', 'experts', 'specialiste',
  'specialistes', 'professionnel', 'professionnelle', 'prochaine', 'prochain', 'nouveau', 'nouvelle',
  'nouveaux', 'nouvelles', 'bon', 'bonne', 'meilleur', 'meilleure',
  // Generic request words (EN)
  'find', 'finding', 'looking', 'look', 'meet', 'meeting', 'reach', 'talk', 'introduce', 'introduced',
  'introduction', 'need', 'want', 'would', 'like', 'help', 'get', 'new', 'next', 'good', 'best', 'people',
  'person', 'specialist',
  // Endings left by « (e) », « ·rice »…
  'e', 'es', 'ne', 'nne', 'rice', 'trice', 'ere', 'euse',
])

/**
 * Lowercase and strip accents character by character, keeping, for every output
 * character, the index of the input character it came from (to quote words as typed).
 *
 * @param {string} text
 * @returns {{ folded: string, origin: number[] }}
 */
function fold(text) {
  let folded = ''
  const origin = []
  let i = 0
  for (const ch of text) {
    const lower = ch.normalize('NFD').toLowerCase().replace(COMBINING_MARKS, '')
    const out = CHAR_FOLDS[lower] ?? lower
    for (let k = 0; k < out.length; k++) {
      folded += out[k]
      origin.push(i)
    }
    i += ch.length
  }
  return { folded, origin }
}

// 1. « M & A », « m&a »: a single letter, &, a single letter.
// 2. Words, with inner apostrophes, & and inclusive-writing dots.
const TOKEN_RE = /(?<![\p{L}\p{N}])\p{L}[ \t]*&[ \t]*\p{L}(?![\p{L}\p{N}])|[\p{L}\p{N}]+(?:['&·][\p{L}\p{N}]+)*/gu

/**
 * @typedef {Object} ScannedToken
 * @property {string} norm      normalised word (lowercase, no accent, elision dropped)
 * @property {string} surface   the word as typed in the input
 * @property {number} start     index in the input
 * @property {number} end       index after the word in the input
 */

/**
 * Splits text into normalised words, keeping where each came from. Stopwords are kept.
 *
 * @param {unknown} text
 * @returns {ScannedToken[]}
 */
export function scan(text) {
  if (typeof text !== 'string' || text.length === 0) return []
  const { folded, origin } = fold(text)
  const tokens = []
  const push = (norm, from, to) => {
    if (!norm) return
    const start = origin[from]
    const end = to < origin.length ? origin[to] : text.length
    tokens.push({ norm, surface: text.slice(start, end), start, end })
  }
  for (const m of folded.matchAll(TOKEN_RE)) {
    const raw = m[0]
    const at = m.index
    if (raw.includes('&') && !raw.includes("'") && !raw.includes('·')) {
      const compact = raw.replace(/[ \t]+/g, '')
      const parts = compact.split('&')
      if (parts.every((p) => p.length <= 2)) {
        push(compact, at, at + raw.length)
        continue
      }
    }
    // Split on apostrophes and &; drop elisions; keep the first form of inclusive writing.
    let offset = 0
    const pieces = raw.split(/(['&])/)
    for (let p = 0; p < pieces.length; p++) {
      const piece = pieces[p]
      const pieceStart = at + offset
      offset += piece.length
      if (piece === "'" || piece === '&' || piece === '') continue
      if (pieces[p + 1] === "'" && ELISIONS.has(piece) && p + 2 < pieces.length) continue
      const dot = piece.indexOf('·')
      const norm = dot === -1 ? piece : piece.slice(0, dot)
      push(norm, pieceStart, pieceStart + piece.length)
    }
  }
  return tokens
}

/**
 * Normalised text: words separated by single spaces, stopwords kept.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function normalize(text) {
  return scan(text).map((t) => t.norm).join(' ')
}

/**
 * Normalised words without stopwords.
 *
 * @param {unknown} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return scan(text).map((t) => t.norm).filter((t) => !STOPWORDS.has(t))
}

/** Feminine → masculine endings, longest first. Applied to plain a–z words only. */
const ENDINGS = [
  ['trice', 'teur'], ['ienne', 'ien'], ['iere', 'ier'], ['euse', 'eur'], ['eure', 'eur'],
  ['elle', 'el'], ['ante', 'ant'], ['ente', 'ent'], ['ive', 'if'], ['ee', 'e'],
]

/**
 * Light French/English stemmer, applied the same way to requests and contacts, so that
 * « directrices », « directrice » and « directeur » compare equal. Not a linguistic stemmer:
 * it only removes a plural « s » and folds common feminine endings.
 *
 * @param {string} token   a normalised word
 * @returns {string}
 */
export function stem(token) {
  if (typeof token !== 'string' || token.length <= 3 || !/^[a-z]+$/.test(token)) return token
  let s = token
  if (s.endsWith('s') && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1)
  for (const [from, to] of ENDINGS) {
    if (s.endsWith(from) && s.length - from.length + to.length >= 4) {
      s = s.slice(0, -from.length) + to
      break
    }
  }
  return s
}
