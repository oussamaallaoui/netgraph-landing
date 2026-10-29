// Import error code → French message shown on /essayer.
// Codes from lib/linkedin.js (contract on issue #5), plus the UI-only codes
// FILE_TOO_LARGE (checked before reading) and READ_FAILED (file.text() rejected).

export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const IMPORT_ERROR_MESSAGES = Object.freeze({
  EMPTY_FILE: 'Ce fichier est vide. Vérifiez que vous avez choisi le fichier Connections.csv de votre export LinkedIn.',
  NOT_LINKEDIN_EXPORT: "Ce fichier ne ressemble pas à un export LinkedIn. Choisissez le fichier Connections.csv contenu dans l'archive envoyée par LinkedIn.",
  NO_CONTACTS: "Ce fichier ne contient aucune relation avec un prénom et un nom. Vérifiez qu'il s'agit bien de votre fichier Connections.csv.",
  TOO_MANY_ROWS: "Ce fichier contient plus de 30 000 lignes, la limite de LinkedIn. Vérifiez qu'il s'agit bien de votre fichier Connections.csv.",
  FILE_TOO_LARGE: 'Ce fichier dépasse 10 Mo. Un export LinkedIn Connections.csv est beaucoup plus léger : vérifiez le fichier choisi.',
  READ_FAILED: "Impossible de lire ce fichier. Réessayez, ou choisissez de nouveau le fichier Connections.csv.",
})

const FALLBACK = "L'import n'a pas abouti. Réessayez avec le fichier Connections.csv de votre export LinkedIn."

/** @param {string} code @returns {string} */
export function importErrorMessage(code) {
  return Object.prototype.hasOwnProperty.call(IMPORT_ERROR_MESSAGES, code)
    ? IMPORT_ERROR_MESSAGES[code]
    : FALLBACK
}
