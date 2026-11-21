// « Qui peut vous présenter chez … » (#7), between the request form and the #6 results.
// found: one block (./IntroducerGroup): h2, the count line and one card per person
// (sorted by lib/introducers.js), each offering « Préparer un message » (#8);
// found_many (#35): the intro line, then one block per company (each a section labelled by
// its own h2, drafts citing that company), then the overflow line when companies are left out;
// not_found: the PO notice, no person; no_company: nothing at all (the #6 screen is unchanged).
// Copy: « Précisions PO Sprint 2 (2026-11-01) » on #7 and the PO comment of 2026-11-17 on #35,
// in ./introducersCopy.js.

import { useId } from 'react'
import IntroducerGroup from './IntroducerGroup'
import SampleBadge from './SampleBadge'
import { foundManyLines, notFoundNotice } from './introducersCopy'

/**
 * @param {object} props
 * @param {import('../../lib/types.js').IntroducersResult} props.intro
 * @param {boolean} props.isSample
 * @param {import('react').Ref<HTMLElement>} props.focusRef  heading (found; the first company's for
 *   found_many) or notice (not_found): focus / scroll target after a search, as the first thing shown
 */
export default function IntroducersSection({ intro, isSample, focusRef }) {
  const introLineId = `introducers-intro-${useId().replace(/:/g, '')}`
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

  if (intro.status === 'found_many') {
    const lines = foundManyLines(intro)
    if (!lines) return null
    return (
      <div className="mt-10">
        {isSample && <SampleBadge className="mb-3" />}
        <p id={introLineId} className="mb-4 text-sm leading-relaxed text-ink">{lines.intro}</p>
        {lines.groups.map((group, i) => (
          <IntroducerGroup
            key={group.companyLabel}
            companyLabel={group.companyLabel}
            people={group.people}
            total={group.total}
            headingRef={i === 0 ? focusRef : undefined}
            describedBy={i === 0 ? introLineId : undefined}
            className={i === 0 ? '' : 'mt-10 border-t border-gray-100 pt-8'}
          />
        ))}
        {lines.overflow && (
          <p className="mt-8 text-sm leading-relaxed text-slate">{lines.overflow}</p>
        )}
      </div>
    )
  }

  if (intro.status !== 'found' || !Array.isArray(intro.people) || intro.people.length === 0) return null

  return (
    <IntroducerGroup
      companyLabel={intro.companyLabel}
      people={intro.people}
      total={intro.total}
      badge={isSample}
      headingRef={focusRef}
      className="mt-10"
    />
  )
}
