// The ranked results (#6 F2): summary heading, up to 10 cards in order, and
// the « élargir la recherche » tip when there are only 1 or 2 people.

import ResultCard from './ResultCard'
import SampleBadge from './SampleBadge'
import { FEW_RESULTS_TIP, resultsOutcome, resultsSummary } from './search'

/**
 * @param {object} props
 * @param {import('../../lib/types.js').MatchResult[]} props.results  non-empty, already ranked
 * @param {boolean} props.isSample
 * @param {import('react').Ref<HTMLHeadingElement>} props.headingRef  focus target after an example search
 */
export default function ResultsList({ results, isSample, headingRef }) {
  return (
    <section aria-labelledby="results-heading" className="mt-10">
      {isSample && <SampleBadge className="mb-3" />}
      <h2
        id="results-heading"
        ref={headingRef}
        tabIndex={-1}
        className="scroll-mt-6 text-xl font-semibold leading-snug tracking-tight text-ink focus:outline-none"
      >
        {resultsSummary(results.length)}
      </h2>

      <ol className="mt-5 space-y-4">
        {results.map((result) => (
          <li key={result.contact.id}>
            <ResultCard result={result} />
          </li>
        ))}
      </ol>

      {resultsOutcome(results) === 'few' && (
        <p className="mt-5 text-sm leading-relaxed text-slate">{FEW_RESULTS_TIP}</p>
      )}
    </section>
  )
}
