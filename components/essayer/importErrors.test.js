import { describe, it, expect } from 'vitest'
import { IMPORT_ERROR_MESSAGES, importErrorMessage } from './importErrors.js'
import { importedLabel, skippedLabel, formatNumber } from './format.js'

describe('importErrorMessage', () => {
  it('has a French message for every contract and UI-only code', () => {
    for (const code of ['EMPTY_FILE', 'NOT_LINKEDIN_EXPORT', 'NO_CONTACTS', 'TOO_MANY_ROWS', 'FILE_TOO_LARGE', 'READ_FAILED']) {
      expect(IMPORT_ERROR_MESSAGES[code]).toBeTypeOf('string')
      expect(importErrorMessage(code)).toBe(IMPORT_ERROR_MESSAGES[code])
    }
  })

  it('uses formal vous, never tu', () => {
    for (const msg of Object.values(IMPORT_ERROR_MESSAGES)) {
      expect(msg).not.toMatch(/\b(tu|ton|ta|tes)\b/i)
    }
  })

  it('falls back to a generic French message for an unknown code', () => {
    expect(importErrorMessage('SOMETHING_NEW')).toMatch(/Réessayez/)
    expect(importErrorMessage('toString')).toMatch(/Réessayez/)
  })
})

describe('labels', () => {
  it('uses the singular for 0 and 1', () => {
    expect(importedLabel(1)).toBe('1 relation importée')
    expect(skippedLabel(0)).toBe('0 ligne ignorée')
  })

  it('uses the plural and French grouping above 1', () => {
    expect(importedLabel(30)).toBe('30 relations importées')
    expect(importedLabel(1234)).toBe(`${formatNumber(1234)} relations importées`)
    expect(formatNumber(1234)).toMatch(/^1\s234$/u)
    expect(skippedLabel(3)).toBe('3 lignes ignorées')
  })
})
