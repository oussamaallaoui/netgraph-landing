'use client'
// « Effacer mes données de cet appareil », with an inline confirmation step
// (no window.confirm). The parent calls clearAllData() and resets its state;
// onClear resolves to { cleared }. When cleared is false the parent passes an
// `error` message and this button stays usable for another try.
// Rendered only when something is loaded (imported or sample).

import { useEffect, useRef, useState } from 'react'
import { BUTTON_DANGER, BUTTON_DANGER_OUTLINE, BUTTON_SECONDARY } from './ui'

/**
 * @param {object} props
 * @param {() => Promise<{ cleared: boolean }>} props.onClear
 * @param {string | null} [props.error]
 */
export default function ClearDataButton({ onClear, error }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const cancelRef = useRef(null)
  const triggerRef = useRef(null)
  const returnFocus = useRef(false)

  useEffect(() => {
    if (confirming) cancelRef.current?.focus() // least destructive choice first
    else if (returnFocus.current) {
      returnFocus.current = false
      triggerRef.current?.focus()
    }
  }, [confirming])

  function cancel() {
    returnFocus.current = true
    setConfirming(false)
  }

  async function confirm() {
    setBusy(true)
    const result = await onClear()
    if (!result?.cleared) {
      // Nothing was claimed as deleted: let the person retry after closing other tabs.
      setBusy(false)
    }
  }

  return (
    <div className="max-w-sm">
      {!confirming ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setConfirming(true)}
          className={`${BUTTON_DANGER_OUTLINE} w-full sm:w-auto`}
        >
          Effacer mes données de cet appareil
        </button>
      ) : (
        <div
          role="group"
          aria-labelledby="clear-confirm-text"
          className="rounded-2xl border border-red-200 bg-white p-4"
          onKeyDown={e => { if (e.key === 'Escape' && !busy) cancel() }}
        >
          <p id="clear-confirm-text" className="mb-4 text-sm leading-relaxed text-ink">
            Effacer vos relations de cet appareil ? Cette action est définitive.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={confirm} disabled={busy} className={BUTTON_DANGER}>
              {busy ? 'Effacement…' : 'Effacer définitivement'}
            </button>
            <button ref={cancelRef} type="button" onClick={cancel} disabled={busy} className={BUTTON_SECONDARY}>
              Annuler
            </button>
          </div>
        </div>
      )}
      <div aria-live="polite">
        {error && <p className="mt-3 text-sm font-medium leading-relaxed text-red-700">{error}</p>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate">
        Effacer les données de ce site dans les réglages de votre navigateur supprime aussi tout.
      </p>
    </div>
  )
}
