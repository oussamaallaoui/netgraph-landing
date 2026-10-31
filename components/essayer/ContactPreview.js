'use client'
// Preview after an import: count, skipped rows, sample badge, first 10 rows.

import { importedLabel, skippedLabel, formatNumber } from './format'
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

export default function ContactPreview({ headingRef, contacts, isSample, skipped }) {
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
          {importedLabel(contacts.length)}
        </h1>
        {skipped > 0 && (
          <p className="mt-2 text-sm text-slate">
            {skippedLabel(skipped)}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-slate">
          {isSample
            ? 'Exemple de démonstration : noms et entreprises fictifs. Ils sont enregistrés sur cet appareil uniquement.'
            : 'Elles sont enregistrées sur cet appareil uniquement.'}
        </p>
      </div>

      <div
        className={`mt-8 overflow-x-auto rounded-2xl border border-gray-100 bg-white ${FOCUS}`}
        tabIndex={0}
        role="region"
        aria-labelledby="preview-caption"
      >
        <table className="w-full border-collapse text-left text-sm">
          <caption id="preview-caption" className="px-4 pb-2 pt-4 text-left text-sm font-medium text-ink sm:px-5">
            {contacts.length > PREVIEW_ROWS
              ? `Aperçu : les ${PREVIEW_ROWS} premières relations sur ${formatNumber(contacts.length)}`
              : 'Aperçu de vos relations'}
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
