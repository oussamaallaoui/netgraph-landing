// « Pourquoi cette personne » sentences (#6) from structured reasons. Pure.
//
// whyText(sara, [{ field: 'position', kind: 'concept', concept: 'finance', label: 'finance' },
//                { field: 'company', kind: 'concept', concept: 'conseil', label: 'conseil' }])
// → « Directrice financière chez Atlas Conseil : son poste correspond à « finance » et son
//     entreprise à « conseil », comme indiqué dans votre demande. »
//
// Draft wording, gender-neutral (we don't know the person's gender); final copy: PO.
// French quotes use no-break spaces (U+00A0) so « and » never end up alone on a line.

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').Reason} Reason */

const NBSP = ' '
const MAX_LABELS = 3

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function quote(label) {
  return `«${NBSP}${label}${NBSP}»`
}

/** ['a'] → a; ['a', 'b'] → a et b; ['a', 'b', 'c'] → a, b et c */
function joinFr(items) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

function labelsFor(reasons, field) {
  const seen = new Set()
  const labels = []
  for (const r of reasons) {
    if (!r || r.field !== field || (r.kind !== 'concept' && r.kind !== 'term')) continue
    const label = clean(r.label)
    const id = label.toLocaleLowerCase('fr')
    if (!label || seen.has(id)) continue
    seen.add(id)
    labels.push(label)
  }
  return labels.slice(0, MAX_LABELS)
}

/**
 * @param {Contact} contact
 * @param {Reason[]} reasons
 * @returns {string}   never empty
 */
export function whyText(contact, reasons) {
  const position = clean(contact?.position)
  const company = clean(contact?.company)
  const head = position && company
    ? `${position} chez ${company}`
    : position || company || clean(contact?.fullName) || 'Cette personne'
  const list = Array.isArray(reasons) ? reasons : []

  const inPosition = labelsFor(list, 'position')
  const inCompany = company ? labelsFor(list, 'company') : []
  const mentioned = Boolean(company) && list.some((r) => r?.kind === 'company_mentioned')

  const clauses = []
  if (inPosition.length) clauses.push(`son poste correspond à ${joinFr(inPosition.map(quote))}`)
  if (inCompany.length) {
    clauses.push(`son entreprise ${inPosition.length ? '' : 'correspond '}à ${joinFr(inCompany.map(quote))}`)
  }
  if (mentioned) clauses.push('son entreprise est celle que vous citez')
  if (clauses.length === 0) return `${head} : correspond à votre demande.`

  const ending = mentioned ? '' : ', comme indiqué dans votre demande'
  return `${head} : ${joinFr(clauses)}${ending}.`
}
