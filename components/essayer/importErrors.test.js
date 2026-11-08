import { describe, it, expect } from 'vitest'
import {
  IMPORT_ERROR_MESSAGES,
  KEPT_SUFFIX,
  MAX_FILE_MB,
  PHONE_ERROR_MESSAGES,
  UNSUPPORTED_FILE_MESSAGE,
  importErrorMessage,
} from './importErrors.js'
import { importedLabel, skippedLabel, formatNumber } from './format.js'

const NBSP = ' '
const CODES = ['EMPTY_FILE', 'NOT_LINKEDIN_EXPORT', 'NO_CONTACTS', 'TOO_MANY_ROWS', 'FILE_TOO_LARGE', 'READ_FAILED']
const PHONE_CODES = ['EMPTY_FILE', 'NOT_VCARD', 'NO_CONTACTS', 'TOO_MANY_ROWS', 'FILE_TOO_LARGE', 'READ_FAILED']

describe('importErrorMessage: LinkedIn', () => {
  it('has a French message for every contract and UI-only code', () => {
    for (const code of CODES) {
      expect(IMPORT_ERROR_MESSAGES[code]).toBeTypeOf('string')
      expect(importErrorMessage(code)).toBe(IMPORT_ERROR_MESSAGES[code])
      expect(importErrorMessage(code, { source: 'linkedin' })).toBe(IMPORT_ERROR_MESSAGES[code])
    }
  })

  it('keeps the #5 PO copy, with the new 50 MB cap', () => {
    expect(MAX_FILE_MB).toBe(50)
    expect(importErrorMessage('NO_CONTACTS')).toBe('Ce fichier LinkedIn ne contient aucune relation.')
    expect(importErrorMessage('TOO_MANY_ROWS')).toBe("Ce fichier contient plus de 30 000 relations : NetGraph ne peut pas l'importer.")
    expect(importErrorMessage('FILE_TOO_LARGE')).toBe(
      "Ce fichier dépasse 50 Mo : ce n'est probablement pas le fichier Connections.csv de LinkedIn.",
    )
    expect(importErrorMessage('READ_FAILED')).toBe('Impossible de lire ce fichier. Réessayez ou choisissez un autre fichier.')
  })
})

describe('importErrorMessage: phone (PO §6 on #9)', () => {
  it('has a message for every phone code', () => {
    for (const code of PHONE_CODES) {
      expect(importErrorMessage(code, { source: 'phone' })).toBe(PHONE_ERROR_MESSAGES[code])
    }
  })

  it('uses the PO copy word for word', () => {
    const m = (code) => importErrorMessage(code, { source: 'phone' })
    expect(m('EMPTY_FILE')).toBe('Ce fichier est vide. Exportez à nouveau vos contacts depuis votre téléphone.')
    expect(m('NOT_VCARD')).toBe(
      'Ce fichier ne ressemble pas à un export de contacts (.vcf). Exportez à nouveau vos contacts depuis votre téléphone, puis déposez le fichier .vcf obtenu.',
    )
    expect(m('NO_CONTACTS')).toBe('Ce fichier ne contient aucun contact avec un nom.')
    expect(m('TOO_MANY_ROWS')).toBe(`Ce fichier contient plus de 30${NBSP}000 contacts${NBSP}: NetGraph ne peut pas l'importer.`)
    expect(m('FILE_TOO_LARGE')).toBe(
      `Ce fichier dépasse 50${NBSP}Mo. Si votre téléphone le propose, exportez vos contacts sans les photos, puis réessayez.`,
    )
  })

  it('NOT_VCARD and UNSUPPORTED_FILE do not depend on the source', () => {
    expect(importErrorMessage('NOT_VCARD')).toBe(PHONE_ERROR_MESSAGES.NOT_VCARD)
    for (const source of ['linkedin', 'phone', null]) {
      expect(importErrorMessage('UNSUPPORTED_FILE', { source })).toBe(UNSUPPORTED_FILE_MESSAGE)
    }
    expect(UNSUPPORTED_FILE_MESSAGE).toBe(
      `NetGraph lit deux types de fichiers${NBSP}: Connections.csv (LinkedIn) et .vcf (contacts du téléphone). Choisissez l'un des deux.`,
    )
  })
})

describe('kept suffix and fallback', () => {
  it('says previous contacts are kept only when a previous import exists, for both sources', () => {
    expect(KEPT_SUFFIX).toBe('Vos contacts déjà importés sont conservés.')
    for (const code of CODES) {
      expect(importErrorMessage(code)).not.toContain(KEPT_SUFFIX)
      expect(importErrorMessage(code, { hasPrevious: true })).toBe(`${IMPORT_ERROR_MESSAGES[code]} ${KEPT_SUFFIX}`)
    }
    expect(importErrorMessage('NOT_VCARD', { source: 'phone', hasPrevious: true })).toBe(
      `${PHONE_ERROR_MESSAGES.NOT_VCARD} ${KEPT_SUFFIX}`,
    )
  })

  it('uses formal vous, never tu', () => {
    for (const msg of [...Object.values(IMPORT_ERROR_MESSAGES), ...Object.values(PHONE_ERROR_MESSAGES), UNSUPPORTED_FILE_MESSAGE]) {
      expect(msg).not.toMatch(/\b(tu|ton|ta|tes)\b/i)
    }
  })

  it('falls back to a French message for an unknown code', () => {
    expect(importErrorMessage('SOMETHING_NEW')).toMatch(/Réessayez/)
    expect(importErrorMessage('toString', { source: 'phone' })).toMatch(/Réessayez/)
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
