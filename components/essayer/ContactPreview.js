'use client'
// Preview after an import: count, status lines of the import just done (#9 PO §6),
// sample badge, first 10 rows (Nom / Poste / Entreprise: phone numbers are never shown).

import { previewCaption, previewHeading, previewNote } from './importCopy'
import { FOCUS } from './ui'
import SampleBadge from './SampleBadge'

const PREVIEW_ROWS = 10

function Cell({ value }) {
  if (value) return value
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">Non renseigné</span>
    </>
  )
}

/**
 * @param {object} props
 * @param {import('../../lib/types.js').Contact[]} props.contacts  the merged list
 * @param {boolean} props.isSample
 * @param {boolean} props.hasPhone      phone contacts are stored
 * @param {string[]} props.statusLines  from importStatusLines(), empty after a reload
 */
export default function ContactPreview({ headingRef, contacts, isSample, hasPhone, statusLines }) {
  const rows = contacts.slice(0, PREVIEW_ROWS)

  return (
    <section aria-labelledby="preview-heading">
      <div aria-live="polite">
        {isSample && (
          <SampleBadge className="mb-4" />
        )}
        <h1
          id="preview-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold leading-tight tracking-tight text-ink focus:outline-none sm:text-4xl"
        >
          {previewHeading(contacts.length, hasPhone)}
        </h1>
        {statusLines.map((line) => (
          <p key={line} className="mt-2 text-sm leading-relaxed text-slate">
            {line}
          </p>
        ))}
        <p className="mt-3 text-sm leading-relaxed text-slate">{previewNote({ isSample, hasPhone })}</p>
      </div>

      <div
        className={`mt-8 overflow-x-auto rounded-2xl border border-gray-100 bg-white ${FOCUS}`}
        tabIndex={0}
        role="region"
        aria-labelledby="preview-caption"
      >
        <table className="w-full border-collapse text-left text-sm">
          <caption id="preview-caption" className="px-4 pb-2 pt-4 text-left text-sm font-medium text-ink sm:px-5">
            {previewCaption(contacts.length, PREVIEW_ROWS, hasPhone)}
          </caption>
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-slate">
              <th scope="col" className="px-3 py-3 font-medium sm:px-5">Nom</th>
              <th scope="col" className="px-3 py-3 font-medium sm:px-5">Poste</th>
              <th scope="col" className="px-3 py-3 font-medium sm:px-5">Entreprise</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="border-b border-gray-100 align-top last:border-0">
                <th scope="row" className="px-3 py-3 font-medium text-ink sm:px-5">{c.fullName}</th>
                <td className="px-3 py-3 text-slate sm:px-5"><Cell value={c.position} /></td>
                <td className="px-3 py-3 text-slate sm:px-5"><Cell value={c.company} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
