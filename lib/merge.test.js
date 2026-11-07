import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { combineSources, nameKey, withImport } from './merge.js'
import { parseLinkedInCsv } from './linkedin.js'
import { parseVCard } from './vcard.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'
import { makeSyntheticContacts } from './fixtures/synthetic.js'

// Fictional people and invented numbers only (PO §8 on #9).
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const LINKEDIN = parseLinkedInCsv(fixture('Connections.sample.csv')).contacts
const IPHONE = parseVCard(fixture('phone-iphone.sample.vcf')).contacts
const ANDROID = parseVCard(fixture('phone-android.sample.vcf')).contacts

const T1 = new Date('2026-11-10T09:00:00.000Z')
const T2 = new Date('2026-11-11T09:00:00.000Z')
const T3 = new Date('2026-11-12T09:00:00.000Z')

let seq = 0
function li(firstName, lastName, extra = {}) {
  seq += 1
  return {
    id: `li-${String(seq).padStart(11, '0')}`, firstName, lastName, fullName: `${firstName} ${lastName}`.trim(),
    company: 'Atlas Conseil', position: 'Directrice financière', connectedOn: '2024-03-12',
    profileUrl: `https://www.linkedin.com/in/netgraph-exemple-${seq}`, email: null, phone: null, sources: ['linkedin'],
    ...extra,
  }
}
function ph(firstName, lastName, extra = {}) {
  seq += 1
  return {
    id: `ph-${String(seq).padStart(11, '0')}`, firstName, lastName, fullName: `${firstName} ${lastName}`.trim(),
    company: null, position: null, connectedOn: null, profileUrl: null, email: null,
    phone: `+2126000${String(seq).padStart(5, '0')}`, sources: ['phone'], ...extra,
  }
}
const record = (linkedin, phone) => {
  let r = null
  if (linkedin) r = withImport(r, 'linkedin', linkedin, T1)
  if (phone) r = withImport(r, 'phone', phone, T2)
  return r
}
const deepFreeze = (value) => {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

describe('nameKey', () => {
  it('ignores order, accents, case, hyphens and punctuation', () => {
    const key = nameKey({ firstName: 'Sara', lastName: 'Démo' })
    expect(key).toBe('demo sara')
    expect(nameKey({ firstName: 'Démo', lastName: 'Sara' })).toBe(key)
    expect(nameKey({ firstName: 'SARA', lastName: 'demo' })).toBe(key)
    expect(nameKey({ firstName: '  Sara ', lastName: 'Démo.' })).toBe(key)
    expect(nameKey({ firstName: 'Leïla', lastName: 'Pilote' })).toBe(nameKey({ firstName: 'Leila', lastName: 'Pilote' }))
    expect(nameKey({ firstName: 'Nour', lastName: 'Ben-Ali' })).toBe(nameKey({ firstName: 'Nour', lastName: 'Ben Ali' }))
    expect(nameKey({ firstName: 'Sofia', lastName: 'Prête-Nom' })).toBe('nom prete sofia')
  })

  it('is null with fewer than two words or bad input', () => {
    expect(nameKey({ firstName: 'Maman', lastName: '' })).toBeNull()
    expect(nameKey({ firstName: '', lastName: 'Karim' })).toBeNull()
    expect(nameKey({ firstName: '😀', lastName: '' })).toBeNull()
    expect(nameKey({})).toBeNull()
    expect(nameKey(null)).toBeNull()
    expect(nameKey({ firstName: 42, lastName: ['x'] })).toBeNull()
  })

  it('keeps extra words, so « Dr Karim Essai » is not « Karim Essai »', () => {
    expect(nameKey({ firstName: 'Dr Karim', lastName: 'Essai' })).not.toBe(nameKey({ firstName: 'Karim', lastName: 'Essai' }))
  })
})

describe('withImport', () => {
  it('a first LinkedIn or phone import creates a v2 record with that source only', () => {
    const contacts = [li('Sara', 'Démo')]
    expect(withImport(null, 'linkedin', contacts, T1)).toEqual({
      schemaVersion: 2,
      isSample: false,
      importedAt: T1.toISOString(),
      sources: { linkedin: { importedAt: T1.toISOString(), contacts } },
    })
    const phone = [ph('Sara', 'Démo')]
    expect(withImport(null, 'phone', phone, T1).sources).toEqual({ phone: { importedAt: T1.toISOString(), contacts: phone } })
  })

  it('re-importing phone replaces phone only; a LinkedIn re-import keeps phone', () => {
    const a = record([li('Sara', 'Démo')], [ph('Karim', 'Essai')])
    const newPhone = [ph('Leïla', 'Pilote')]
    const b = withImport(a, 'phone', newPhone, T3)
    expect(b.sources.linkedin).toBe(a.sources.linkedin)
    expect(b.sources.phone).toEqual({ importedAt: T3.toISOString(), contacts: newPhone })
    expect(b.importedAt).toBe(T3.toISOString())

    const newLinkedin = [li('Nadia', 'Fictif')]
    const c = withImport(b, 'linkedin', newLinkedin, T3)
    expect(c.sources.phone).toBe(b.sources.phone)
    expect(c.sources.linkedin.contacts).toEqual(newLinkedin)
  })

  it('the sample replaces everything, and a real import drops the sample', () => {
    const real = record([li('Sara', 'Démo')], [ph('Karim', 'Essai')])
    const sample = withImport(real, 'sample', SAMPLE_CONTACTS, T3)
    expect(sample).toEqual({
      schemaVersion: 2, isSample: true, importedAt: T3.toISOString(),
      sources: { sample: { importedAt: T3.toISOString(), contacts: SAMPLE_CONTACTS } },
    })
    const after = withImport(sample, 'phone', IPHONE, T3)
    expect(after.isSample).toBe(false)
    expect(Object.keys(after.sources)).toEqual(['phone'])
  })

  it('ignores a v1 or malformed previous record', () => {
    const v1 = { schemaVersion: 1, isSample: false, importedAt: T1.toISOString(), contacts: [li('A', 'B')] }
    expect(Object.keys(withImport(v1, 'phone', [], T2).sources)).toEqual(['phone'])
    expect(Object.keys(withImport('x', 'linkedin', [], T2).sources)).toEqual(['linkedin'])
  })

  it('does not mutate its inputs and copies the contacts array', () => {
    const before = deepFreeze(record([li('Sara', 'Démo')], [ph('Karim', 'Essai')]))
    const contacts = deepFreeze([ph('Leïla', 'Pilote')])
    const next = withImport(before, 'phone', contacts, T3)
    expect(next.sources.phone.contacts).not.toBe(contacts)
    expect(next.sources.phone.contacts).toEqual(contacts)
  })

  it('defaults importedAt to now', () => {
    const t0 = Date.now()
    expect(Date.parse(withImport(null, 'phone', []).importedAt)).toBeGreaterThanOrEqual(t0 - 1000)
  })

  it('throws on an unknown source or non-array contacts (programming errors)', () => {
    expect(() => withImport(null, 'instagram', [])).toThrow(TypeError)
    expect(() => withImport(null, 'phone', null)).toThrow(TypeError)
  })
})

describe('combineSources', () => {
  it('merges a unique match: LinkedIn id, fields and profile kept, phone number added', () => {
    const sara = li('Sara', 'Démo', { email: 'sara.demo@netgraph.test' })
    const phoneSara = ph('Démo', 'Sara', { email: 'autre@netgraph.test', company: 'Autre', position: 'Autre poste' })
    const { contacts, merged } = combineSources(record([sara], [phoneSara]))
    expect(merged).toBe(1)
    expect(contacts).toEqual([{ ...sara, phone: phoneSara.phone, sources: ['linkedin', 'phone'] }])
  })

  it('email, company and position fall back to the phone contact when LinkedIn has none', () => {
    const sara = li('Sara', 'Démo', { company: null, position: '', email: null })
    const phoneSara = ph('sara', 'demo', { email: 'demo.sara@netgraph.test', company: 'Atlas Conseil', position: 'DAF' })
    const [c] = combineSources(record([sara], [phoneSara])).contacts
    expect(c).toMatchObject({ id: sara.id, email: 'demo.sara@netgraph.test', company: 'Atlas Conseil', position: 'DAF' })
  })

  it('merges across accents and hyphens (« Leïla » / « Leila », « Ben-Ali » / « Ben Ali »)', () => {
    const r = record([li('Leïla', 'Pilote'), li('Nour', 'Ben-Ali')], [ph('Leila', 'Pilote'), ph('Nour', 'Ben Ali')])
    expect(combineSources(r).merged).toBe(2)
    expect(combineSources(r).contacts).toHaveLength(2)
  })

  it('never merges when a name appears twice on either side', () => {
    const twoLinkedin = record([li('Sara', 'Démo'), li('Sara', 'Démo', { company: 'Fictiva' })], [ph('Sara', 'Démo')])
    expect(combineSources(twoLinkedin)).toMatchObject({ merged: 0 })
    expect(combineSources(twoLinkedin).contacts).toHaveLength(3)
    const twoPhone = record([li('Karim', 'Essai')], [ph('Karim', 'Essai'), ph('Essai', 'Karim')])
    expect(combineSources(twoPhone).merged).toBe(0)
    expect(combineSources(twoPhone).contacts).toHaveLength(3)
  })

  it('never merges one-word names or names with extra words', () => {
    const r = record([li('Karim', 'Essai'), li('Sara', 'Démo')], [ph('Karim', ''), ph('Dr Sara', 'Démo')])
    expect(combineSources(r).merged).toBe(0)
  })

  it('orders LinkedIn contacts (merged in place), then unmerged phone contacts, in file order', () => {
    const a = li('Sara', 'Démo')
    const b = li('Karim', 'Essai')
    const c = li('Nadia', 'Fictif')
    const p1 = ph('Omar', 'Inventé')
    const p2 = ph('Essai', 'Karim')
    const p3 = ph('Zineb', 'Sosie')
    const { contacts } = combineSources(record([a, b, c], [p1, p2, p3]))
    expect(contacts.map((x) => x.id)).toEqual([a.id, b.id, c.id, p1.id, p3.id])
    expect(contacts[1].phone).toBe(p2.phone)
    // Unmerged contacts are the same objects.
    expect(contacts[0]).toBe(a)
    expect(contacts[3]).toBe(p1)
  })

  it('works on the fixtures: Connections.sample.csv + the iPhone file merges « Demo Sara » and « Youssef Exemple »', () => {
    const { contacts, merged } = combineSources(record(LINKEDIN, IPHONE))
    expect(merged).toBe(3) // Demo Sara, Youssef Exemple, Karim Essai (one on each side)
    const sara = contacts.find((c) => c.profileUrl?.endsWith('netgraph-exemple-s01'))
    expect(sara).toMatchObject({ firstName: 'Sara', lastName: 'Démo', position: 'Directrice financière', phone: '+212600000004' })
    expect(contacts.find((c) => c.fullName === 'Nadia Fictif Bureau')).toBeTruthy() // extra word: not merged
    expect(contacts).toHaveLength(LINKEDIN.length + IPHONE.length - merged)
    expect(new Set(contacts.map((c) => c.id)).size).toBe(contacts.length)
  })

  it('two « Karim Essai » in the phone file are not merged with LinkedIn', () => {
    const { contacts } = combineSources(record(LINKEDIN, ANDROID))
    const karims = contacts.filter((c) => nameKey(c) === 'essai karim')
    expect(karims).toHaveLength(3)
    expect(karims.find((c) => c.sources.includes('linkedin')).phone).toBeNull()
    // Leïla Pilote is unique on both sides: merged.
    expect(contacts.find((c) => c.profileUrl?.endsWith('netgraph-exemple-s07')).phone).toBe('+212600000001')
  })

  it('returns the sample alone, a single source as is, and nothing for null or malformed records', () => {
    expect(combineSources(withImport(null, 'sample', SAMPLE_CONTACTS, T1))).toEqual({ contacts: SAMPLE_CONTACTS, merged: 0 })
    expect(combineSources(record(LINKEDIN, null))).toEqual({ contacts: LINKEDIN, merged: 0 })
    expect(combineSources(record(null, IPHONE))).toEqual({ contacts: IPHONE, merged: 0 })
    for (const bad of [null, undefined, 'x', {}, { sources: 'x' }, { sources: { linkedin: { contacts: 'x' } } }]) {
      expect(combineSources(bad)).toEqual({ contacts: [], merged: 0 })
    }
  })

  it('does not mutate the record or its contacts', () => {
    const r = deepFreeze(record([li('Sara', 'Démo')], [ph('Sara', 'Démo')]))
    const snapshot = JSON.stringify(r)
    expect(() => combineSources(r)).not.toThrow()
    expect(JSON.stringify(r)).toBe(snapshot)
  })

  it('merges 30,000 LinkedIn + 5,000 phone contacts in under 200 ms', () => {
    const linkedin = makeSyntheticContacts(30000, 1).map((c) => ({ ...c, sources: ['linkedin'] }))
    const phone = makeSyntheticContacts(5000, 7).map((c, i) => ({
      ...c, id: `ph-${i}`, profileUrl: null, connectedOn: null, phone: '+212600000000', sources: ['phone'],
    }))
    const r = record(linkedin, phone)
    combineSources(r) // warm-up (JIT)
    const t0 = performance.now()
    const { contacts } = combineSources(r)
    expect(performance.now() - t0).toBeLessThan(200)
    expect(contacts.length).toBeGreaterThanOrEqual(30000)
  })
})
