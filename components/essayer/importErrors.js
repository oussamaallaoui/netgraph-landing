// Import error code → French message shown on /essayer (final PO copy, #5 comment 2026-10-29).
// Codes from lib/linkedin.js (contract on issue #5), plus the UI-only codes
// FILE_TOO_LARGE (checked before reading) and READ_FAILED (file.text() rejected).

export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const IMPORT_ERROR_MESSAGES = Object.freeze({
  EMPTY_FILE: 'Ce fichier est vide. Choisissez le fichier Connections.csv de votre archive LinkedIn.',
  NOT_LINKEDIN_EXPORT:
    "Ce fichier ne ressemble pas à un export de relations LinkedIn. Choisissez le fichier Connections.csv de votre archive LinkedIn, tel quel : s'il a été ouvert puis enregistré dans Excel, téléchargez à nouveau l'archive.",
  NO_CONTACTS: 'Ce fichier LinkedIn ne contient aucune relation.',
  TOO_MANY_ROWS: "Ce fichier contient plus de 30 000 relations : NetGraph ne peut pas l'importer.",
  FILE_TOO_LARGE: "Ce fichier dépasse 10 Mo : ce n'est probablement pas le fichier Connections.csv de LinkedIn.",
  READ_FAILED: 'Impossible de lire ce fichier. Réessayez ou choisissez un autre fichier.',
})

/** Appended when a failed import leaves a previous import in place. */
export const KEPT_SUFFIX = 'Vos relations déjà importées sont conservées.'

// Not in the PO table: only reachable if lib/ adds a code the UI doesn't know yet.
const FALLBACK = 'Impossible de lire ce fichier. Réessayez ou choisissez un autre fichier.'

/**
 * @param {string} code
 * @param {{ hasPrevious?: boolean }} [options]  true when a previous import is still stored
 * @returns {string}
 */
export function importErrorMessage(code, { hasPrevious = false } = {}) {
  const base = Object.prototype.hasOwnProperty.call(IMPORT_ERROR_MESSAGES, code)
    ? IMPORT_ERROR_MESSAGES[code]
    : FALLBACK
  return hasPrevious ? `${base} ${KEPT_SUFFIX}` : base
}
