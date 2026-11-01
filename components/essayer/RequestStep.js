'use client'
// Request and results step of /essayer (#6, #7). Builds the contact index once per
// import (F4), runs lib/match.js and lib/introducers.js on submit only, on the same text,
// and shows the introducers (or the « absent » notice) above the ranked list, or the
// no-results screen. The request lives in this component's state only: it is never
// put in the URL, stored, logged or sent anywhere. TryApp remounts this component
// (key) on each import, and unmounts it when the data is cleared.

import { useEffect, useMemo, useRef, useState } from 'react'
import RequestForm from './RequestForm'
import ResultsList from './ResultsList'
import NoResults from './NoResults'
import IntroducersSection from './IntroducersSection'
import { requestToSearch } from './search'
import { searchAnnouncement } from './introducersCopy'
import { buildIndex, match } from '../../lib/match.js'
import { introducers } from '../../lib/introducers.js'

/** @typedef {import('../../lib/types.js').Contact} Contact */
/** @typedef {import('../../lib/types.js').MatchResult} MatchResult */
/** @typedef {import('../../lib/types.js').IntroducersResult} IntroducersResult */

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param {object} props
 * @param {Contact[]} props.contacts
 * @param {boolean} props.isSample
 */
export default function RequestStep({ contacts, isSample }) {
  const index = useMemo(() => buildIndex(contacts), [contacts])
  const [value, setValue] = useState('')
  const [showEmptyError, setShowEmptyError] = useState(false)
  /** @type {[null | { results: MatchResult[], intro: IntroducersResult, id: number }, Function]} */
  const [search, setSearch] = useState(null)
  // Polite status text for screen readers; a trailing no-break space alternates so that
  // the same summary twice in a row is announced again.
  const [announcement, setAnnouncement] = useState('')
  const headingRef = useRef(null)
  // Introducer heading or « absent » notice: when shown, it comes first on screen.
  const introRef = useRef(null)
  const inputRef = useRef(null)
  // After the next search: 'focus' the first heading shown (example buttons, whose own
  // button disappears) or 'reveal' it (field / submit button keep the focus).
  const afterSearch = useRef(null)

  useEffect(() => {
    if (!search || !afterSearch.current) return
    const mode = afterSearch.current
    afterSearch.current = null
    const heading = introRef.current ?? headingRef.current
    if (!heading) return
    if (mode === 'focus') {
      heading.focus()
      return
    }
    const { top } = heading.getBoundingClientRect()
    if (top < 0 || top > window.innerHeight - 96) {
      heading.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
    }
  }, [search])

  /** @param {string} text @param {'reveal' | 'focus'} mode */
  function runSearch(text, mode) {
    const request = requestToSearch(text)
    if (request === null) {
      setShowEmptyError(true)
      inputRef.current?.focus()
      return
    }
    setShowEmptyError(false)
    const { results } = match(request, index)
    const intro = introducers(request, index)
    afterSearch.current = mode
    setSearch((prev) => ({ results, intro, id: (prev?.id ?? 0) + 1 }))
    // Focusing the heading reads it out already: no live announcement then (said once).
    setAnnouncement((prev) => {
      if (mode === 'focus') return ''
      const text = searchAnnouncement(intro, results.length)
      return prev === text ? `${text} ` : text
    })
  }

  function handleChange(next) {
    setValue(next)
    if (showEmptyError && next.trim()) setShowEmptyError(false)
  }

  function handleExample(example) {
    setValue(example)
    runSearch(example, 'focus')
  }

  return (
    <>
      <section aria-labelledby="request-heading" className="mt-12 border-t border-gray-100 pt-10">
        <h2 id="request-heading" className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-ink">
          Décrivez votre besoin
        </h2>
        <p className="mb-6 max-w-xl text-sm leading-relaxed text-slate">
          La recherche se fait sur cet appareil : votre demande n&apos;est pas envoyée à NetGraph.
        </p>
        <RequestForm
          value={value}
          onChange={handleChange}
          onSubmit={() => runSearch(value, 'reveal')}
          showEmptyError={showEmptyError}
          inputRef={inputRef}
        />
      </section>

      <p role="status" className="sr-only">{announcement}</p>

      {search && (
        <IntroducersSection key={`intro-${search.id}`} intro={search.intro} isSample={isSample} focusRef={introRef} />
      )}

      {search && search.results.length > 0 && (
        <ResultsList key={search.id} results={search.results} isSample={isSample} headingRef={headingRef} />
      )}
      {search && search.results.length === 0 && (
        <NoResults key={search.id} onExample={handleExample} headingRef={headingRef} />
      )}
    </>
  )
}
