// Pure helpers and copy for the « Qui peut vous présenter chez … » section of /essayer (#7).
// No React, no DOM, no logging. Final copy: « Précisions PO Sprint 2 (2026-11-01) » on #7, §3–§4.
// The introducer sentence itself (Introducer.why) comes from lib/explain.js introducerWhy().

import { NO_RESULTS_TITLE, resultsSummary } from './search'
import { MAX_INTRODUCERS } from '../../lib/introducers.js'

/** Number of people the section lists at most. */
export const SHOWN_MAX = MAX_INTRODUCERS

/** Above this length, the not-found notice no longer quotes the company as typed (PO §4). */
export const NOTICE_LABEL_MAX = 40

export const NOT_FOUND_HINT = 'Si cette entreprise porte un autre nom dans votre fichier, citez ce nom.'

function clean(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

/** h2: « Qui peut vous présenter chez Atlas Conseil » */
export function introducersHeading(companyLabel) {
  return `Qui peut vous présenter chez ${clean(companyLabel)}`
}

/**
 * The line under the heading, also the first part of the status announcement.
 * @param {number} total   people at this company before the cap (IntroducersResult.total)
 * @param {string} companyLabel
 */
export function introducersCountLine(total, companyLabel) {
  const company = clean(companyLabel)
  const n = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0
  if (n > SHOWN_MAX) {
    return `Plus de ${SHOWN_MAX} personnes de votre réseau travaillent chez ${company} d'après votre fichier. ` +
      `Voici les ${SHOWN_MAX} premières par ordre alphabétique.`
  }
  if (n <= 1) return `1 personne de votre réseau travaille chez ${company} d'après votre fichier.`
  return `${n} personnes de votre réseau travaillent chez ${company} d'après votre fichier.`
}

/**
 * The notice when the company named in the request is not in the file.
 * Uses the generic wording when the captured name is empty or longer than 40 characters.
 * @param {string|null} companyLabel   the name as typed
 */
export function notFoundNotice(companyLabel) {
  const company = clean(companyLabel)
  const head = company && Array.from(company).length <= NOTICE_LABEL_MAX
    ? `Aucune personne de votre réseau ne travaille chez ${company} d'après votre fichier.`
    : "Aucune personne de votre réseau ne travaille dans l'entreprise que vous citez d'après votre fichier."
  return `${head} ${NOT_FOUND_HINT}`
}

/**
 * What the introducer area says first: the count line (found), the notice (not_found), or null.
 * @param {import('../../lib/types.js').IntroducersResult | null | undefined} intro
 */
export function introducersMessage(intro) {
  if (!intro || typeof intro !== 'object') return null
  if (intro.status === 'found' && Array.isArray(intro.people) && intro.people.length > 0) {
    return introducersCountLine(intro.total ?? intro.people.length, intro.companyLabel)
  }
  if (intro.status === 'not_found') return notFoundNotice(intro.companyLabel)
  return null
}

/**
 * The single polite status message after a search (PO §2): the introducer line or notice,
 * then the #6 summary. With no company named, exactly the #6 summary (new AC 5).
 * @param {import('../../lib/types.js').IntroducersResult | null | undefined} intro
 * @param {number} resultsCount
 */
export function searchAnnouncement(intro, resultsCount) {
  const summary = resultsCount > 0 ? resultsSummary(resultsCount) : NO_RESULTS_TITLE
  const first = introducersMessage(intro)
  return first ? `${first} ${summary}` : summary
}

/** Whether the introducer area shows anything at all. */
export function showsIntroducers(intro) {
  return introducersMessage(intro) !== null
}
