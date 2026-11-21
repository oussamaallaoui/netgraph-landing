// One « Qui peut vous présenter chez … » block (#7): h2, count line and one card per person,
// each with « Préparer un message » (#8, an introduction draft citing this block's company).
// Rendered once for a found result, and once per company for found_many (#35).

import { useId } from 'react'
import PersonCard from './PersonCard'
import DraftAction from './DraftAction'
import SampleBadge from './SampleBadge'
import { introducersCountLine, introducersHeading } from './introducersCopy'

/**
 * @param {object} props
 * @param {string} props.companyLabel
 * @param {import('../../lib/types.js').Introducer[]} props.people
 * @param {number} [props.total]          people at this company before the cap
 * @param {boolean} [props.badge]         sample badge above the heading
 * @param {import('react').Ref<HTMLElement>} [props.headingRef]   focus / scroll target after a search
 * @param {string} [props.describedBy]    id of a line the heading should read out with it
 * @param {string} [props.className]
 */
export default function IntroducerGroup({ companyLabel, people, total, badge = false, headingRef, describedBy, className = '' }) {
  const headingId = `introducers-heading-${useId().replace(/:/g, '')}`
  return (
    <section aria-labelledby={headingId} className={className}>
      {badge && <SampleBadge className="mb-3" />}
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        aria-describedby={describedBy}
        className="scroll-mt-6 break-words text-xl font-semibold leading-snug tracking-tight text-ink focus:outline-none"
      >
        {introducersHeading(companyLabel)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate">
        {introducersCountLine(total ?? people.length, companyLabel)}
      </p>

      <ol className="mt-5 space-y-4">
        {people.map(({ contact, why }) => (
          <li key={contact.id}>
            <PersonCard contact={contact} why={why}>
              <DraftAction contact={contact} kind="intro" companyLabel={companyLabel} />
            </PersonCard>
          </li>
        ))}
      </ol>
    </section>
  )
}
