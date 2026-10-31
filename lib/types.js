// Shared data shapes for Sprint 1 (JSDoc only, no runtime code).
// Source of truth: the tech lead's contracts on issues #5, #6, #7, #8 and #9.
// Changing a shape here changes a contract: it needs both devs and the tech lead.
//
// Import a type in another file with:
//   /** @typedef {import('./types.js').Contact} Contact */

// ---------------------------------------------------------------------------
// #5 Import (lib/linkedin.js, lib/store.js)
// ---------------------------------------------------------------------------

/**
 * @typedef {'linkedin'|'phone'|'sample'} ContactSource
 */

/**
 * @typedef {Object} Contact
 * @property {string} id            stable within an import: 'li-' + short hash of (profileUrl || firstName|lastName|company); sample: 's01'…'s30'
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName      `${firstName} ${lastName}`.trim()
 * @property {string|null} company
 * @property {string|null} position
 * @property {string|null} connectedOn   'YYYY-MM-DD'
 * @property {string|null} profileUrl    only https://www.linkedin.com/… or https://linkedin.com/…, else null
 * @property {string|null} email         simple validity check, else null
 * @property {string|null} phone         E.164, only filled by #9
 * @property {ContactSource[]} sources
 */

/**
 * Error codes produced by lib/ parsers. French messages live in the UI
 * (components/essayer/importErrors.js), which also has the UI-only codes
 * FILE_TOO_LARGE (> 10 MB) and READ_FAILED.
 * NOT_VCARD is added by #9 (lib/vcard.js).
 *
 * @typedef {Object} ImportError
 * @property {'EMPTY_FILE'|'NOT_LINKEDIN_EXPORT'|'NO_CONTACTS'|'TOO_MANY_ROWS'|'NOT_VCARD'} code
 * @property {number} [line]
 */

/**
 * Result of parseLinkedInCsv(text) (#5) and parseVCard(text) (#9). Never thrown.
 * errors.length > 0  ⇒  contacts is [] and the UI stores nothing.
 *
 * @typedef {Object} ParseResult
 * @property {Contact[]} contacts
 * @property {ImportError[]} errors
 * @property {number} skipped       rows dropped: no first and no last name, or a repeat of an earlier
 *                                  row (same id basis); contacts.length + skipped === non-blank data rows after the header
 */

/**
 * The single IndexedDB record (database 'netgraph', store 'kv', key 'contacts').
 *
 * @typedef {Object} StoredContacts
 * @property {1} schemaVersion
 * @property {boolean} isSample
 * @property {string} importedAt    ISO 8601 timestamp
 * @property {Contact[]} contacts
 */

/**
 * @typedef {Object} SaveResult
 * @property {boolean} persisted    false = kept in memory only (IndexedDB unavailable)
 */

/**
 * Result of clearAllData(). Never rejected.
 * cleared: false ⇒ data may remain (deletion failed or was blocked by another tab for > 3 s):
 * the UI keeps the preview and shows « Fermez les autres onglets NetGraph ouverts, puis réessayez. »
 *
 * @typedef {Object} ClearResult
 * @property {boolean} cleared
 */

/**
 * @typedef {'tone'} PreferenceKey   stored in localStorage as 'netgraph:<key>'; never contact data
 */

// ---------------------------------------------------------------------------
// #6 Request → results (lib/match.js, lib/vocabulary.js, lib/explain.js)
// ---------------------------------------------------------------------------

/**
 * Built once per import by buildIndex(contacts). Opaque to the UI: its fields
 * are an implementation detail of lib/match.js and lib/introducers.js.
 * Its `entries`, `companies` and `mentionable` fields may be read by lib/introducers.js
 * only (#7, together with findCompanyMentions from lib/match.js); the UI must not read them.
 *
 * @typedef {Object} ContactIndex
 */

/**
 * @typedef {Object} Reason
 * @property {'position'|'company'} field
 * @property {'concept'|'term'|'company_mentioned'} kind
 * @property {string} [concept]    concept id when kind === 'concept'
 * @property {string} label        French label of the concept, or the matched word as typed in the request
 * @property {true} [hint]         the concept was only suggested by a request-only hint (« mission » → conseil);
 *                                 a bonus, never cited in the « Pourquoi cette personne » sentence
 */

/**
 * @typedef {Object} MatchResult
 * @property {Contact} contact     same object as in the input (never a new person)
 * @property {number} score        internal; never displayed
 * @property {Reason[]} reasons    at least one
 * @property {string} why          French sentence for « Pourquoi cette personne »
 */

/**
 * @typedef {Object} MatchOptions
 * @property {number} [limit]      capped at 10
 */

/**
 * Result of match(request, index, options).
 *
 * @typedef {Object} MatchOutput
 * @property {MatchResult[]} results         sorted, length ≤ min(limit, 10); [] if nothing relevant or empty request
 * @property {string[]} requestConcepts      concept ids found in the request, e.g. ['finance', 'conseil']
 */

/**
 * One entry of CONCEPTS in lib/vocabulary.js.
 *
 * @typedef {Object} Concept
 * @property {string} id
 * @property {string} label
 * @property {string[]} terms
 */

// ---------------------------------------------------------------------------
// #7 Introducers (lib/company.js, lib/introducers.js)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Introducer
 * @property {Contact} contact
 * @property {string} why
 */

/**
 * Result of introducers(request, index).
 *
 * @typedef {Object} IntroducersResult
 * @property {'found'|'not_found'|'no_company'} status
 * @property {string|null} companyLabel   found: best spelling from the contacts; not_found: the text as typed; no_company: null
 * @property {Introducer[]} people        [] unless found; every contact with that companyKey, sorted by fullName; max 20
 */

// ---------------------------------------------------------------------------
// #8 Drafts (lib/drafts.js)
// ---------------------------------------------------------------------------

/**
 * @typedef {'help'|'intro'} DraftKind
 */

/**
 * @typedef {'vous'|'tu'} Tone
 */

/**
 * Input of draftMessage(input).
 *
 * @typedef {Object} DraftInput
 * @property {Contact} contact
 * @property {string} request          as typed by the user
 * @property {DraftKind} kind
 * @property {Tone} tone
 * @property {Reason[]} [reasons]      help: MatchResult.reasons
 * @property {string} [companyLabel]   intro: from introducers(); required for 'intro'
 */

/**
 * Result of draftMessage(input).
 *
 * @typedef {Object} Draft
 * @property {string} subject
 * @property {string} body
 */

/**
 * Input of mailtoUrl(input): null if invalid email or URL > 2,000 chars.
 *
 * @typedef {Object} MailtoInput
 * @property {string} to
 * @property {string} subject
 * @property {string} body
 */

// ---------------------------------------------------------------------------
// #9 vCard + WhatsApp (stretch: lib/vcard.js, lib/phone.js, lib/merge.js)
// ---------------------------------------------------------------------------

/**
 * Result of combineImport(existing, incoming, source).
 *
 * @typedef {Object} CombineResult
 * @property {Contact[]} contacts
 * @property {number} merged
 * @property {number} added
 */

/**
 * Input of whatsappUrl(input): null if no valid phone.
 *
 * @typedef {Object} WhatsappInput
 * @property {string|null} phone
 * @property {string} text
 */

export {}
