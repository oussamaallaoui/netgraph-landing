import { describe, it, expect } from 'vitest'
import {
  contactsImportedLabel,
  importStatusLines,
  lastImportOf,
  recordHasPhone,
  linkedInImportLine,
  phoneImportLine,
  previewCaption,
  previewHeading,
  previewNote,
  skippedContactsLabel,
  unrecognizedPhonesLabel,
} from './importCopy.js'
import { formatNumber } from './format.js'

const NBSP = ' '

describe('previewHeading (PO §6)', () => {
  it('says « contacts » as soon as phone contacts are stored', () => {
    expect(previewHeading(1, true)).toBe('1 contact importé')
    expect(previewHeading(31, true)).toBe('31 contacts importés')
    expect(contactsImportedLabel(1234)).toBe(`${formatNumber(1234)} contacts importés`)
  })

  it('keeps « relations » for LinkedIn only and the sample', () => {
    expect(previewHeading(30, false)).toBe('30 relations importées')
    expect(previewHeading(1, false)).toBe('1 relation importée')
  })

  it('uses the masculine line under the h1 when phone contacts are present', () => {
    expect(previewNote({ isSample: false, hasPhone: true })).toBe('Ils sont enregistrés sur cet appareil uniquement.')
    expect(previewNote({ isSample: false, hasPhone: false })).toBe('Elles sont enregistrées sur cet appareil uniquement.')
    expect(previewNote({ isSample: true, hasPhone: false })).toMatch(/^Exemple de démonstration/)
  })
})

describe('previewCaption', () => {
  it('follows the h1 noun', () => {
    expect(previewCaption(30, 10, false)).toBe('Aperçu : les 10 premières relations sur 30')
    expect(previewCaption(31, 10, true)).toBe('Aperçu : les 10 premiers contacts sur 31')
    expect(previewCaption(4, 10, true)).toBe('Aperçu de vos contacts')
    expect(previewCaption(4, 10, false)).toBe('Aperçu de vos relations')
  })
})

describe('phone import line', () => {
  it('with LinkedIn relations: the merge count, singular and plural', () => {
    expect(phoneImportLine(4, 3, true)).toBe('4 contacts du téléphone importés, dont 3 rapprochés de vos relations LinkedIn.')
    expect(phoneImportLine(1, 1, true)).toBe('1 contact du téléphone importé, dont 1 rapproché de vos relations LinkedIn.')
    expect(phoneImportLine(4, 1, true)).toBe('4 contacts du téléphone importés, dont 1 rapproché de vos relations LinkedIn.')
  })

  it('with LinkedIn relations and no merge', () => {
    expect(phoneImportLine(4, 0, true)).toBe("4 contacts du téléphone importés. Aucun n'a été rapproché de vos relations LinkedIn.")
  })

  it('without LinkedIn relations', () => {
    expect(phoneImportLine(4, 0, false)).toBe('4 contacts du téléphone importés.')
    expect(phoneImportLine(1, 0, false)).toBe('1 contact du téléphone importé.')
  })
})

describe('LinkedIn import line with phone contacts present', () => {
  it('singular and plural', () => {
    expect(linkedInImportLine(30, 3)).toBe('30 relations LinkedIn importées, dont 3 rapprochées des contacts de votre téléphone.')
    expect(linkedInImportLine(1, 1)).toBe('1 relation LinkedIn importée, dont 1 rapprochée des contacts de votre téléphone.')
    expect(linkedInImportLine(30, 0)).toMatch(/^30 relations LinkedIn importées\. Aucune/)
  })
})

describe('skipped and unrecognised numbers', () => {
  it('uses the PO copy with a no-break space before the colon', () => {
    expect(skippedContactsLabel(1)).toBe('1 contact ignoré (sans nom ou en double)')
    expect(skippedContactsLabel(2)).toBe('2 contacts ignorés (sans nom ou en double)')
    expect(unrecognizedPhonesLabel(1)).toBe(`1 numéro non reconnu${NBSP}: ce contact est importé sans numéro.`)
    expect(unrecognizedPhonesLabel(3)).toBe(`3 numéros non reconnus${NBSP}: ces contacts sont importés sans numéro.`)
  })
})

describe('lastImportOf / recordHasPhone', () => {
  const src = { importedAt: '2026-11-08T00:00:00.000Z', contacts: [] }
  const both = { schemaVersion: 2, isSample: false, importedAt: src.importedAt, sources: { linkedin: src, phone: src } }
  const liOnly = { ...both, sources: { linkedin: src } }
  const sample = { ...both, isSample: true, sources: { sample: src } }

  it('knows whether the other real source is stored', () => {
    expect(lastImportOf(both, { source: 'phone', imported: 4, merged: 3 })).toEqual({
      source: 'phone', imported: 4, skipped: 0, unrecognizedPhones: 0, merged: 3, hasOtherSource: true,
    })
    expect(lastImportOf(liOnly, { source: 'linkedin', imported: 30, merged: 0 }).hasOtherSource).toBe(false)
    expect(lastImportOf(sample, { source: 'sample', imported: 30, merged: 0 }).hasOtherSource).toBe(false)
  })

  it('has phone only with a phone source', () => {
    expect(recordHasPhone(both)).toBe(true)
    expect(recordHasPhone(liOnly)).toBe(false)
    expect(recordHasPhone(sample)).toBe(false)
    expect(recordHasPhone(null)).toBe(false)
  })
})

describe('importStatusLines', () => {
  const phone = { source: 'phone', imported: 4, skipped: 2, unrecognizedPhones: 1, merged: 3, hasOtherSource: true }

  it('after a phone import: count line, then skipped, then numbers', () => {
    expect(importStatusLines(phone)).toEqual([
      '4 contacts du téléphone importés, dont 3 rapprochés de vos relations LinkedIn.',
      '2 contacts ignorés (sans nom ou en double)',
      `1 numéro non reconnu${NBSP}: ce contact est importé sans numéro.`,
    ])
  })

  it('hides the skipped and numbers lines at 0', () => {
    expect(importStatusLines({ ...phone, skipped: 0, unrecognizedPhones: 0, hasOtherSource: false })).toEqual([
      '4 contacts du téléphone importés.',
    ])
  })

  it('after a LinkedIn import: the merge line only when phone contacts are present', () => {
    const li = { source: 'linkedin', imported: 30, skipped: 0, unrecognizedPhones: 0, merged: 3, hasOtherSource: true }
    expect(importStatusLines(li)).toEqual(['30 relations LinkedIn importées, dont 3 rapprochées des contacts de votre téléphone.'])
    expect(importStatusLines({ ...li, hasOtherSource: false, merged: 0 })).toEqual([])
    expect(importStatusLines({ ...li, hasOtherSource: false, skipped: 2 })).toEqual(['2 lignes ignorées (sans nom ou en double)'])
  })

  it('nothing for the sample or without an import in this visit', () => {
    expect(importStatusLines(null)).toEqual([])
    expect(importStatusLines({ source: 'sample', imported: 30, skipped: 0, unrecognizedPhones: 0, merged: 0, hasOtherSource: false })).toEqual([])
  })

  it('never says « Envoyer » and uses formal vous', () => {
    for (const line of importStatusLines(phone)) {
      expect(line).not.toMatch(/envoyer/i)
      expect(line).not.toMatch(/\b(tu|ton|ta|tes)\b/i)
    }
  })
})
