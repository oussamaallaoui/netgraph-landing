'use client'
// /essayer: step state. Loads the stored contacts on mount, shows the import
// step, or the preview followed by the request and results step (#6). Contacts live in React state and in lib/store.js
// (IndexedDB, this device only). Nothing here sends, logs or tracks contact data.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Logo from '../Logo'
import ImportStep from './ImportStep'
import ContactPreview from './ContactPreview'
import ClearDataButton from './ClearDataButton'
import RequestStep from './RequestStep'
import Arrow from './Arrow'
import { importErrorMessage } from './importErrors'
import { loadContacts, saveContacts, clearAllData } from '../../lib/store.js'
import { FOCUS, LINK } from './ui'

/** @typedef {import('../../lib/types.js').Contact} Contact */

export const CLEARED_MESSAGE = 'Vos données ont été effacées de cet appareil.'
export const CLEAR_BLOCKED_MESSAGE = 'Fermez les autres onglets NetGraph ouverts, puis réessayez.'

export default function TryApp() {
  // 'loading' until loadContacts() answers, then 'import' or 'preview'
  const [step, setStep] = useState('loading')
  /** @type {[null | { contacts: Contact[], isSample: boolean, skipped: number }, Function]} */
  const [data, setData] = useState(null)
  const [persisted, setPersisted] = useState(true)
  const [cleared, setCleared] = useState(false)
  const [clearBlocked, setClearBlocked] = useState(false)
  // Failed re-import while a previous import is stored: shown above the previous preview.
  const [importError, setImportError] = useState(null)
  // Bumped on each successful import: remounts RequestStep, so a new import starts
  // with an empty request and no results.
  const [importCount, setImportCount] = useState(0)
  const headingRef = useRef(null)
  const errorRef = useRef(null)
  // What to focus after the next step change caused by a user action: null | 'heading' | 'error'
  const focusNext = useRef(null)

  useEffect(() => {
    let active = true
    loadContacts().then(stored => {
      if (!active) return
      if (stored && stored.contacts.length > 0) {
        setData({ contacts: stored.contacts, isSample: stored.isSample, skipped: 0 })
        setStep('preview')
      } else {
        setStep('import')
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!focusNext.current || step === 'loading') return
    const target = focusNext.current === 'error' ? errorRef.current : headingRef.current
    focusNext.current = null
    target?.focus()
  }, [step, importError])

  async function handleImported({ contacts, isSample, skipped }) {
    const { persisted: ok } = await saveContacts({ contacts, isSample })
    setPersisted(ok)
    setCleared(false)
    setClearBlocked(false)
    setImportError(null)
    setData({ contacts, isSample, skipped })
    setImportCount(n => n + 1)
    focusNext.current = 'heading'
    setStep('preview')
  }

  function handleImportErrorWithPrevious(code) {
    setImportError(code)
    focusNext.current = 'error'
    setStep('preview')
  }

  /** @returns {Promise<{ cleared: boolean }>} */
  async function handleClear() {
    const result = await clearAllData()
    if (!result?.cleared) {
      // Data may remain (e.g. another NetGraph tab holds the database): keep the
      // preview, never claim success.
      setClearBlocked(true)
      return { cleared: false }
    }
    setData(null)
    setPersisted(true)
    setImportError(null)
    setClearBlocked(false)
    setCleared(true)
    focusNext.current = 'heading'
    setStep('import')
    return { cleared: true }
  }

  function handleReplace() {
    setImportError(null)
    setCleared(false)
    focusNext.current = 'heading'
    setStep('import')
  }

  function handleCancelReplace() {
    focusNext.current = 'heading'
    setStep('preview')
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className={`flex items-center gap-2 rounded-lg ${FOCUS}`}>
            <Logo />
            <span className="font-semibold tracking-tight text-ink">NetGraph</span>
            <span className="sr-only">, retour à l&apos;accueil</span>
          </Link>
          <Link href="/#beta" className={`inline-flex items-center gap-1 text-sm ${LINK}`}>
            Rejoindre la beta <Arrow />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <p className="mb-2 text-sm font-medium text-violet">Essayer NetGraph</p>

        {step === 'loading' && (
          <p className="text-slate" role="status">Chargement…</p>
        )}

        {step === 'import' && (
          <ImportStep
            headingRef={headingRef}
            onImported={handleImported}
            onError={data ? handleImportErrorWithPrevious : null}
            onCancel={data ? handleCancelReplace : null}
            notice={cleared ? CLEARED_MESSAGE : null}
          />
        )}

        {step === 'preview' && data && (
          <>
            <div aria-live="polite">
              {importError && (
                <p
                  ref={errorRef}
                  tabIndex={-1}
                  className="mb-6 rounded-2xl border border-red-200 bg-white p-4 text-sm font-medium leading-relaxed text-red-700 focus:outline-none"
                >
                  {importErrorMessage(importError, { hasPrevious: true })}
                </p>
              )}
            </div>

            {!persisted && (
              <p className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-ink" role="status">
                Votre navigateur ne permet pas de conserver vos contacts : ils seront oubliés à la fermeture de l&apos;onglet.
              </p>
            )}

            <ContactPreview
              headingRef={headingRef}
              contacts={data.contacts}
              isSample={data.isSample}
              skipped={data.skipped}
            />

            <RequestStep key={importCount} contacts={data.contacts} isSample={data.isSample} />

            <div className="mt-10 flex flex-col gap-6 border-t border-gray-100 pt-8 sm:flex-row sm:items-start sm:justify-between">
              <button type="button" onClick={handleReplace} className={`self-start text-sm ${LINK}`}>
                Importer un autre fichier
              </button>
              <ClearDataButton
                onClear={handleClear}
                error={clearBlocked ? CLEAR_BLOCKED_MESSAGE : null}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
