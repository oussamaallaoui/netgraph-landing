// Count and status lines shown after an import on /essayer (#9).
// Copy: « Précisions PO Sprint 3 » §6 on #9 (final). French: 0 and 1 are singular.
// Pure: no React, no storage, no logging.

import { formatNumber, importedLabel, skippedLabel } from './format.js'

const NBSP = ' '
const one = (n) => n <= 1

/** « 1 contact importé » / « 42 contacts importés ». */
export function contactsImportedLabel(n) {
  return one(n) ? `${formatNumber(n)} contact importé` : `${formatNumber(n)} contacts importés`
}

/**
 * The h1 of the preview: « {n} contacts importés » as soon as phone contacts are stored,
 * otherwise « {n} relations importées » (LinkedIn only, or the sample), as before #9.
 * @param {number} total     contacts shown (after the merge)
 * @param {boolean} hasPhone the record has a phone source
 */
export function previewHeading(total, hasPhone) {
  return hasPhone ? contactsImportedLabel(total) : importedLabel(total)
}

/** The line under the h1 (sample / phone present / LinkedIn only). */
export function previewNote({ isSample, hasPhone }) {
  if (isSample) return 'Exemple de démonstration : noms et entreprises fictifs. Ils sont enregistrés sur cet appareil uniquement.'
  if (hasPhone) return 'Ils sont enregistrés sur cet appareil uniquement.'
  return 'Elles sont enregistrées sur cet appareil uniquement.'
}

/**
 * The preview table caption. « relations » as before #9; « contacts » once phone contacts are
 * stored (not in the PO copy: same noun as the h1).
 */
export function previewCaption(total, rows, hasPhone) {
  if (total > rows) {
    return hasPhone
      ? `Aperçu : les ${rows} premiers contacts sur ${formatNumber(total)}`
      : `Aperçu : les ${rows} premières relations sur ${formatNumber(total)}`
  }
  return hasPhone ? 'Aperçu de vos contacts' : 'Aperçu de vos relations'
}

/** « 1 contact ignoré (sans nom ou en double) » / « 3 contacts ignorés (sans nom ou en double) ». */
export function skippedContactsLabel(k) {
  return one(k)
    ? `${formatNumber(k)} contact ignoré (sans nom ou en double)`
    : `${formatNumber(k)} contacts ignorés (sans nom ou en double)`
}

/** « 1 numéro non reconnu : ce contact est importé sans numéro. » / plural. */
export function unrecognizedPhonesLabel(k) {
  return one(k)
    ? `${formatNumber(k)} numéro non reconnu${NBSP}: ce contact est importé sans numéro.`
    : `${formatNumber(k)} numéros non reconnus${NBSP}: ces contacts sont importés sans numéro.`
}

/** After a phone import: the count, and the merge count when LinkedIn relations are present. */
export function phoneImportLine(n, merged, hasLinkedIn) {
  const imported = one(n)
    ? `${formatNumber(n)} contact du téléphone importé`
    : `${formatNumber(n)} contacts du téléphone importés`
  if (!hasLinkedIn) return `${imported}.`
  if (merged === 0) return `${imported}. Aucun n'a été rapproché de vos relations LinkedIn.`
  const m = one(merged) ? `${formatNumber(merged)} rapproché` : `${formatNumber(merged)} rapprochés`
  return `${imported}, dont ${m} de vos relations LinkedIn.`
}

/**
 * After a LinkedIn import while phone contacts are present.
 * m = 0 is not in the PO copy; it mirrors the phone line (« Aucune n'a été rapprochée… »).
 */
export function linkedInImportLine(n, merged) {
  const imported = one(n)
    ? `${formatNumber(n)} relation LinkedIn importée`
    : `${formatNumber(n)} relations LinkedIn importées`
  if (merged === 0) return `${imported}. Aucune n'a été rapprochée des contacts de votre téléphone.`
  const m = one(merged) ? `${formatNumber(merged)} rapprochée` : `${formatNumber(merged)} rapprochées`
  return `${imported}, dont ${m} des contacts de votre téléphone.`
}

/**
 * @typedef {Object} LastImport  what the status lines need from the import just done
 * @property {'linkedin'|'phone'|'sample'} source
 * @property {number} imported            contacts parsed from the file
 * @property {number} skipped
 * @property {number} unrecognizedPhones
 * @property {number} merged              merged pairs after this import (combineSources)
 * @property {boolean} hasOtherSource     the other real source is stored too
 */

/**
 * The LastImport for an import that produced `record` (withImport's result).
 * @param {import('../../lib/types.js').StoredContacts} record
 * @param {{ source: 'linkedin'|'phone'|'sample', imported: number, skipped?: number,
 *           unrecognizedPhones?: number, merged: number }} parsed
 * @returns {LastImport}
 */
export function lastImportOf(record, { source, imported, skipped = 0, unrecognizedPhones = 0, merged }) {
  const sources = record?.sources ?? {}
  const other = source === 'phone' ? 'linkedin' : source === 'linkedin' ? 'phone' : null
  return {
    source,
    imported,
    skipped,
    unrecognizedPhones,
    merged,
    hasOtherSource: other !== null && Boolean(sources[other]),
  }
}

/** True when the record has phone contacts (the h1 then counts « contacts »). */
export function recordHasPhone(record) {
  return Boolean(record && !record.isSample && record.sources?.phone)
}

/**
 * The status lines under the h1 after an import, in order. Empty for the sample or when
 * nothing was imported in this visit (a reload shows the h1 only).
 * @param {LastImport|null} last
 * @returns {string[]}
 */
export function importStatusLines(last) {
  if (!last || last.source === 'sample') return []
  const lines = []
  if (last.source === 'phone') {
    lines.push(phoneImportLine(last.imported, last.merged, last.hasOtherSource))
    if (last.skipped > 0) lines.push(skippedContactsLabel(last.skipped))
    if (last.unrecognizedPhones > 0) lines.push(unrecognizedPhonesLabel(last.unrecognizedPhones))
  } else {
    if (last.hasOtherSource) lines.push(linkedInImportLine(last.imported, last.merged))
    if (last.skipped > 0) lines.push(skippedLabel(last.skipped))
  }
  return lines
}
