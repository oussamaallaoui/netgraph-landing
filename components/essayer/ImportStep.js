'use client'
// Import step: the on-device promise (under the intro, #20), how to get the LinkedIn
// export and the phone export (.vcf), one drop zone with a labelled file input that takes
// either file (importFile detects which), and the sample-data button.
// Copy: #5 comment 2026-10-29, updated by « Précisions PO Sprint 3 » §6 on #9 (final).

import { useEffect, useId, useState } from 'react'
import { importFile } from './importFile'
import { importErrorMessage, MAX_FILE_MB } from './importErrors'
import { SAMPLE_CONTACTS } from '../../lib/fixtures/sample-contacts.js'
import Arrow from './Arrow'
import { BUTTON_SECONDARY, LINK, TOUCH } from './ui'

const LINKEDIN_EXPORT_URL = 'https://www.linkedin.com/mypreferences/d/download-my-data'

const STEPS = [
  <>Sur LinkedIn, ouvrez le menu «&nbsp;Vous&nbsp;», puis «&nbsp;Préférences et confidentialité&nbsp;».</>,
  <>Dans «&nbsp;Confidentialité des données&nbsp;», choisissez «&nbsp;Obtenir une copie de vos données&nbsp;».</>,
  <>Cochez «&nbsp;Relations&nbsp;», puis cliquez sur «&nbsp;Demander l&apos;archive&nbsp;».</>,
  <>LinkedIn vous envoie un e-mail quand l&apos;archive est prête&nbsp;: comptez de quelques minutes à 24&nbsp;heures.</>,
  <>
    Téléchargez l&apos;archive (.zip), ouvrez-la et déposez ici le fichier{' '}
    <span className="font-medium text-ink">Connections.csv</span>, sans l&apos;ouvrir dans Excel.
  </>,
]

const PHONE_STEPS = [
  <>
    Sur iPhone&nbsp;: ouvrez l&apos;app Contacts, touchez «&nbsp;Listes&nbsp;», maintenez le doigt sur «&nbsp;Tous les
    contacts&nbsp;», puis choisissez «&nbsp;Exporter&nbsp;». Enregistrez le fichier .vcf dans Fichiers, puis déposez-le ici.
  </>,
  <>
    Sur Android&nbsp;: ouvrez l&apos;application Contacts et cherchez «&nbsp;Exporter&nbsp;» (souvent dans le menu ⋮ ou
    dans «&nbsp;Gérer les contacts&nbsp;»). Choisissez un fichier .vcf, puis déposez-le ici.
  </>,
  <>Vous pouvez aussi ouvrir cette page sur votre téléphone et choisir le fichier directement.</>,
]

/**
 * @typedef {{ source: 'linkedin'|'phone'|'sample', contacts: any[], skipped: number, unrecognizedPhones: number }} ImportedFile
 */

/**
 * @param {object} props
 * @param {(result: ImportedFile) => Promise<void>} props.onImported
 * @param {((code: string, source: 'linkedin'|'phone'|null) => void) | null} [props.onError]  set when a
 *   previous import exists: the parent shows the error above the previous preview instead of here
 * @param {(() => void) | null} [props.onCancel]
 * @param {string | null} [props.notice]  announced once after mount (e.g. after deletion)
 */
export default function ImportStep({ headingRef, onImported, onError, onCancel, notice }) {
  const inputId = useId()
  const hintId = useId()
  const [busy, setBusy] = useState(null) // null | 'file' | 'sample'
  /** null | { code, source }: the failed import, shown here when nothing was imported before */
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  // Inserted into the live region after mount, so screen readers announce it.
  const [liveNotice, setLiveNotice] = useState(null)

  useEffect(() => {
    if (!notice) return undefined
    const t = setTimeout(() => setLiveNotice(notice), 150)
    return () => clearTimeout(t)
  }, [notice])

  async function handleFile(file) {
    if (!file || busy) return
    setBusy('file')
    setError(null)
    setLiveNotice(null)
    const out = await importFile(file)
    if (out.ok) {
      await onImported({
        source: out.source,
        contacts: out.contacts,
        skipped: out.skipped,
        unrecognizedPhones: out.unrecognizedPhones,
      })
    } else if (onError) {
      onError(out.code, out.source)
    } else {
      setError({ code: out.code, source: out.source })
      setBusy(null)
    }
  }

  async function handleSample() {
    if (busy) return
    setBusy('sample')
    setError(null)
    setLiveNotice(null)
    await onImported({
      source: 'sample',
      contacts: SAMPLE_CONTACTS.map(c => ({ ...c, sources: [...c.sources] })),
      skipped: 0,
      unrecognizedPhones: 0,
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) handleFile(files[0])
  }

  function handleDragOver(e) {
    e.preventDefault()
    if (!dragOver) setDragOver(true)
  }

  return (
    <section aria-labelledby="import-heading">
      <h1
        id="import-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mb-4 text-3xl font-semibold leading-tight tracking-tight text-ink focus:outline-none sm:text-4xl"
      >
        Importez vos contacts
      </h1>
      <p className="mb-6 max-w-xl text-base leading-relaxed text-slate">
        NetGraph cherche dans votre réseau les personnes qui peuvent vous aider. Importez vos relations
        LinkedIn, les contacts de votre téléphone, ou les deux.
      </p>

      {/* The on-device promise (exact wording from the #5 criteria). Shown once, right under the
          intro and before the steps, drop zone and sample button, so it is above the fold (#20). */}
      <div className="mb-8 flex max-w-xl items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-light text-violet">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
            <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <p className="text-sm font-semibold leading-relaxed text-ink">
          Vos contacts restent sur cet appareil : ils ne sont jamais envoyés à NetGraph.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
        {/* How to get the files */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">Relations LinkedIn (Connections.csv)</h2>
          <ol className="space-y-3 text-sm leading-relaxed text-slate">
            {STEPS.map((text, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-light text-xs font-medium text-violet"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm">
            <a href={LINKEDIN_EXPORT_URL} target="_blank" rel="noopener noreferrer" className={`${TOUCH} ${LINK}`}>
              Ouvrir la page d&apos;export de LinkedIn<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </p>

          <h2 className="mb-4 mt-8 text-lg font-semibold text-ink">Contacts du téléphone (.vcf)</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-slate">
            {PHONE_STEPS.map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Drop zone + labelled file input */}
        <div>
          <label
            htmlFor={inputId}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
              px-6 py-10 text-center transition-colors duration-150 motion-reduce:transition-none
              focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-violet
              ${dragOver ? 'border-violet bg-violet-light' : 'border-gray-300 bg-white hover:border-violet'}
              ${busy ? 'pointer-events-none opacity-60' : ''}`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-light text-violet">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
                <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-base font-medium text-ink">Déposez votre fichier Connections.csv ou .vcf</span>
            <span className="text-sm text-slate">
              ou <span className="font-medium text-violet underline underline-offset-2">choisissez-le sur votre appareil</span>
            </span>
            <span id={hintId} className="text-xs text-slate">Fichier .csv ou .vcf · {MAX_FILE_MB}&nbsp;Mo maximum</span>
            <input
              id={inputId}
              type="file"
              accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard"
              aria-describedby={hintId}
              className="sr-only"
              disabled={!!busy}
              onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = '' // so choosing the same file again re-triggers onChange
                handleFile(file)
              }}
            />
          </label>

          {/* Import status, errors and notices, announced politely */}
          <div aria-live="polite" className="mt-4 min-h-[1.5rem] text-sm leading-relaxed">
            {busy && (
              <p className="text-slate">
                {busy === 'sample' ? "Chargement des contacts d'exemple…" : 'Lecture du fichier…'}
              </p>
            )}
            {!busy && error && (
              <p className="rounded-2xl border border-red-200 bg-white p-4 font-medium text-red-700">
                {importErrorMessage(error.code, { source: error.source })}
              </p>
            )}
            {!busy && !error && liveNotice && <p className="text-ink">{liveNotice}</p>}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <p className="mb-3 text-sm text-slate">Vous n&apos;avez pas encore votre export ?</p>
            <button type="button" onClick={handleSample} disabled={!!busy} className={`${BUTTON_SECONDARY} w-full sm:w-auto`}>
              Essayer avec des contacts d&apos;exemple <Arrow />
            </button>
            <p className="mt-2 text-xs text-slate">30 personnes et entreprises fictives.</p>
          </div>

          {onCancel && (
            <p className="mt-4 text-sm">
              <button type="button" onClick={onCancel} className={`${TOUCH} ${LINK}`}>
                Revenir à mes relations importées
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
