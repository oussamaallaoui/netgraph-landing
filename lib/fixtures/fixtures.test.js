import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SAMPLE_CONTACTS } from './sample-contacts.js'
import { REFERENCE_REQUESTS } from './reference-requests.js'
import { LINKEDIN_HEADER, makeSyntheticContacts, toLinkedInCsv } from './synthetic.js'

const CONTACT_KEYS = [
  'company', 'connectedOn', 'email', 'firstName', 'fullName', 'id',
  'lastName', 'phone', 'position', 'profileUrl', 'sources',
].sort()

const PROFILE_URL = /^https:\/\/(www\.)?linkedin\.com\//
const FAKE_EMAIL = /^[a-z0-9.]+@netgraph\.test$/

function isValidIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function expectContactShape(c) {
  expect(Object.keys(c).sort()).toEqual(CONTACT_KEYS)
  expect(c.fullName).toBe(`${c.firstName} ${c.lastName}`.trim())
  expect(c.firstName && c.lastName).toBeTruthy()
  if (c.profileUrl !== null) expect(c.profileUrl).toMatch(PROFILE_URL)
  if (c.email !== null) expect(c.email).toMatch(/@netgraph\.test$/)
  if (c.connectedOn !== null) expect(isValidIsoDate(c.connectedOn)).toBe(true)
  expect(c.phone).toBeNull()
}

describe('SAMPLE_CONTACTS', () => {
  it('has the 30 people s01–s30, in order, with unique ids', () => {
    expect(SAMPLE_CONTACTS).toHaveLength(30)
    expect(SAMPLE_CONTACTS.map((c) => c.id)).toEqual(
      Array.from({ length: 30 }, (_, i) => `s${String(i + 1).padStart(2, '0')}`),
    )
    expect(new Set(SAMPLE_CONTACTS.map((c) => c.id)).size).toBe(30)
  })

  it('follows the Contact shape, marked as sample', () => {
    for (const c of SAMPLE_CONTACTS) {
      expectContactShape(c)
      expect(c.sources).toEqual(['sample'])
    }
  })

  it('uses only fake @netgraph.test emails (ASCII prenom.nom)', () => {
    const withEmail = SAMPLE_CONTACTS.filter((c) => c.email !== null)
    expect(withEmail.map((c) => c.id)).toEqual(['s01', 's03', 's05', 's08', 's10', 's12', 's16', 's17', 's20', 's26'])
    for (const c of withEmail) expect(c.email).toMatch(FAKE_EMAIL)
  })

  it('has the deliberate variants from the #5 dataset', () => {
    const byId = Object.fromEntries(SAMPLE_CONTACTS.map((c) => [c.id, c]))
    expect(byId.s02.company).toBe('ATLAS CONSEIL SA')
    expect(byId.s22.company).toBe('FICTIVA BANQUE')
    expect(byId.s30.company).toBe('Oasis Capital Démo SARL')
    expect(byId.s20.company).toBeNull()
    expect(byId.s20.profileUrl).toBeNull()
    expect(byId.s27.profileUrl).toBeNull()
    expect(byId.s01.profileUrl).toBe('https://www.linkedin.com/in/netgraph-exemple-s01')
  })

  it('is frozen so tests and UI cannot mutate the shared fixture', () => {
    expect(Object.isFrozen(SAMPLE_CONTACTS)).toBe(true)
    expect(Object.isFrozen(SAMPLE_CONTACTS[0])).toBe(true)
  })
})

describe('Connections.sample.csv', () => {
  const csv = readFileSync(new URL('./Connections.sample.csv', import.meta.url), 'utf8')
  const lines = csv.split('\n')

  it('starts with the LinkedIn notes preamble, then the header row', () => {
    expect(lines[0]).toBe('Notes:')
    const headerIndex = lines.indexOf(LINKEDIN_HEADER.join(','))
    expect(headerIndex).toBeGreaterThan(0)
    expect(headerIndex).toBeLessThan(20)
    // 30 data rows after the header, then the trailing newline.
    expect(lines.slice(headerIndex + 1).filter(Boolean)).toHaveLength(30)
  })

  it('holds exactly the sample people (generated from SAMPLE_CONTACTS)', () => {
    expect(csv).toBe(toLinkedInCsv(SAMPLE_CONTACTS))
  })

  it('has quoted fields with commas and some empty emails', () => {
    expect(csv).toContain('"Consultante senior, stratégie"')
    expect(csv).toContain('"Directrice associée, conseil en finance"')
    expect(csv).toContain(',,ATLAS CONSEIL SA,')
  })

  it('contains no email outside @netgraph.test', () => {
    const emails = csv.match(/[^\s,"]+@[^\s,"]+/g) ?? []
    expect(emails).toHaveLength(10)
    for (const e of emails) expect(e).toMatch(FAKE_EMAIL)
  })
})

describe('REFERENCE_REQUESTS', () => {
  const ids = new Set(SAMPLE_CONTACTS.map((c) => c.id))

  it('has R1–R12 with a request each', () => {
    expect(REFERENCE_REQUESTS.map((r) => r.id)).toEqual(Array.from({ length: 12 }, (_, i) => `R${i + 1}`))
    for (const r of REFERENCE_REQUESTS) expect(r.request.trim().length).toBeGreaterThan(0)
  })

  it('only expects people that exist in the sample', () => {
    for (const r of REFERENCE_REQUESTS) {
      for (const id of [...r.mustTop3, ...r.acceptable, ...(r.introducers?.ids ?? [])]) {
        expect(ids.has(id), `${r.id} expects unknown id ${id}`).toBe(true)
      }
    }
  })

  it('is internally consistent', () => {
    for (const r of REFERENCE_REQUESTS) {
      expect(r.mustTop3.length, `${r.id}: more than 3 mustTop3`).toBeLessThanOrEqual(3)
      expect(r.mustTop3.filter((id) => r.acceptable.includes(id)), r.id).toEqual([])
      if (r.none) expect(r.mustTop3.length + r.acceptable.length, r.id).toBe(0)
      if (r.introducers?.status === 'found') expect(r.introducers.ids.length, r.id).toBeGreaterThan(0)
    }
    expect(REFERENCE_REQUESTS.filter((r) => r.none).map((r) => r.id)).toEqual(['R11'])
  })

  it('expects introducers that all share the named company', () => {
    const byId = Object.fromEntries(SAMPLE_CONTACTS.map((c) => [c.id, c]))
    for (const r of REFERENCE_REQUESTS.filter((x) => x.introducers?.status === 'found')) {
      const companies = new Set(r.introducers.ids.map((id) => byId[id].company.toLowerCase().replace(/\s+sa$/, '')))
      expect(companies.size, r.id).toBe(1)
    }
  })
})

describe('makeSyntheticContacts', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    expect(makeSyntheticContacts(50, 7)).toEqual(makeSyntheticContacts(50, 7))
    expect(makeSyntheticContacts(50, 7)).not.toEqual(makeSyntheticContacts(50, 8))
  })

  it('makes n valid fake contacts with unique ids', () => {
    const contacts = makeSyntheticContacts(5000)
    expect(contacts).toHaveLength(5000)
    expect(new Set(contacts.map((c) => c.id)).size).toBe(5000)
    for (const c of contacts) expectContactShape(c)
  })
})
