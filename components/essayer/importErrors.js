// Import error code → French message shown on /essayer.
// LinkedIn copy: final PO wording (#5 comment 2026-10-29), unchanged apart from the size cap.
// Phone (.vcf) copy and the shared suffix: « Précisions PO Sprint 3 » §6 on #9 (final).
// Codes from lib/linkedin.js and lib/vcard.js, plus the UI-only codes FILE_TOO_LARGE
// (checked before reading), READ_FAILED (file.text() rejected) and UNSUPPORTED_FILE
// (neither a LinkedIn CSV nor a vCard, see ./importFile.js).

const NBSP = ' '

/** One size cap for both formats (#9 contract: iPhone exports carry photos). */
export const MAX_FILE_MB = 50
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

const READ_FAILED = 'Impossible de lire ce fichier. Réessayez ou choisissez un autre fichier.'

/** LinkedIn (Connections.csv) messages. */
export const IMPORT_ERROR_MESSAGES = Object.freeze({
  EMPTY_FILE: 'Ce fichier est vide. Choisissez le fichier Connections.csv de votre archive LinkedIn.',
  NOT_LINKEDIN_EXPORT:
    "Ce fichier ne ressemble pas à un export de relations LinkedIn. Choisissez le fichier Connections.csv de votre archive LinkedIn, tel quel : s'il a été ouvert puis enregistré dans Excel, téléchargez à nouveau l'archive.",
  NO_CONTACTS: 'Ce fichier LinkedIn ne contient aucune relation.',
  TOO_MANY_ROWS: "Ce fichier contient plus de 30 000 relations : NetGraph ne peut pas l'importer.",
  FILE_TOO_LARGE: `Ce fichier dépasse ${MAX_FILE_MB} Mo : ce n'est probablement pas le fichier Connections.csv de LinkedIn.`,
  READ_FAILED,
})

/** Phone (.vcf) messages, PO §6 on #9. */
export const PHONE_ERROR_MESSAGES = Object.freeze({
  EMPTY_FILE: 'Ce fichier est vide. Exportez à nouveau vos contacts depuis votre téléphone.',
  NOT_VCARD:
    'Ce fichier ne ressemble pas à un export de contacts (.vcf). Exportez à nouveau vos contacts depuis votre téléphone, puis déposez le fichier .vcf obtenu.',
  NO_CONTACTS: 'Ce fichier ne contient aucun contact avec un nom.',
  TOO_MANY_ROWS: `Ce fichier contient plus de 30${NBSP}000 contacts${NBSP}: NetGraph ne peut pas l'importer.`,
  FILE_TOO_LARGE: `Ce fichier dépasse ${MAX_FILE_MB}${NBSP}Mo. Si votre téléphone le propose, exportez vos contacts sans les photos, puis réessayez.`,
  READ_FAILED,
})

/** Neither a Connections.csv nor a .vcf: same message whatever the source. */
export const UNSUPPORTED_FILE_MESSAGE = `NetGraph lit deux types de fichiers${NBSP}: Connections.csv (LinkedIn) et .vcf (contacts du téléphone). Choisissez l'un des deux.`

/** Appended when a failed import leaves a previous import in place (both sources). */
export const KEPT_SUFFIX = 'Vos contacts déjà importés sont conservés.'

// Not in the PO table: only reachable if lib/ adds a code the UI doesn't know yet.
const FALLBACK = READ_FAILED

const own = (table, code) => Object.prototype.hasOwnProperty.call(table, code)

/**
 * @param {string} code
 * @param {{ source?: 'linkedin'|'phone'|null, hasPrevious?: boolean }} [options]
 *   source: which parser the file went to (importFile's outcome); LinkedIn when unknown.
 *   hasPrevious: true when a previous import is still stored.
 * @returns {string}
 */
export function importErrorMessage(code, { source = 'linkedin', hasPrevious = false } = {}) {
  let base
  if (code === 'UNSUPPORTED_FILE') base = UNSUPPORTED_FILE_MESSAGE
  else if (code === 'NOT_VCARD') base = PHONE_ERROR_MESSAGES.NOT_VCARD
  else {
    const table = source === 'phone' ? PHONE_ERROR_MESSAGES : IMPORT_ERROR_MESSAGES
    base = own(table, code) ? table[code] : FALLBACK
  }
  return hasPrevious ? `${base} ${KEPT_SUFFIX}` : base
}
