// Shared data shapes (JSDoc only, no runtime code).
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
 * @property {string} id            stable within an import: 'li-' + short hash of (profileUrl || firstName|lastName|company);
 *                                  phone (#9): 'ph-' + short hash of (tel:<E.164> || name:first|last|company); sample: 's01'…'s30'
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName      `${firstName} ${lastName}`.trim()
 * @property {string|null} company
 * @property {string|null} position
 * @property {string|null} connectedOn   'YYYY-MM-DD'
 * @property {string|null} profileUrl    only https://www.linkedin.com/… or https://linkedin.com/…, else null
 * @property {string|null} email         simple validity check, else null
 * @property {string|null} phone         E.164 (normalizePhone, lib/phone.js), only filled by #9 (vCard import or a merge)
 * @property {ContactSource[]} sources
 */

/**
 * Error codes produced by lib/ parsers. French messages live in the UI
 * (components/essayer/importErrors.js), which also has the UI-only codes
 * FILE_TOO_LARGE, READ_FAILED and UNSUPPORTED_FILE (#9: neither a LinkedIn CSV nor a vCard).
 * NOT_VCARD (no BEGIN:VCARD line) comes from parseVCard (#9, lib/vcard.js);
 * TOO_MANY_ROWS means more than 30,000 rows (LinkedIn) or cards (vCard).
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
 * Result of parseVCard(text) (#9): a ParseResult plus the count of imported contacts that had
 * at least one TEL but none that normalizePhone accepted (they are imported with phone: null).
 * skipped: cards with no name, or a repeat (same id basis); contacts.length + skipped === number of cards.
 *
 * @typedef {ParseResult & { unrecognizedPhones: number }} VCardParseResult
 */

/**
 * One source's list inside the stored record (#9, ADR 0002).
 *
 * @typedef {Object} SourceImport
 * @property {string} importedAt    ISO 8601 timestamp of that source's last import
 * @property {Contact[]} contacts   that source's contacts only, in file order (never merged)
 */

/**
 * The single IndexedDB record (database 'netgraph', store 'kv', key 'contacts'), v2 since #9
 * (ADR 0002): one list per source, merged on read by combineSources (lib/merge.js).
 * Invariant: `sources` holds `sample` alone, or one or both of `linkedin` / `phone`.
 *
 * @typedef {Object} StoredContacts
 * @property {2} schemaVersion
 * @property {boolean} isSample     true ⇔ sources.sample is set
 * @property {string} importedAt    ISO 8601 timestamp, the latest import of any source
 * @property {{ sample?: SourceImport, linkedin?: SourceImport, phone?: SourceImport }} sources
 */

/**
 * The v1 record (Sprints 1–2). Only read by loadContacts(), which migrates it to v2:
 * isSample → sources.sample, otherwise → sources.linkedin; then writes the v2 record back.
 *
 * @typedef {Object} StoredContactsV1
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
 * @property {Contact} contact     the same object as in the index (never a new person)
 * @property {string} why          introducerWhy(contact, companyLabel) from lib/explain.js
 */

/**
 * Result of introducers(request, index). Contract: « Découpage tech lead Sprint 2 (2026-11-01) » on #7.
 *
 * @typedef {Object} IntroducersResult
 * @property {'found'|'not_found'|'no_company'} status
 * @property {string|null} companyLabel
 *   found:      the most frequent `contact.company` spelling among the people, trimmed (ties: first in file order);
 *   not_found:  the name as typed (may be long: the UI applies the PO's 40-character rule);
 *   no_company: null
 * @property {Introducer[]} people        found: every entry with that companyKey, sorted by fullName
 *                                        (Intl.Collator('fr')) then id, at most MAX_INTRODUCERS (20). Otherwise [].
 * @property {number} total               found: count before the cap (≥ 1). Otherwise 0.
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
 * Input of draftMessage(input). Functions in lib/drafts.js (Sprint 2 contract on #8):
 *   draftMessage(input) → Draft
 *   requestClause(request: string) → string          the {demande} placeholder (PO §2 rule)
 *   linkedInProfileUrl(contact: Contact) → string|null   delegates to cleanProfileUrl
 *   mailtoUrl(input: MailtoInput) → string|null
 *
 * @typedef {Object} DraftInput
 * @property {Contact} contact
 * @property {string} request          as typed by the user; only the first MAX_REQUEST_LENGTH (300) characters are used
 * @property {DraftKind} kind          'help' from a #6 card, 'intro' from a #7 card; anything else → 'help'
 * @property {Tone} tone               anything else → 'vous'
 * @property {string} [companyLabel]   intro: IntroducersResult.companyLabel (required); without it, contact.company,
 *                                     then the 'help' draft
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
// #9 Phone contacts + WhatsApp (lib/phone.js, lib/vcard.js, lib/merge.js, lib/drafts.js)
// Contract: « Découpage tech lead Sprint 3 (2026-11-07) » on issue #9; storage: ADR 0002.
//   normalizePhone(raw, defaultCountry = 'MA') → string|null        E.164, e.g. '+212612345678'
//   isVCardText(text) → boolean
//   parseVCard(text) → VCardParseResult
//   withImport(record, source, contacts, now?) → StoredContacts      sample replaces all; linkedin/phone drop sample
//   combineSources(record) → CombinedContacts
//   nameKey(contact) → string|null
//   whatsappUrl(input: WhatsappInput) → string|null                  MAX_WHATSAPP_URL_LENGTH = 2000
// ---------------------------------------------------------------------------

/**
 * Result of combineSources(record): what the UI shows, matches and drafts from.
 * A LinkedIn contact and a phone contact with the same nameKey (exactly one on each side)
 * become one contact (the LinkedIn one, plus the phone number), sources ['linkedin', 'phone'].
 *
 * @typedef {Object} CombinedContacts
 * @property {Contact[]} contacts   LinkedIn contacts in file order (merged ones in place), then unmerged phone contacts
 * @property {number} merged        number of merged pairs
 */

/**
 * Input of whatsappUrl(input): null if `phone` is not E.164 (^\+[1-9]\d{7,14}$), if the URL
 * would be longer than 2,000 characters, or if `text` can't be encoded (lone surrogate).
 * `text` is the message body only (WhatsApp has no subject); empty text → no ?text=.
 *
 * @typedef {Object} WhatsappInput
 * @property {string|null} phone
 * @property {string} text
 */

export {}
