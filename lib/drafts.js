// Drafted messages (#8): the user edits them and sends them from their own app.
// NetGraph never sends anything. Pure, never throws, no logging, no DOM.
// Contract: « Découpage tech lead Sprint 2 (2026-11-01) » on issue #8 (typedefs in lib/types.js).
// Copy: « Précisions PO Sprint 2 (2026-11-01) » on issue #8, §2 and §3 (final).

import { cleanEmail, cleanProfileUrl } from './linkedin.js'
import { MAX_REQUEST_LENGTH } from './match.js'

/** @typedef {import('./types.js').Contact} Contact */
/** @typedef {import('./types.js').DraftInput} DraftInput */
/** @typedef {import('./types.js').Draft} Draft */
/** @typedef {import('./types.js').MailtoInput} MailtoInput */

// ---------------------------------------------------------------------------
// DRAFT_COPY: the PO's final templates. A copy change is an edit here, and only here.
//
// - Placeholders: {prenom} {demande} {poste} {entreprise} (PO §2).
// - Write a plain space before « : » and « ? »: draftMessage() turns it into a
//   no-break space (U+00A0). Only the template text is changed, never the user's words.
// - A body is: greeting, blank line, `wellBeing` + `objective`, blank line,
//   the help or intro paragraph, blank line, `closing`.
// - `objective` is left out when the request is empty after cleaning (nothing to say).
// - Gender-neutral on both sides; no sender placeholder: the user signs after `closing`.
// ---------------------------------------------------------------------------
export const DRAFT_COPY = Object.freeze({
  greeting: 'Bonjour {prenom},',
  greetingWithoutName: 'Bonjour,',
  objective: 'Mon objectif en ce moment : {demande}.',
  vous: Object.freeze({
    wellBeing: "J'espère que vous allez bien.",
    helpSubject: 'Une question pour vous',
    // « Comme … » sentence, by the fields available (PO §3, missing-field table).
    helpBecause: Object.freeze({
      positionAndCompany: 'Comme vous êtes {poste} chez {entreprise}, votre avis me serait précieux.',
      positionOnly: 'Comme vous êtes {poste}, votre avis me serait précieux.',
      companyOnly: 'Comme vous travaillez chez {entreprise}, votre avis me serait précieux.',
      neither: 'Votre avis me serait précieux.',
    }),
    helpAsk: 'Auriez-vous quelques minutes pour en parler ?',
    introSubject: 'Une mise en relation chez {entreprise} ?',
    introAsk:
      "Comme vous travaillez chez {entreprise}, pourriez-vous m'indiquer la bonne personne à contacter, ou me mettre en relation avec elle si cela vous convient ?",
    closing: "Merci d'avance,",
  }),
  tu: Object.freeze({
    wellBeing: "J'espère que tu vas bien.",
    helpSubject: 'Une question pour toi',
    helpBecause: Object.freeze({
      positionAndCompany: 'Comme tu es {poste} chez {entreprise}, ton avis me serait précieux.',
      positionOnly: 'Comme tu es {poste}, ton avis me serait précieux.',
      companyOnly: 'Comme tu travailles chez {entreprise}, ton avis me serait précieux.',
      neither: 'Ton avis me serait précieux.',
    }),
    helpAsk: 'Aurais-tu quelques minutes pour en parler ?',
    introSubject: 'Une mise en relation chez {entreprise} ?',
    introAsk:
      "Comme tu travailles chez {entreprise}, pourrais-tu m'indiquer la bonne personne à contacter, ou me mettre en relation avec elle si cela te convient ?",
    closing: 'Merci et à bientôt,',
  }),
})

/** Longest mailto: URL we hand to the user's mail app (longer → null, the UI suggests « Copier »). */
export const MAX_MAILTO_LENGTH = 2000

const NBSP = ' '
const PLACEHOLDER = /\{(prenom|demande|poste|entreprise)\}/g
const TRAILING_PUNCTUATION = /[\s.!?…:;]+$/u
// Characters that would let `to` add a second recipient or extra headers (cc, bcc, body…).
const UNSAFE_RECIPIENT = /[?&#%/,;]/

/** Trim and collapse every run of whitespace (line breaks included) into one space. */
function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

/** French typography for template text: no-break space before « : » and « ? ». */
function frenchSpacing(text) {
  return text.replace(/ ([:?])/g, `${NBSP}$1`)
}

/** Fill placeholders in one pass, so a value that contains « {prenom} » is never re-filled. */
function fill(template, values) {
  return frenchSpacing(template).replace(PLACEHOLDER, (_, name) => values[name] ?? '')
}

/** A word is kept as typed if it has a capital after its first letter (« DAF », « McKinsey », « L'IA »). */
function keepsCase(word) {
  const rest = word.slice(1)
  return rest !== rest.toLowerCase()
}

/**
 * The {demande} placeholder (PO §2): the request as typed, cut at MAX_REQUEST_LENGTH
 * (like match()), trimmed, whitespace runs → one space, trailing . ! ? … : ; removed,
 * first letter lowercased unless the first word keeps its case (all caps, « DAF Atlas »).
 * Nothing else changes. Returns '' for a non-string or an empty request.
 *
 * @param {string} request
 * @returns {string}
 */
export function requestClause(request) {
  if (typeof request !== 'string') return ''
  const text = clean(request.slice(0, MAX_REQUEST_LENGTH)).replace(TRAILING_PUNCTUATION, '')
  if (!text) return ''
  const firstWord = text.split(' ', 1)[0]
  if (keepsCase(firstWord)) return text
  // Lowercase the first code point (handles « É » and astral characters alike).
  const first = String.fromCodePoint(text.codePointAt(0))
  return first.toLowerCase() + text.slice(first.length)
}

/**
 * The draft for one person, from the PO's final templates. Never throws.
 *
 * - `tone`: anything other than 'tu' → 'vous'. `kind`: anything other than 'intro' → 'help'.
 * - 'help' cites the contact's position and/or company (PO §3 table).
 * - 'intro' names `companyLabel`; without it, `contact.company`; without both, the 'help' draft.
 * - `body` uses '\n' line breaks, blank lines between paragraphs, and U+00A0 before « : »
 *   and « ? » in the template text.
 *
 * @param {DraftInput} input
 * @returns {Draft}
 */
export function draftMessage(input) {
  try {
    const { contact, request, kind, tone, companyLabel } = input && typeof input === 'object' ? input : {}
    const person = contact && typeof contact === 'object' ? contact : {}
    const copy = tone === 'tu' ? DRAFT_COPY.tu : DRAFT_COPY.vous

    const prenom = clean(person.firstName)
    const demande = requestClause(request)
    const poste = clean(person.position)
    const introCompany = clean(companyLabel) || clean(person.company)
    const isIntro = kind === 'intro' && introCompany !== ''
    const entreprise = isIntro ? introCompany : clean(person.company)
    const values = { prenom, demande, poste, entreprise }

    let ask
    let subject
    if (isIntro) {
      ask = copy.introAsk
      subject = copy.introSubject
    } else {
      const because = copy.helpBecause
      const sentence = poste && entreprise
        ? because.positionAndCompany
        : poste
          ? because.positionOnly
          : entreprise
            ? because.companyOnly
            : because.neither
      ask = `${sentence} ${copy.helpAsk}`
      subject = copy.helpSubject
    }

    const paragraphs = [
      prenom ? DRAFT_COPY.greeting : DRAFT_COPY.greetingWithoutName,
      demande ? `${copy.wellBeing} ${DRAFT_COPY.objective}` : copy.wellBeing,
      ask,
      copy.closing,
    ]
    return {
      subject: fill(subject, values),
      body: paragraphs.map((paragraph) => fill(paragraph, values)).join('\n\n'),
    }
  } catch {
    // Defensive (e.g. a getter that throws): a neutral draft rather than a crash.
    const copy = DRAFT_COPY.vous
    return {
      subject: copy.helpSubject,
      body: [DRAFT_COPY.greetingWithoutName, copy.wellBeing, `${copy.helpBecause.neither} ${frenchSpacing(copy.helpAsk)}`, copy.closing].join('\n\n'),
    }
  }
}

/**
 * The contact's LinkedIn profile URL if it passes cleanProfileUrl (the single LinkedIn
 * rule: https only, host www.linkedin.com or linkedin.com, no credentials or port,
 * ≤ 2,000 characters), else null. Never throws.
 *
 * @param {Contact} contact
 * @returns {string|null}
 */
export function linkedInProfileUrl(contact) {
  try {
    return cleanProfileUrl(contact && typeof contact === 'object' ? contact.profileUrl : null)
  } catch {
    return null
  }
}

/** Line breaks → CRLF (the mailto: RFC 6068 form), then percent-encoded (spaces → %20). */
function encodeField(value) {
  const text = typeof value === 'string' ? value : ''
  return encodeURIComponent(text.replace(/\r\n|\r|\n/g, '\r\n'))
}

/**
 * A mailto: link that opens the user's own mail app with one recipient, the subject and
 * the body. Nothing is sent. Null if `to` is not a valid single address (cleanEmail, and
 * none of ? & # % / , ;), or if the URL is longer than 2,000 characters. Never throws.
 *
 * @param {MailtoInput} input
 * @returns {string|null}
 */
export function mailtoUrl(input) {
  try {
    const { to, subject, body } = input && typeof input === 'object' ? input : {}
    const email = cleanEmail(typeof to === 'string' ? to : '')
    if (!email || UNSAFE_RECIPIENT.test(email)) return null
    const url = `mailto:${email}?subject=${encodeField(subject)}&body=${encodeField(body)}`
    return url.length > MAX_MAILTO_LENGTH ? null : url
  } catch {
    // encodeURIComponent throws on a lone surrogate: no link, the UI offers « Copier ».
    return null
  }
}
