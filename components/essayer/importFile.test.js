import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { importFile } from './importFile.js'
import { MAX_FILE_BYTES } from './importErrors.js'

const fakeFile = (text, size = text.length) => ({ size, text: async () => text })

describe('importFile', () => {
  it('rejects a file over 10 MB without reading it', async () => {
    const text = vi.fn()
    const parse = vi.fn()
    const out = await importFile({ size: MAX_FILE_BYTES + 1, text }, { parse })
    expect(out).toEqual({ ok: false, code: 'FILE_TOO_LARGE' })
    expect(text).not.toHaveBeenCalled()
    expect(parse).not.toHaveBeenCalled()
  })

  it('accepts a file of exactly 10 MB', async () => {
    const parse = () => ({ contacts: [{ id: 'x' }], errors: [], skipped: 0 })
    const out = await importFile({ size: MAX_FILE_BYTES, text: async () => 'x' }, { parse })
    expect(out.ok).toBe(true)
  })

  it('returns READ_FAILED when the file cannot be read', async () => {
    const out = await importFile({ size: 10, text: () => Promise.reject(new Error('nope')) })
    expect(out).toEqual({ ok: false, code: 'READ_FAILED' })
  })

  it('returns READ_FAILED when no file is given', async () => {
    expect(await importFile(null)).toEqual({ ok: false, code: 'READ_FAILED' })
  })

  it('returns the first parser error code and no contacts', async () => {
    const parse = () => ({ contacts: [], errors: [{ code: 'NO_CONTACTS' }, { code: 'EMPTY_FILE' }], skipped: 2 })
    const out = await importFile(fakeFile('a'), { parse })
    expect(out).toEqual({ ok: false, code: 'NO_CONTACTS' })
  })

  it('passes contacts and skipped through on success', async () => {
    const contacts = [{ id: 'a' }, { id: 'b' }]
    const parse = vi.fn(() => ({ contacts, errors: [], skipped: 3 }))
    const out = await importFile(fakeFile('csv text'), { parse })
    expect(parse).toHaveBeenCalledWith('csv text')
    expect(out).toEqual({ ok: true, contacts, skipped: 3 })
  })

  describe('with lib/linkedin.js (contract on #5)', () => {
    it('imports the 30 people of the sample LinkedIn export', async () => {
      const path = fileURLToPath(new URL('../../lib/fixtures/Connections.sample.csv', import.meta.url))
      const out = await importFile(fakeFile(readFileSync(path, 'utf8')))
      expect(out.ok).toBe(true)
      expect(out.contacts).toHaveLength(30)
      expect(out.contacts[0]).toMatchObject({ firstName: 'Sara', lastName: 'Démo', company: 'Atlas Conseil' })
    })

    it('rejects an empty file', async () => {
      expect(await importFile(fakeFile(''))).toEqual({ ok: false, code: 'EMPTY_FILE' })
    })

    it('rejects a CSV that is not a LinkedIn export', async () => {
      const out = await importFile(fakeFile('nom;ville\nA;Casablanca\n'))
      expect(out).toEqual({ ok: false, code: 'NOT_LINKEDIN_EXPORT' })
    })
  })
})
