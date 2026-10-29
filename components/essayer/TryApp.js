'use client'
// /essayer: step state. Loads the stored contacts on mount, shows the import
// step or the preview. Contacts live in React state and in lib/store.js
// (IndexedDB, this device only). Nothing here sends, logs or tracks contact data.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Logo from '../Logo'
import ImportStep from './ImportStep'
import ContactPreview from './ContactPreview'
import ClearDataButton from './ClearDataButton'
import Arrow from './Arrow'
import { loadContacts, saveContacts, clearAllData } from '../../lib/store.js'
import { FOCUS, LINK } from './ui'

/** @typedef {import('../../lib/types.js').Contact} Contact */

export default function TryApp() {
  // 'loading' until loadContacts() answers, then 'import' or 'preview'
  const [step, setStep] = useState('loading')
  /** @type {[null | { contacts: Contact[], isSample: boolean, skipped: number }, Function]} */
  const [data, setData] = useState(null)
  const [persisted, setPersisted] = useState(true)
  const [cleared, setCleared] = useState(false)
  const headingRef = useRef(null)
  const focusOnNextStep = useRef(false)

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

  // Move focus to the new step's heading after a user action (not on first load).
  useEffect(() => {
    if (focusOnNextStep.current && step !== 'loading') {
      focusOnNextStep.current = false
      headingRef.current?.focus()
    }
  }, [step])

  async function handleImported({ contacts, isSample, skipped }) {
    const { persisted: ok } = await saveContacts({ contacts, isSample })
    setPersisted(ok)
    setCleared(false)
    setData({ contacts, isSample, skipped })
    focusOnNextStep.current = true
    setStep('preview')
  }

  async function handleClear() {
    await clearAllData()
    setData(null)
    setPersisted(true)
    setCleared(true)
    focusOnNextStep.current = true
    setStep('import')
  }

  function handleReplace() {
    focusOnNextStep.current = true
    setStep('import')
  }

  function handleCancelReplace() {
    focusOnNextStep.current = true
    setStep('preview')
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className={`flex items-center gap-2 rounded-lg ${FOCUS}`}>
            <Logo />
            <span className="font-semibold tracking-tight text-ink">NetGraph</span>
            <span className="sr-only">, retour à l'accueil</span>
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
            onCancel={data ? handleCancelReplace : null}
            notice={cleared ? 'Vos données ont été effacées de cet appareil.' : null}
          />
        )}

        {step === 'preview' && data && (
          <>
            {!persisted && (
              <p className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-ink" role="status">
                Votre navigateur ne permet pas de conserver vos contacts : ils seront oubliés à la fermeture de l'onglet.
              </p>
            )}

            <ContactPreview
              headingRef={headingRef}
              contacts={data.contacts}
              isSample={data.isSample}
              skipped={data.skipped}
            />

            <p className="mt-8 rounded-2xl bg-mist px-5 py-4 text-sm leading-relaxed text-ink">
              Étape suivante : décrivez votre besoin.
            </p>

            <div className="mt-10 flex flex-col gap-6 border-t border-gray-100 pt-8 sm:flex-row sm:items-start sm:justify-between">
              <button type="button" onClick={handleReplace} className={`self-start text-sm ${LINK}`}>
                Importer un autre fichier
              </button>
              <ClearDataButton count={data.contacts.length} onClear={handleClear} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
