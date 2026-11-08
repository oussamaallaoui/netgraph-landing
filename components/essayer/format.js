// French number and plural helpers for /essayer copy.

const NUMBER = new Intl.NumberFormat('fr-FR')

/** 1234 → '1 234' (French grouping, narrow no-break space). */
export function formatNumber(n) {
  return NUMBER.format(n)
}

/** « 1 relation importée » / « 30 relations importées ». French: 0 and 1 are singular. */
export function importedLabel(n) {
  return n <= 1 ? `${formatNumber(n)} relation importée` : `${formatNumber(n)} relations importées`
}

/**
 * « 1 ligne ignorée (sans nom ou en double) » / « 3 lignes ignorées (sans nom ou en double) ».
 * The UI shows it only when n > 0. skipped = rows with no name + repeats of an earlier row.
 */
export function skippedLabel(n) {
  return n <= 1
    ? `${formatNumber(n)} ligne ignorée (sans nom ou en double)`
    : `${formatNumber(n)} lignes ignorées (sans nom ou en double)`
}

/**
 * « d'Anas Figurant » / « de Sara Démo »: French elision before a name, for the
 * screen-reader part of « Voir le profil LinkedIn » (#23).
 * « d' » when the trimmed name starts with a, e, i, o or u, any case, with or without
 * an accent (« d'Élodie », « d'émilie »). « de » otherwise: consonants, h and y
 * (« de Hamza », « de Yasmine », PO decision), a digit, an emoji, a quote, or no name.
 * Straight apostrophe, no space after it, like the rest of the /essayer copy.
 * @param {string} name
 * @returns {string}
 */
export function ofName(name) {
  const trimmed = String(name ?? '').trim()
  // NFD splits « É » into « E » + combining accent, so the first code unit is the base letter.
  const first = trimmed.normalize('NFD').charAt(0)
  if (/^[aeiou]$/i.test(first)) return `d'${trimmed}`
  return trimmed ? `de ${trimmed}` : 'de'
}
