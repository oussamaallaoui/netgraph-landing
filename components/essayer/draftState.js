// Pure helpers and copy for the draft editor of /essayer (#8). No React, no DOM, no logging:
// the drafts live in RequestStep state only (never stored, never sent, never in our URL).
// Copy: « Précisions PO Sprint 2 (2026-11-01) » on #8, §4–§5 (final).
// Contract and client state: « Découpage tech lead Sprint 2 (2026-11-01) » on #8.

import { draftMessage, linkedInProfileUrl, mailtoUrl, whatsappUrl } from '../../lib/drafts.js'

const NBSP = ' '

export const DRAFT_UI = Object.freeze({
  prepare: 'Préparer un message',
  toneLegend: 'Ton du message',
  toneLabels: Object.freeze({ vous: 'Vous', tu: 'Tu' }),
  replace: 'Remplacer',
  keep: 'Garder mon texte',
  subjectLabel: 'Objet',
  bodyLabel: 'Message',
  notSaved: "Votre texte n'est pas enregistré\u00a0: il disparaît si vous rechargez la page.",
  copy: 'Copier',
  openLinkedIn: 'Ouvrir le profil LinkedIn',
  openMail: 'Ouvrir dans votre messagerie',
  openWhatsApp: 'Ouvrir dans WhatsApp',
  whatsappHint: "WhatsApp s'ouvre avec votre message prérempli. Vérifiez le destinataire, puis envoyez-le vous-même.",
  whatsappTooLong:
    'Ce message est trop long pour être ouvert dans WhatsApp. Copiez-le, puis collez-le dans votre conversation WhatsApp.',
  newTab: ' (nouvel onglet)',
  copied: 'Message copié',
  copyFailed: "La copie n'a pas fonctionné. Sélectionnez le texte, puis copiez-le.",
  noChannel:
    "Votre fichier ne contient ni profil LinkedIn, ni adresse email, ni numéro de téléphone pour cette personne. Copiez le message pour l'envoyer par le moyen de votre choix.",
  tooLong:
    'Ce message est trop long pour être ouvert dans votre messagerie. Copiez-le, puis collez-le dans un nouvel email.',
  promise: "NetGraph n'envoie rien à votre place. C'est vous qui envoyez le message.",
  close: 'Fermer',
})

/** @typedef {'help' | 'intro'} DraftKind */
/** @typedef {'vous' | 'tu'} Tone */
/**
 * What the user changed in one draft. `null` = not edited: recomputed from draftMessage().
 * `tone` is pinned on the first edit or explicit choice, so an edited text keeps the tone
 * it was written in when the saved preference changes in another editor.
 * @typedef {{ subject: string|null, body: string|null, tone: Tone|null }} DraftEdit
 */

export const EMPTY_EDIT = Object.freeze({ subject: null, body: null, tone: null })

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

/** 'tu' stays 'tu'; anything else (null, a tampered localStorage value) → 'vous'. */
export function normalizeTone(value) {
  return value === 'tu' ? 'tu' : 'vous'
}

/** Key of a draft in the RequestStep map: one draft per (kind, contact). */
export function draftKey(kind, contactId) {
  return `${kind === 'intro' ? 'intro' : 'help'}:${String(contactId)}`
}

/** @param {DraftEdit|undefined|null} edit */
export function isEdited(edit) {
  return typeof edit?.subject === 'string' || typeof edit?.body === 'string'
}

/** The tone an editor shows: its own pinned tone, else the saved preference. */
export function effectiveTone(edit, preferredTone) {
  return normalizeTone(edit?.tone ?? preferredTone)
}

/**
 * Subject and body shown in the editor: the user's text where they edited it, else the
 * generated draft for the current request and tone.
 * @returns {{ subject: string, body: string, tone: Tone, generated: { subject: string, body: string } }}
 */
export function currentDraft({ contact, request, kind, companyLabel, edit, preferredTone }) {
  const tone = effectiveTone(edit, preferredTone)
  const generated = draftMessage({ contact, request, kind, tone, companyLabel })
  return {
    tone,
    generated,
    subject: typeof edit?.subject === 'string' ? edit.subject : generated.subject,
    body: typeof edit?.body === 'string' ? edit.body : generated.body,
  }
}

/**
 * The entry after the user typed in one field. Only edited fields are kept: typing back
 * the generated text exactly counts as « not edited » again. The tone is pinned.
 * @param {DraftEdit|undefined} edit
 * @param {'subject' | 'body'} field
 * @param {string} value
 * @param {{ subject: string, body: string }} generated
 * @param {Tone} tone  the tone shown while typing
 * @returns {DraftEdit}
 */
export function withFieldEdit(edit, field, value, generated, tone) {
  const base = edit ?? EMPTY_EDIT
  const next = value === generated[field] ? null : value
  return { ...base, [field]: next, tone: normalizeTone(tone) }
}

/**
 * The entry after a tone choice. Without edits, the text simply follows the new tone.
 * With edits, the caller asks first (PO §4); `replace` drops the edits.
 * @param {DraftEdit|undefined} edit
 * @param {Tone} tone
 * @param {{ replace?: boolean }} [options]
 * @returns {DraftEdit}
 */
export function withTone(edit, tone, { replace = false } = {}) {
  const base = edit ?? EMPTY_EDIT
  if (replace) return { subject: null, body: null, tone: normalizeTone(tone) }
  return { ...base, tone: normalizeTone(tone) }
}

/** « Remplacer votre texte par la version « Tu » ? » */
export function replaceQuestion(tone) {
  return `Remplacer votre texte par la version «${NBSP}${DRAFT_UI.toneLabels[normalizeTone(tone)]}${NBSP}»${NBSP}?`
}

/** Editor heading: « Message pour Sara » / « Message pour Sara (mise en relation) ». */
export function editorHeading(contact, kind) {
  const name = clean(contact?.firstName) || clean(contact?.fullName)
  const base = name ? `Message pour ${name}` : 'Message'
  return kind === 'intro' ? `${base} (mise en relation)` : base
}

/** Screen-reader end of the « Préparer un message » button: « pour Sara Démo ». */
export function prepareSrText(contact) {
  const name = clean(contact?.fullName) || [clean(contact?.firstName), clean(contact?.lastName)].filter(Boolean).join(' ')
  return name ? ` pour ${name}` : ''
}

/** « Pour LinkedIn : copiez le message, puis collez-le dans votre conversation avec Sara. » */
export function linkedInHint(contact) {
  const who = clean(contact?.firstName) || 'cette personne'
  return `Pour LinkedIn${NBSP}: copiez le message, puis collez-le dans votre conversation avec ${who}.`
}

/**
 * What the editor offers for this contact and the current text (PO §5). A missing action
 * is hidden, never disabled.
 * - `linkedIn`: the profile URL or null.
 * - `hasEmail`: the contact has a usable single address: the « Objet » field is shown.
 *   (Decided on the address, not on the URL length, so the field never vanishes while typing.)
 * - `mailto`: the mailto: URL for the current subject and body, or null (no email / too long).
 * - `hasPhone` (#9): the contact has a number whatsappUrl accepts (E.164).
 * - `whatsapp` (#9): the wa.me URL for the current body (never the subject), or null (no number,
 *   or longer than 2,000 characters). It follows the edited body live, like `mailto`.
 * - `hint`: the e-mail line, 'none' (no LinkedIn, no email and no number), 'tooLong' (email,
 *   URL too long) or null.
 * - `whatsappHint` (#9): 'ready' (shown with the button), 'tooLong' (number, body too long) or null.
 */
export function draftActions(contact, subject, body) {
  const linkedIn = linkedInProfileUrl(contact)
  const to = typeof contact?.email === 'string' ? contact.email : ''
  const hasEmail = mailtoUrl({ to, subject: '', body: '' }) !== null
  const mailto = hasEmail ? mailtoUrl({ to, subject, body }) : null
  const phone = typeof contact?.phone === 'string' ? contact.phone : null
  const hasPhone = whatsappUrl({ phone, text: '' }) !== null
  const whatsapp = hasPhone ? whatsappUrl({ phone, text: body }) : null
  let hint = null
  if (hasEmail && !mailto) hint = 'tooLong'
  else if (!hasEmail && !linkedIn && !hasPhone) hint = 'none'
  let whatsappHint = null
  if (hasPhone) whatsappHint = whatsapp ? 'ready' : 'tooLong'
  return { linkedIn, hasEmail, mailto, hasPhone, whatsapp, hint, whatsappHint }
}
