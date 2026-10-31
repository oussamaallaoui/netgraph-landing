import { describe, it, expect } from 'vitest'
import { IMPORT_ERROR_MESSAGES, KEPT_SUFFIX, importErrorMessage } from './importErrors.js'
import { importedLabel, skippedLabel, formatNumber } from './format.js'

const CODES = ['EMPTY_FILE', 'NOT_LINKEDIN_EXPORT', 'NO_CONTACTS', 'TOO_MANY_ROWS', 'FILE_TOO_LARGE', 'READ_FAILED']

describe('importErrorMessage', () => {
  it('has a French message for every contract and UI-only code', () => {
    for (const code of CODES) {
      expect(IMPORT_ERROR_MESSAGES[code]).toBeTypeOf('string')
      expect(importErrorMessage(code)).toBe(IMPORT_ERROR_MESSAGES[code])
    }
  })

  it('uses the PO copy', () => {
    expect(importErrorMessage('NO_CONTACTS')).toBe('Ce fichier LinkedIn ne contient aucune relation.')
    expect(importErrorMessage('TOO_MANY_ROWS')).toBe("Ce fichier contient plus de 30 000 relations : NetGraph ne peut pas l'importer.")
    expect(importErrorMessage('READ_FAILED')).toBe('Impossible de lire ce fichier. Réessayez ou choisissez un autre fichier.')
  })

  it('says previous relations are kept only when a previous import exists', () => {
    for (const code of CODES) {
      expect(importErrorMessage(code)).not.toContain(KEPT_SUFFIX)
      expect(importErrorMessage(code, { hasPrevious: true })).toBe(`${IMPORT_ERROR_MESSAGES[code]} ${KEPT_SUFFIX}`)
    }
    expect(KEPT_SUFFIX).toBe('Vos relations déjà importées sont conservées.')
  })

  it('uses formal vous, never tu', () => {
    for (const msg of Object.values(IMPORT_ERROR_MESSAGES)) {
      expect(msg).not.toMatch(/\b(tu|ton|ta|tes)\b/i)
    }
  })

  it('falls back to a French message for an unknown code', () => {
    expect(importErrorMessage('SOMETHING_NEW')).toMatch(/Réessayez/)
    expect(importErrorMessage('toString')).toMatch(/Réessayez/)
  })
})

describe('labels', () => {
  it('uses the singular for 0 and 1', () => {
    expect(importedLabel(1)).toBe('1 relation importée')
    expect(skippedLabel(1)).toBe('1 ligne ignorée (sans nom ou en double)')
  })

  it('uses the plural and French grouping above 1', () => {
    expect(importedLabel(30)).toBe('30 relations importées')
    expect(importedLabel(1234)).toBe(`${formatNumber(1234)} relations importées`)
    expect(formatNumber(1234)).toMatch(/^1\s234$/u)
    expect(skippedLabel(3)).toBe('3 lignes ignorées (sans nom ou en double)')
  })
})
