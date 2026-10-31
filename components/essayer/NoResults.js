// No-results screen (#6 F3, PO copy 2026-10-29): help to rephrase, with the
// example requests as buttons that fill the field and run the search.

import { NO_RESULTS_HELP, NO_RESULTS_TITLE } from './search'
import { FOCUS } from './ui'
import { EXAMPLE_REQUESTS } from '../../lib/vocabulary.js'

/**
 * @param {object} props
 * @param {(example: string) => void} props.onExample
 * @param {import('react').Ref<HTMLHeadingElement>} props.headingRef
 */
export default function NoResults({ onExample, headingRef }) {
  return (
    <section aria-labelledby="no-results-heading" className="mt-10 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
      <h2
        id="no-results-heading"
        ref={headingRef}
        tabIndex={-1}
        className="scroll-mt-6 text-lg font-semibold leading-snug text-ink focus:outline-none"
      >
        {NO_RESULTS_TITLE}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate">{NO_RESULTS_HELP}</p>
      <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {EXAMPLE_REQUESTS.map((example) => (
          <li key={example}>
            <button
              type="button"
              onClick={() => onExample(example)}
              className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-left text-sm font-medium text-violet
                transition-colors duration-150 hover:border-violet hover:bg-violet-light motion-reduce:transition-none
                sm:w-auto ${FOCUS}`}
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
