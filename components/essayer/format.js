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
