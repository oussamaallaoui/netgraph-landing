// « Pourquoi cette personne » sentences (#6) from structured reasons. Pure.
// Final copy: « Décisions PO sur le vocabulaire et les « pourquoi » (2026-10-31) » on PR #17.
//
// One sentence: head « {poste} chez {entreprise} », « : », at most 2 reasons (the named
// company first, then the strongest, in the order of `reasons`, which match() sorts by
// weight), then « , comme dans votre demande » when a reason other than the named company
// is cited. Gender-neutral: the clauses describe the job and the company, never the person.
//
// « Directrice financière chez Atlas Conseil : son poste relève de « finance » et son
//   entreprise de « conseil », comme dans votre demande. »
//
// French quotes use no-break spaces (U+00A0) so « and » never end up alone on a line.
// The quoted label is kept exactly as written (« de « audit » », no elision).
// Hint reasons (`hint: true`, e.g. « mission » → conseil) are never cited: the user did not
// type them, and they never qualify a person on their own.

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').Reason} Reason */

const NBSP = ' '
const MAX_REASONS = 2

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function quote(label) {
  return `«${NBSP}${label}${NBSP}»`
}

/** Full clause for one reason. */
function clause(r) {
  if (r.kind === 'company_mentioned') return 'son entreprise est celle que vous citez'
  if (r.field === 'position') {
    return r.kind === 'concept' ? `son poste relève de ${quote(r.label)}` : `son poste contient ${quote(r.label)}`
  }
  return r.kind === 'concept' ? `son entreprise relève de ${quote(r.label)}` : `le nom de son entreprise contient ${quote(r.label)}`
}

/** Two reasons, saying the field once where the PO's copy allows it. */
function pair(a, b) {
  if (a.kind === 'company_mentioned') {
    // « son entreprise est celle que vous citez et relève de … » (no second « son entreprise »)
    if (b.field === 'company') {
      return `${clause(a)} et ${b.kind === 'concept' ? `relève de ${quote(b.label)}` : `son nom contient ${quote(b.label)}`}`
    }
    return `${clause(a)} et ${clause(b)}`
  }
  if (a.field === b.field) {
    if (a.kind === b.kind) {
      if (a.kind === 'concept') return `${clause(a)} et de ${quote(b.label)}`
      return `${clause(a)} et ${quote(b.label)}`
    }
    if (a.field === 'position') {
      return `${clause(a)} et ${b.kind === 'concept' ? `relève de ${quote(b.label)}` : `contient ${quote(b.label)}`}`
    }
    return `${clause(a)} et ${b.kind === 'concept' ? `relève de ${quote(b.label)}` : `son nom contient ${quote(b.label)}`}`
  }
  if (a.kind === 'concept' && b.kind === 'concept') {
    // Position + company concepts: drop the second verb.
    const second = b.field === 'company' ? 'son entreprise' : 'son poste'
    return `${clause(a)} et ${second} de ${quote(b.label)}`
  }
  return `${clause(a)} et ${clause(b)}`
}

/**
 * The reasons cited in the sentence: the named company first, then the strongest
 * others, at most 2 in total, no repeated label on the same field.
 *
 * @param {Reason[]} reasons
 * @param {{ hasPosition: boolean, hasCompany: boolean }} fields
 */
function pick(reasons, { hasPosition, hasCompany }) {
  const valid = []
  const seen = new Set()
  let mentioned = null
  for (const r of reasons) {
    if (!r || typeof r !== 'object' || r.hint) continue
    if (r.field === 'company' && !hasCompany) continue
    if (r.field === 'position' && !hasPosition) continue
    if (r.kind === 'company_mentioned') {
      if (r.field === 'company' && !mentioned) mentioned = r
      continue
    }
    if (r.kind !== 'concept' && r.kind !== 'term') continue
    if (r.field !== 'position' && r.field !== 'company') continue
    const label = clean(r.label)
    const id = `${r.field}:${label.toLocaleLowerCase('fr')}`
    if (!label || seen.has(id)) continue
    seen.add(id)
    valid.push({ ...r, label })
  }
  return [...(mentioned ? [mentioned] : []), ...valid].slice(0, MAX_REASONS)
}

/**
 * @param {Contact} contact
 * @param {Reason[]} reasons   sorted by weight, strongest first (as match() returns them)
 * @returns {string}   never empty
 */
export function whyText(contact, reasons) {
  const position = clean(contact?.position)
  const company = clean(contact?.company)
  const head = position && company
    ? `${position} chez ${company}`
    : position || company || clean(contact?.fullName) || 'Cette personne'

  const cited = pick(Array.isArray(reasons) ? reasons : [], { hasPosition: Boolean(position), hasCompany: Boolean(company) })
  if (cited.length === 0) return `${head} : correspond à votre demande.`

  const body = cited.length === 1 ? clause(cited[0]) : pair(cited[0], cited[1])
  const ending = cited.some((r) => r.kind !== 'company_mentioned') ? ', comme dans votre demande' : ''
  return `${head} : ${body}${ending}.`
}
