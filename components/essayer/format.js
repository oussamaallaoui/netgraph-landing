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

/** « 1 ligne ignorée » / « 3 lignes ignorées ». */
export function skippedLabel(n) {
  return n <= 1 ? `${formatNumber(n)} ligne ignorée` : `${formatNumber(n)} lignes ignorées`
}
