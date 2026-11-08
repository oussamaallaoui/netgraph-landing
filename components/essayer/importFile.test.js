import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { detectSource, extensionOf, importFile, sourceFromName } from './importFile.js'
import { MAX_FILE_BYTES } from './importErrors.js'

const fixture = (name) => readFileSync(fileURLToPath(new URL(`../../lib/fixtures/${name}`, import.meta.url)), 'utf8')
const CSV = fixture('Connections.sample.csv')
const ANDROID = fixture('phone-android.sample.vcf')
const IPHONE = fixture('phone-iphone.sample.vcf')
const V4 = fixture('phone-v4.sample.vcf')

// File-like objects with arrayBuffer() only (#31: importFile never calls file.text()).
const bytesFile = (name, bytes, size = bytes.byteLength) => ({
  name,
  size,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
})
const fakeFile = (name, text, size) => {
  const bytes = new TextEncoder().encode(text)
  return bytesFile(name, bytes, size ?? bytes.byteLength)
}
const concat = (...parts) => {
  const arrays = parts.map((p) => (typeof p === 'string' ? new TextEncoder().encode(p) : Uint8Array.from(p)))
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0))
  let i = 0
  for (const a of arrays) {
    out.set(a, i)
    i += a.length
  }
  return out
}

describe('extensionOf / sourceFromName', () => {
  it('reads the last extension, lowercased', () => {
    expect(extensionOf('Contacts.VCF')).toBe('vcf')
    expect(extensionOf('archive.tar.csv')).toBe('csv')
    expect(extensionOf('noext')).toBe('')
    expect(extensionOf(undefined)).toBe('')
  })

  it('guesses phone for .vcf and .vcard, LinkedIn otherwise', () => {
    expect(sourceFromName('a.vcf')).toBe('phone')
    expect(sourceFromName('a.vcard')).toBe('phone')
    expect(sourceFromName('Connections.csv')).toBe('linkedin')
    expect(sourceFromName('photo.pdf')).toBe('linkedin')
  })
})

describe('detectSource (content → extension)', () => {
  it('trusts vCard content over the name', () => {
    expect(detectSource('Connections.csv', IPHONE)).toBe('phone')
    expect(detectSource('contacts.txt', '﻿\n begin:vcard\nFN:A B\nEND:VCARD')).toBe('phone')
  })

  it('falls back on the extension', () => {
    expect(detectSource('contacts.vcf', 'hello')).toBe('phone')
    expect(detectSource('Connections.csv', CSV)).toBe('linkedin')
    expect(detectSource('export.txt', CSV)).toBeNull()
    expect(detectSource('doc.pdf', '%PDF-1.4')).toBeNull()
  })
})

describe('importFile', () => {
  it('rejects a file over 50 MB without reading it, with the source guessed from the name', async () => {
    const arrayBuffer = vi.fn()
    expect(MAX_FILE_BYTES).toBe(50 * 1024 * 1024)
    expect(await importFile({ name: 'Contacts.vcf', size: MAX_FILE_BYTES + 1, arrayBuffer })).toEqual({
      ok: false,
      code: 'FILE_TOO_LARGE',
      source: 'phone',
    })
    expect(await importFile({ name: 'Connections.csv', size: MAX_FILE_BYTES + 1, arrayBuffer })).toEqual({
      ok: false,
      code: 'FILE_TOO_LARGE',
      source: 'linkedin',
    })
    expect(arrayBuffer).not.toHaveBeenCalled()
  })

  it('accepts a file of exactly 50 MB', async () => {
    const out = await importFile(fakeFile('Contacts.vcf', ANDROID, MAX_FILE_BYTES))
    expect(out.ok).toBe(true)
  })

  it('returns READ_FAILED when the file cannot be read or is missing', async () => {
    const out = await importFile({ name: 'a.vcf', size: 10, arrayBuffer: () => Promise.reject(new Error('nope')) })
    expect(out).toEqual({ ok: false, code: 'READ_FAILED', source: 'phone' })
    expect(await importFile(null)).toEqual({ ok: false, code: 'READ_FAILED', source: null })
  })

  it('imports the LinkedIn sample as LinkedIn', async () => {
    const out = await importFile(fakeFile('Connections.csv', CSV))
    expect(out.ok).toBe(true)
    expect(out.source).toBe('linkedin')
    expect(out.contacts).toHaveLength(30)
    expect(out.unrecognizedPhones).toBe(0)
    expect(out.contacts[0]).toMatchObject({ firstName: 'Sara', lastName: 'Démo', company: 'Atlas Conseil' })
  })

  it('imports a LinkedIn export saved as .txt through the LinkedIn parser', async () => {
    const out = await importFile(fakeFile('Connections.txt', CSV))
    expect(out).toMatchObject({ ok: true, source: 'linkedin' })
    expect(out.contacts).toHaveLength(30)
  })

  it.each([
    ['phone-android.sample.vcf', ANDROID],
    ['phone-iphone.sample.vcf', IPHONE],
    ['phone-v4.sample.vcf', V4],
  ])('imports %s as phone contacts', async (name, text) => {
    const out = await importFile(fakeFile(name, text))
    expect(out.ok).toBe(true)
    expect(out.source).toBe('phone')
    expect(out.contacts.length).toBeGreaterThan(0)
    expect(out.contacts.every((c) => c.sources.includes('phone'))).toBe(true)
  })

  it('passes skipped and unrecognised numbers through for the Android fixture', async () => {
    const out = await importFile(fakeFile('a.vcf', ANDROID))
    expect(out).toMatchObject({ ok: true, skipped: 2, unrecognizedPhones: 1 })
    expect(out.contacts).toHaveLength(4)
  })

  it('reads vCard content even under a .csv name', async () => {
    const out = await importFile(fakeFile('Connections.csv', IPHONE))
    expect(out).toMatchObject({ ok: true, source: 'phone' })
  })

  it('gives NOT_VCARD for a .vcf that is not one', async () => {
    expect(await importFile(fakeFile('contacts.vcf', CSV))).toEqual({ ok: false, code: 'NOT_VCARD', source: 'phone' })
  })

  it('gives the phone EMPTY_FILE for an empty .vcf, the LinkedIn one for an empty .csv', async () => {
    expect(await importFile(fakeFile('contacts.vcf', ''))).toEqual({ ok: false, code: 'EMPTY_FILE', source: 'phone' })
    expect(await importFile(fakeFile('Connections.csv', ''))).toEqual({ ok: false, code: 'EMPTY_FILE', source: 'linkedin' })
  })

  it('keeps the LinkedIn message for a .csv that is not a LinkedIn export', async () => {
    const out = await importFile(fakeFile('Connections.csv', 'nom;ville\nA;Casablanca\n'))
    expect(out).toEqual({ ok: false, code: 'NOT_LINKEDIN_EXPORT', source: 'linkedin' })
  })

  describe('#31: a fold that splits a UTF-8 character', () => {
    // « é » is C3 A9; the RFC 2425 fold (CRLF + space) falls between the two bytes.
    const folded = concat(
      'BEGIN:VCARD\r\nVERSION:3.0\r\nN:D',
      [0xc3],
      '\r\n ',
      [0xa9],
      'mo;Fold;;;\r\nFN:Fold Démo\r\nTITLE:Directrice financi',
      [0xc3],
      '\r\n ',
      [0xa8],
      're\r\nTEL;TYPE=CELL:+212 6 00 00 00 99\r\nEND:VCARD\r\n',
    )

    it('imports « Fold Démo » with no replacement character', async () => {
      const out = await importFile(bytesFile('contacts.vcf', folded))
      expect(out).toMatchObject({ ok: true, source: 'phone' })
      expect(out.contacts).toHaveLength(1)
      expect(out.contacts[0]).toMatchObject({
        firstName: 'Fold',
        lastName: 'Démo',
        fullName: 'Fold Démo',
        position: 'Directrice financière',
        phone: '+212600000099',
      })
      expect(JSON.stringify(out.contacts)).not.toContain('�')
    })

    it('detects it by content whatever the name', async () => {
      const out = await importFile(bytesFile('export.txt', folded))
      expect(out).toMatchObject({ ok: true, source: 'phone' })
      expect(out.contacts[0].lastName).toBe('Démo')
    })

    it('leaves the LinkedIn path unchanged (accents decoded as UTF-8)', async () => {
      const out = await importFile(bytesFile('Connections.csv', new TextEncoder().encode(CSV)))
      expect(out).toMatchObject({ ok: true, source: 'linkedin' })
      expect(out.contacts[0]).toMatchObject({ firstName: 'Sara', lastName: 'Démo' })
    })
  })

  it('gives UNSUPPORTED_FILE for a .pdf, a .txt that is neither format, and a file with no extension', async () => {
    for (const [name, text] of [
      ['cv.pdf', '%PDF-1.4\n...'],
      ['notes.txt', 'bonjour'],
      ['contacts', ''],
    ]) {
      expect(await importFile(fakeFile(name, text))).toEqual({ ok: false, code: 'UNSUPPORTED_FILE', source: null })
    }
  })
})
