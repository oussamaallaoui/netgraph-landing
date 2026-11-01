'use client'
// Draft state shared by every « Préparer un message » on the /essayer results (#8).
// RequestStep owns the map (key `${kind}:${contact.id}` → only the edited fields), the
// saved tone and the request of the last search; the editors read and write it here, so
// a draft survives « Fermer », another person's draft and a new search, and is lost on
// reload (never stored: ADR 0001). Only the tone goes to localStorage (netgraph:tone).

import { createContext, useContext } from 'react'

/**
 * @typedef {object} DraftsApi
 * @property {string} request                      request of the last search, as typed
 * @property {import('./draftState').Tone} preferredTone
 * @property {(tone: import('./draftState').Tone) => void} setPreferredTone   also saved in localStorage
 * @property {(key: string) => import('./draftState').DraftEdit | undefined} getEdit
 * @property {(key: string, edit: import('./draftState').DraftEdit) => void} setEdit
 * @property {(text: string) => void} announce     the page's single status region
 */

/** @type {import('react').Context<DraftsApi | null>} */
export const DraftsContext = createContext(null)

export function useDrafts() {
  return useContext(DraftsContext)
}
