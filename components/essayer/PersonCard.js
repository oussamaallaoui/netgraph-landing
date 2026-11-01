// Card for one person, shared by the #6 results (ResultCard) and the #7 introducers:
// initials, name (h3), position, company as written in the file, the
// « Pourquoi cette personne » box and the LinkedIn profile link when the stored URL is a
// valid https LinkedIn URL. The « Préparer un message » action (#8) goes in `children`,
// once, for both kinds of card; nothing is rendered there until #8 lands (no dead button).

import { linkedInHref, initialsOf, WHY_LABEL } from './search'
import { LINK } from './ui'

/**
 * @param {object} props
 * @param {import('../../lib/types.js').Contact} props.contact
 * @param {string} props.why
 * @param {import('react').ReactNode} [props.children]   footer actions (#8)
 */
export default function PersonCard({ contact, why, children }) {
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

      {children}
    </article>
  )
}
