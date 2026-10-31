import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  cleanEmail,
  cleanProfileUrl,
  MAX_DATA_ROWS,
  parseConnectedOn,
  parseLinkedInCsv,
  shortHash,
  uniqueId,
} from './linkedin.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'
import { makeSyntheticContacts, toLinkedInCsv } from './fixtures/synthetic.js'

const SAMPLE_CSV = readFileSync(new URL('./fixtures/Connections.sample.csv', import.meta.url), 'utf8')
const HEADER = 'First Name,Last Name,URL,Email Address,Company,Position,Connected On'

const CONTACT_KEYS = [
  'company', 'connectedOn', 'email', 'firstName', 'fullName', 'id',
  'lastName', 'phone', 'position', 'profileUrl', 'sources',
].sort()

function withoutIdAndSources({ id, sources, ...rest }) {
  return rest
}

describe('parseLinkedInCsv: the sample export', () => {
  const result = parseLinkedInCsv(SAMPLE_CSV)

  it('imports the 30 sample people with no errors', () => {
    expect(result.errors).toEqual([])
    expect(result.skipped).toBe(0)
    expect(result.contacts).toHaveLength(30)
  })

  it('gives the same fields as SAMPLE_CONTACTS (except id and sources)', () => {
    expect(result.contacts.map(withoutIdAndSources)).toEqual(SAMPLE_CONTACTS.map(withoutIdAndSources))
  })

  it('returns only Contact fields, from the linkedin source, with li- ids', () => {
    for (const c of result.contacts) {
      expect(Object.keys(c).sort()).toEqual(CONTACT_KEYS)
      expect(c.sources).toEqual(['linkedin'])
      expect(c.id).toMatch(/^li-[0-9a-z]{11}$/)
      expect(c.phone).toBeNull()
    }
    expect(new Set(result.contacts.map((c) => c.id)).size).toBe(30)
  })

  it('keeps a quoted position with a comma, accents and empty emails', () => {
    const nadia = result.contacts.find((c) => c.lastName === 'Fictif')
    expect(nadia.position).toBe('Consultante senior, stratégie')
    const youssef = result.contacts.find((c) => c.lastName === 'Exemple')
    expect(youssef.email).toBeNull()
    expect(result.contacts.find((c) => c.firstName === 'Leïla').lastName).toBe('Pilote')
  })

  it('maps an empty company and an empty URL to null', () => {
    const ilyas = result.contacts.find((c) => c.lastName === 'Cobaye')
    expect(ilyas.company).toBeNull()
    expect(ilyas.profileUrl).toBeNull()
  })

  it('gives stable ids across runs (same file → same ids)', () => {
    expect(parseLinkedInCsv(SAMPLE_CSV).contacts.map((c) => c.id)).toEqual(result.contacts.map((c) => c.id))
  })
})

describe('parseLinkedInCsv: format variations', () => {
  const row = 'Sara,Démo,https://www.linkedin.com/in/netgraph-exemple-s01,sara.demo@netgraph.test,Atlas Conseil,Directrice financière,12 Mar 2024'

  it('works without the notes preamble', () => {
    const r = parseLinkedInCsv(`${HEADER}\n${row}\n`)
    expect(r.errors).toEqual([])
    expect(r.contacts).toHaveLength(1)
    expect(r.contacts[0]).toMatchObject({
      firstName: 'Sara',
      lastName: 'Démo',
      fullName: 'Sara Démo',
      company: 'Atlas Conseil',
      position: 'Directrice financière',
      connectedOn: '2024-03-12',
      profileUrl: 'https://www.linkedin.com/in/netgraph-exemple-s01',
      email: 'sara.demo@netgraph.test',
      phone: null,
      sources: ['linkedin'],
    })
  })

  it('works with a BOM and CRLF line endings', () => {
    const r = parseLinkedInCsv(`\uFEFFNotes:\r\n"Some notes, with a comma"\r\n\r\n${HEADER}\r\n${row}\r\n`)
    expect(r.errors).toEqual([])
    expect(r.contacts).toHaveLength(1)
  })

  it('matches columns by name, not position, and ignores case and extra columns', () => {
    const text = [
      'connected on,POSITION,Extra Column,company,last name,first name,email address,url',
      '12 Mar 2024,CFO,secret,"Testiflow, SA",Factice,Rachid,rachid.factice@netgraph.test,https://linkedin.com/in/netgraph-exemple-s10',
    ].join('\n')
    const r = parseLinkedInCsv(text)
    expect(r.errors).toEqual([])
    const [c] = r.contacts
    expect(c).toMatchObject({
      firstName: 'Rachid',
      lastName: 'Factice',
      company: 'Testiflow, SA',
      position: 'CFO',
      connectedOn: '2024-03-12',
      profileUrl: 'https://linkedin.com/in/netgraph-exemple-s10',
      email: 'rachid.factice@netgraph.test',
    })
    expect(JSON.stringify(c)).not.toContain('secret')
  })

  it('accepts the provisional French header aliases', () => {
    const text = [
      'Prénom,Nom,URL,Adresse e-mail,Entreprise,Poste,Date de connexion',
      'Nadia,Fictif,,nadia.fictif@netgraph.test,Atlas Conseil,Consultante,20 janv. 2025',
    ].join('\n')
    const r = parseLinkedInCsv(text)
    expect(r.errors).toEqual([])
    expect(r.contacts[0]).toMatchObject({
      firstName: 'Nadia',
      lastName: 'Fictif',
      email: 'nadia.fictif@netgraph.test',
      company: 'Atlas Conseil',
      position: 'Consultante',
      connectedOn: '2025-01-20',
      profileUrl: null,
    })
  })

  it('works when the file has only the required columns', () => {
    const r = parseLinkedInCsv('First Name,Last Name,Company,Position\nAya,Gabarit,Logistica Démo,Supply chain manager')
    expect(r.errors).toEqual([])
    expect(r.contacts[0]).toMatchObject({ connectedOn: null, profileUrl: null, email: null })
  })

  it('finds the header on row 20 but not on row 21', () => {
    const notes = (n) => Array.from({ length: n }, (_, i) => `Note ${i + 1}`).join('\n')
    expect(parseLinkedInCsv(`${notes(19)}\n${HEADER}\n${row}`).errors).toEqual([])
    expect(parseLinkedInCsv(`${notes(20)}\n${HEADER}\n${row}`).errors).toEqual([{ code: 'NOT_LINKEDIN_EXPORT' }])
  })

  it('trims and collapses whitespace; empty company/position become null', () => {
    const r = parseLinkedInCsv(`${HEADER}\n  Sara  ,  Démo ,,,  ,   ,`)
    expect(r.contacts[0]).toMatchObject({ firstName: 'Sara', lastName: 'Démo', company: null, position: null })
  })

  it('keeps a row with only a first name or only a last name', () => {
    const r = parseLinkedInCsv(`${HEADER}\nSara,,,,Atlas Conseil,CFO,\n,Démo,,,Atlas Conseil,CEO,`)
    expect(r.contacts.map((c) => c.fullName)).toEqual(['Sara', 'Démo'])
  })
})

describe('parseLinkedInCsv: cleaning and de-duplication', () => {
  it('skips rows with neither first nor last name and counts them; ignores blank lines', () => {
    const text = [
      HEADER,
      'Sara,Démo,,,Atlas Conseil,CFO,',
      ',,https://www.linkedin.com/in/netgraph-exemple-x,,Atlas Conseil,CFO,',
      '',
      ',,,,,,',
      'Karim,Essai,,,Fictiva Banque,Directeur des risques,',
    ].join('\n')
    const r = parseLinkedInCsv(text)
    expect(r.contacts.map((c) => c.fullName)).toEqual(['Sara Démo', 'Karim Essai'])
    expect(r.skipped).toBe(1)
  })

  it('drops invalid profile URLs and emails', () => {
    const text = [
      HEADER,
      'A,One,http://www.linkedin.com/in/x,not-an-email,Co,Pos,',
      'B,Two,https://evil.example/in/x,b@netgraph,Co,Pos,',
      'C,Three,javascript:alert(1),c two@netgraph.test,Co,Pos,',
      'D,Four,https://www.linkedin.com.evil.example/in/x,d@@netgraph.test,Co,Pos,',
      'E,Five,https://www.linkedin.com/in/netgraph-exemple-e, e.five@netgraph.test ,Co,Pos,',
    ].join('\n')
    const r = parseLinkedInCsv(text)
    expect(r.contacts.map((c) => [c.profileUrl, c.email])).toEqual([
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      ['https://www.linkedin.com/in/netgraph-exemple-e', 'e.five@netgraph.test'],
    ])
  })

  it('de-duplicates on the id basis (same profile URL, or same name and company without URL) and counts repeats', () => {
    const text = [
      HEADER,
      'Sara,Démo,https://www.linkedin.com/in/netgraph-exemple-s01,,Atlas Conseil,CFO,',
      'Sara,Démo,https://www.linkedin.com/in/netgraph-exemple-s01/,,Atlas Conseil,CEO,',
      'Karim,Essai,,,Fictiva Banque,Directeur,',
      'karim,essai,,,FICTIVA BANQUE,Directeur,',
      'Karim,Essai,,,Autre Démo,Directeur,',
    ].join('\n')
    const r = parseLinkedInCsv(text)
    expect(r.contacts.map((c) => `${c.fullName}|${c.company}|${c.position}`)).toEqual([
      'Sara Démo|Atlas Conseil|CFO',
      'Karim Essai|Fictiva Banque|Directeur',
      'Karim Essai|Autre Démo|Directeur',
    ])
    expect(r.skipped).toBe(2)
  })

  it('keeps two different people whose URLs collided under the old 32-bit hash', () => {
    const text = [
      HEADER,
      'Sara,Démo,https://www.linkedin.com/in/netgraph-exemple-5188,,Atlas Conseil,CFO,',
      'Karim,Essai,https://www.linkedin.com/in/netgraph-exemple-1269264,,Fictiva Banque,Directeur,',
    ].join('\n')
    const r = parseLinkedInCsv(text)
    expect(r.errors).toEqual([])
    expect(r.contacts).toHaveLength(2)
    expect(r.skipped).toBe(0)
    expect(r.contacts[0].id).not.toBe(r.contacts[1].id)
  })

  it('gives 30,000 distinct URLs 30,000 distinct ids', () => {
    const lines = [HEADER]
    for (let i = 0; i < MAX_DATA_ROWS; i++) {
      lines.push(`Prénom${i},Nom,https://www.linkedin.com/in/netgraph-exemple-${i},,Démo SA,Poste,`)
    }
    const r = parseLinkedInCsv(lines.join('\n'))
    expect(r.contacts).toHaveLength(MAX_DATA_ROWS)
    expect(r.skipped).toBe(0)
    expect(new Set(r.contacts.map((c) => c.id)).size).toBe(MAX_DATA_ROWS)
    for (const c of r.contacts) expect(c.id).toMatch(/^li-[0-9a-z]{11}(-\d+)?$/)
  })

  it('uniqueId suffixes an id already taken by a different basis (-2, -3, …)', () => {
    // Real 53-bit collisions can't be found in a unit test, so the suffix rule is tested directly.
    const used = new Set()
    expect(uniqueId('li-abc', used)).toBe('li-abc')
    expect(uniqueId('li-abc', used)).toBe('li-abc-2')
    expect(uniqueId('li-abc', used)).toBe('li-abc-3')
    expect(uniqueId('li-def', used)).toBe('li-def')
    expect([...used]).toEqual(['li-abc', 'li-abc-2', 'li-abc-3', 'li-def'])
  })

  it('keeps the invariant contacts + skipped === non-blank data rows on a mixed file', () => {
    const text = [
      HEADER,
      'Sara,Démo,https://www.linkedin.com/in/netgraph-exemple-s01,,Atlas Conseil,CFO,',
      ',,https://www.linkedin.com/in/netgraph-exemple-x,,Atlas Conseil,CFO,',
      '',
      'SARA,DÉMO,https://WWW.linkedin.com/in/netgraph-exemple-s01,,Autre,CEO,',
      ',,,,,,',
      'Karim,Essai,,,Fictiva Banque,Directeur,',
      'Karim,Essai,,,fictiva banque,Directeur adjoint,',
      'Nadia,Fictif,,,,,',
      ',,,,Sans nom SA,Poste,',
    ].join('\n')
    const r = parseLinkedInCsv(text)
    const nonBlankDataRows = 7 // 2 nameless, 2 repeats, 3 people; the 2 blank rows don't count
    expect(r.contacts.map((c) => c.fullName)).toEqual(['Sara Démo', 'Karim Essai', 'Nadia Fictif'])
    expect(r.skipped).toBe(4)
    expect(r.contacts.length + r.skipped).toBe(nonBlankDataRows)
  })

  it('gives null for an unparseable date', () => {
    const r = parseLinkedInCsv(`${HEADER}\nSara,Démo,,,Co,Pos,someday\nKarim,Essai,,,Co,Pos,31 Feb 2024`)
    expect(r.contacts.map((c) => c.connectedOn)).toEqual([null, null])
  })
})

describe('parseLinkedInCsv: invalid files', () => {
  it('EMPTY_FILE for empty, whitespace-only, BOM-only or non-string input', () => {
    for (const input of ['', '   \n\r\n  ', '\uFEFF', undefined, null, 12, {}]) {
      expect(parseLinkedInCsv(input)).toEqual({ contacts: [], errors: [{ code: 'EMPTY_FILE' }], skipped: 0 })
    }
  })

  it('NOT_LINKEDIN_EXPORT for a random CSV', () => {
    const r = parseLinkedInCsv('id,product,price\n1,Lampe Démo,12.50\n2,Chaise Fictive,40')
    expect(r).toEqual({ contacts: [], errors: [{ code: 'NOT_LINKEDIN_EXPORT' }], skipped: 0 })
  })

  it('NOT_LINKEDIN_EXPORT for a vCard file', () => {
    const vcf = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Sara Démo\r\nN:Démo;Sara;;;\r\nEMAIL:sara.demo@netgraph.test\r\nEND:VCARD\r\n'
    expect(parseLinkedInCsv(vcf).errors).toEqual([{ code: 'NOT_LINKEDIN_EXPORT' }])
  })

  it('NOT_LINKEDIN_EXPORT for binary-looking text (an image renamed .csv)', () => {
    const junk = '\u0089PNG\r\n\u001a\n\u0000\u0000\u0000\rIHDR\u0000\u0000\u0001\u0000'
    expect(parseLinkedInCsv(junk).errors).toEqual([{ code: 'NOT_LINKEDIN_EXPORT' }])
  })

  it('NOT_LINKEDIN_EXPORT when a required column is missing', () => {
    expect(parseLinkedInCsv('First Name,Last Name,Company\nSara,Démo,Atlas').errors).toEqual([
      { code: 'NOT_LINKEDIN_EXPORT' },
    ])
  })

  it('NO_CONTACTS for a header with no rows', () => {
    expect(parseLinkedInCsv(`${HEADER}\n`)).toEqual({ contacts: [], errors: [{ code: 'NO_CONTACTS', line: 1 }], skipped: 0 })
    const withNotes = `Notes:\n"x"\n\n${HEADER}\n\n`
    expect(parseLinkedInCsv(withNotes).errors).toEqual([{ code: 'NO_CONTACTS', line: 4 }])
  })

  it('NO_CONTACTS when every row lacks a name, with skipped counted', () => {
    const r = parseLinkedInCsv(`${HEADER}\n,,,,Atlas,CFO,\n,,,,Fictiva,CEO,`)
    expect(r).toEqual({ contacts: [], errors: [{ code: 'NO_CONTACTS', line: 1 }], skipped: 2 })
  })
})

describe('parseLinkedInCsv: size limit', () => {
  it(`accepts exactly ${MAX_DATA_ROWS.toLocaleString('en')} rows`, () => {
    const csv = toLinkedInCsv(makeSyntheticContacts(MAX_DATA_ROWS, 5))
    const r = parseLinkedInCsv(csv)
    expect(r.errors).toEqual([])
    expect(r.contacts.length + r.skipped).toBe(MAX_DATA_ROWS)
    // Synthetic contacts have unique keys (#15, 4d39449): every row is a distinct person.
    expect(r.contacts).toHaveLength(MAX_DATA_ROWS)
    expect(r.skipped).toBe(0)
  })

  it('TOO_MANY_ROWS above 30,000 data rows, with nothing imported', () => {
    const csv = toLinkedInCsv(makeSyntheticContacts(MAX_DATA_ROWS + 1, 7))
    const r = parseLinkedInCsv(csv)
    expect(r).toEqual({ contacts: [], errors: [{ code: 'TOO_MANY_ROWS', line: 4 }], skipped: 0 })
  })
})

describe('helpers', () => {
  it('parseConnectedOn', () => {
    expect(parseConnectedOn('27 Oct 2026')).toBe('2026-10-27')
    expect(parseConnectedOn('1 Jan 2020')).toBe('2020-01-01')
    expect(parseConnectedOn('29 Feb 2024')).toBe('2024-02-29')
    expect(parseConnectedOn('29 Feb 2023')).toBeNull()
    expect(parseConnectedOn('12 September 2021')).toBe('2021-09-12')
    expect(parseConnectedOn('12 févr. 2021')).toBe('2021-02-12')
    expect(parseConnectedOn('3 août 2022')).toBe('2022-08-03')
    expect(parseConnectedOn('2024-03-12')).toBe('2024-03-12')
    expect(parseConnectedOn('12/03/2024')).toBe('2024-03-12')
    expect(parseConnectedOn('32 Jan 2020')).toBeNull()
    expect(parseConnectedOn('12 Foo 2020')).toBeNull()
    expect(parseConnectedOn('')).toBeNull()
    expect(parseConnectedOn(undefined)).toBeNull()
  })

  it('cleanProfileUrl', () => {
    expect(cleanProfileUrl('https://www.linkedin.com/in/a')).toBe('https://www.linkedin.com/in/a')
    expect(cleanProfileUrl(' https://linkedin.com/in/a ')).toBe('https://linkedin.com/in/a')
    expect(cleanProfileUrl('https://WWW.LINKEDIN.COM/in/a')).toBe('https://WWW.LINKEDIN.COM/in/a')
    expect(cleanProfileUrl('http://www.linkedin.com/in/a')).toBeNull()
    expect(cleanProfileUrl('https://fr.linkedin.com/in/a')).toBeNull()
    expect(cleanProfileUrl('https://www.linkedin.com@evil.example/')).toBeNull()
    expect(cleanProfileUrl('https://user@www.linkedin.com/in/a')).toBeNull()
    expect(cleanProfileUrl('https://www.linkedin.com:8443/in/a')).toBeNull()
    expect(cleanProfileUrl('https://www.linkedin.com/in/a b')).toBeNull()
    expect(cleanProfileUrl('')).toBeNull()
  })

  it('cleanEmail', () => {
    expect(cleanEmail('sara.demo@netgraph.test')).toBe('sara.demo@netgraph.test')
    expect(cleanEmail(' sara.demo@netgraph.test ')).toBe('sara.demo@netgraph.test')
    for (const bad of ['', 'sara', 'sara@', '@netgraph.test', 'sara@netgraph', 'a b@netgraph.test', 'a@@b.test', 'a@b.t', '<a@b.test>']) {
      expect(cleanEmail(bad)).toBeNull()
    }
  })

  it('shortHash is deterministic and 11 base-36 characters', () => {
    expect(shortHash('abc')).toBe(shortHash('abc'))
    expect(shortHash('abc')).not.toBe(shortHash('abd'))
    expect(shortHash('')).toMatch(/^[0-9a-z]{11}$/)
    expect(shortHash('url:https://www.linkedin.com/in/netgraph-exemple-5188')).not.toBe(
      shortHash('url:https://www.linkedin.com/in/netgraph-exemple-1269264'),
    )
  })
})
