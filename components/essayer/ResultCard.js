// One person found for the request: initials, name, position, company,
// « Pourquoi cette personne » (MatchResult.why, from lib/explain.js whyText) and
// the LinkedIn profile link when the stored URL is a valid https LinkedIn URL.
// The « Préparer un message » action (#8) will go in the footer; it isn't
// rendered until #8 lands (no dead button).

import { linkedInHref, initialsOf, WHY_LABEL } from './search'
import { LINK } from './ui'

/** @param {{ result: import('../../lib/types.js').MatchResult }} props */
export default function ResultCard({ result }) {
  const { contact, why } = result
  const href = linkedInHref(contact.profileUrl)
  const initials = initialsOf(contact)

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-light text-sm font-medium text-violet"
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold leading-snug text-ink">{contact.fullName}</h3>
          {contact.position && (
            <p className="mt-0.5 break-words text-sm leading-relaxed text-slate">{contact.position}</p>
          )}
          {contact.company && (
            <p className="break-words text-sm leading-relaxed text-slate">{contact.company}</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-mist px-4 py-3">
        <p className="text-xs font-medium text-violet">{WHY_LABEL}</p>
        <p className="mt-1 break-words text-sm leading-relaxed text-ink">{why}</p>
      </div>

      {href && (
        <p className="mt-3 text-sm">
          <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
            Voir le profil LinkedIn
            <span className="sr-only"> de {contact.fullName} (nouvel onglet)</span>
          </a>
        </p>
      )}
    </article>
  )
}
