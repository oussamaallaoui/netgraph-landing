// « Qui peut vous présenter chez … » (#7), between the request form and the #6 results.
// found: h2, the count line and one card per person (sorted by lib/introducers.js);
// not_found: the PO notice, no person; no_company: nothing at all (the #6 screen is unchanged).
// Copy: « Précisions PO Sprint 2 (2026-11-01) » on #7, in ./introducersCopy.js.

import PersonCard from './PersonCard'
import SampleBadge from './SampleBadge'
import { introducersCountLine, introducersHeading, notFoundNotice } from './introducersCopy'

/**
 * @param {object} props
 * @param {import('../../lib/types.js').IntroducersResult} props.intro
 * @param {boolean} props.isSample
 * @param {import('react').Ref<HTMLElement>} props.focusRef  heading (found) or notice (not_found):
 *   focus / scroll target after a search, as the first thing shown
 */
export default function IntroducersSection({ intro, isSample, focusRef }) {
  if (!intro) return null

  if (intro.status === 'not_found') {
    return (
      <div
        ref={focusRef}
        tabIndex={-1}
        className="mt-10 scroll-mt-6 rounded-2xl border border-gray-100 bg-mist px-5 py-4 focus:outline-none"
      >
        <p className="text-sm leading-relaxed text-ink">{notFoundNotice(intro.companyLabel)}</p>
      </div>
    )
  }

  if (intro.status !== 'found' || !Array.isArray(intro.people) || intro.people.length === 0) return null

  return (
    <section aria-labelledby="introducers-heading" className="mt-10">
      {isSample && <SampleBadge className="mb-3" />}
      <h2
        id="introducers-heading"
        ref={focusRef}
        tabIndex={-1}
        className="scroll-mt-6 break-words text-xl font-semibold leading-snug tracking-tight text-ink focus:outline-none"
      >
        {introducersHeading(intro.companyLabel)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate">
        {introducersCountLine(intro.total ?? intro.people.length, intro.companyLabel)}
      </p>

      <ol className="mt-5 space-y-4">
        {intro.people.map(({ contact, why }) => (
          <li key={contact.id}>
            <PersonCard contact={contact} why={why} />
          </li>
        ))}
      </ol>
    </section>
  )
}
