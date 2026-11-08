import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MAX_CARDS, isVCardText, parseVCard } from './vcard.js'

// Fictional people and invented numbers only (PO §8 on #9).
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const ANDROID = fixture('phone-android.sample.vcf')
const IPHONE = fixture('phone-iphone.sample.vcf')
const V4 = fixture('phone-v4.sample.vcf')
const LINKEDIN = fixture('Connections.sample.csv')

const CONTACT_KEYS = [
  'company', 'connectedOn', 'email', 'firstName', 'fullName', 'id',
  'lastName', 'phone', 'position', 'profileUrl', 'sources',
].sort()

const card = (...lines) => ['BEGIN:VCARD', 'VERSION:3.0', ...lines, 'END:VCARD'].join('\r\n')
const one = (...lines) => parseVCard(card(...lines)).contacts[0]
const byName = (result, first, last) => result.contacts.find((c) => c.firstName === first && c.lastName === last)
const countCards = (text) => (text.match(/^BEGIN:VCARD$/gim) ?? []).length

describe('isVCardText', () => {
  it('is true when the first non-blank line is BEGIN:VCARD', () => {
    expect(isVCardText(ANDROID)).toBe(true)
    expect(isVCardText(IPHONE)).toBe(true)
    expect(isVCardText(V4)).toBe(true)
    expect(isVCardText('\uFEFFBEGIN:VCARD\r\nEND:VCARD')).toBe(true)
    expect(isVCardText('\n\r\n  \nbegin:vcard\nend:vcard')).toBe(true)
    expect(isVCardText('BEGIN:VCARD')).toBe(true)
    expect(isVCardText('  BEGIN:VCARD  \n')).toBe(true)
  })

  it('is false for anything else', () => {
    expect(isVCardText(LINKEDIN)).toBe(false)
    expect(isVCardText('')).toBe(false)
    expect(isVCardText('VERSION:3.0\nBEGIN:VCARD')).toBe(false)
    expect(isVCardText('BEGIN:VCARDX')).toBe(false)
    expect(isVCardText('BEGIN:VEVENT')).toBe(false)
    expect(isVCardText(null)).toBe(false)
    expect(isVCardText(42)).toBe(false)
  })
})

describe('parseVCard: fixtures', () => {
  it('reads the Android export (vCard 2.1, quoted-printable UTF-8, soft breaks, TEL;CELL / TEL;HOME)', () => {
    const r = parseVCard(ANDROID)
    expect(r.errors).toEqual([])
    expect(r.contacts).toHaveLength(4)
    expect(r.skipped).toBe(2) // a card without a name, and a repeat of Leïla's number
    expect(r.contacts.length + r.skipped).toBe(countCards(ANDROID))
    expect(r.unrecognizedPhones).toBe(1) // Omar: TEL:12345 only
    expect(byName(r, 'Leïla', 'Pilote')).toMatchObject({
      fullName: 'Leïla Pilote',
      company: 'Démoventures', // QP soft break inside ORG
      position: 'Analyste investissement',
      email: 'leila.pilote@netgraph.test',
      phone: '+212600000001', // TEL;CELL preferred over the first TEL;HOME
      sources: ['phone'],
      profileUrl: null,
      connectedOn: null,
    })
    expect(byName(r, 'Omar', 'Inventé')).toMatchObject({ phone: null, company: null, email: null })
    // Two « Karim Essai » with different numbers are two contacts; the second is written « 00212 6 … » (PO AC 3).
    expect(r.contacts.filter((c) => c.fullName === 'Karim Essai').map((c) => c.phone)).toEqual([
      '+212700000002',
      '+212600000003',
    ])
  })

  it('reads the iPhone export (vCard 3.0, item1.TEL, folded lines, base64 PHOTO, ORG with ;)', () => {
    const r = parseVCard(IPHONE)
    expect(r.errors).toEqual([])
    expect(r.contacts).toHaveLength(4)
    expect(r.skipped).toBe(0)
    expect(r.unrecognizedPhones).toBe(0)
    expect(byName(r, 'Demo', 'Sara')).toMatchObject({
      company: 'Atlas Conseil',
      position: 'Directrice financière',
      email: 'demo.sara@netgraph.test',
      phone: '+212600000004', // item2.TEL;type=CELL over item1.TEL;type=HOME
    })
    // Folded N, no CELL type: the Moroccan mobile wins over the first (French) number; invalid email skipped.
    expect(byName(r, 'Youssef', 'Exemple')).toMatchObject({ phone: '+212600000006', email: 'youssef.exemple@netgraph.test' })
    // Empty N → FN split on the first space; escaped comma in ORG, first component only.
    expect(byName(r, 'Nadia', 'Fictif Bureau')).toMatchObject({ company: 'Fictiva, Banque', phone: '+33600000010' })
    expect(byName(r, 'Karim', 'Essai').phone).toBe('+212600000011')
  })

  it('reads vCard 4.0 (TEL;VALUE=uri:tel:…, quoted TYPE, lowercase, missing END:VCARD)', () => {
    const r = parseVCard(V4)
    expect(r.errors).toEqual([])
    expect(r.contacts.map((c) => [c.fullName, c.phone])).toEqual([
      ['Tarik Mannequin', '+212600000007'],
      ['Zineb Sosie', '+212500000008'],
      ['Sofia Prête-Nom', '+212600000012'],
    ])
    expect(r.contacts.length + r.skipped).toBe(countCards(V4))
    expect(byName(r, 'Tarik', 'Mannequin')).toMatchObject({ company: 'Démoventures', position: "Chargé d'affaires" })
  })

  it('keeps only the allowed fields: no NOTE, ADR, BDAY, URL, PHOTO or extra number anywhere', () => {
    for (const text of [ANDROID, IPHONE, V4]) {
      const r = parseVCard(text)
      for (const c of r.contacts) expect(Object.keys(c).sort()).toEqual(CONTACT_KEYS)
      const out = JSON.stringify(r)
      for (const leaked of ['privée', 'Note', 'Fictive', 'Inventée', 'Casablanca', 'Rabat', 'Maroc', '1990', '1985',
        'netgraph.test/leila', '/9j/', 'AAAA', 'salon', '+212500000001', '+212500000004', '+33600000005', 'Mobile', 'ABLabel']) {
        expect(out).not.toContain(leaked)
      }
    }
  })

  it('gives stable ph- ids, unique within the file and distinct from li- and sample ids', () => {
    const a = parseVCard(ANDROID)
    expect(parseVCard(ANDROID).contacts.map((c) => c.id)).toEqual(a.contacts.map((c) => c.id))
    const ids = [ANDROID, IPHONE, V4].flatMap((t) => parseVCard(t).contacts.map((c) => c.id))
    for (const id of ids) expect(id).toMatch(/^ph-[0-9a-z]{11}(-\d+)?$/)
    expect(new Set(parseVCard(IPHONE).contacts.map((c) => c.id)).size).toBe(4)
  })
})

describe('parseVCard: errors', () => {
  it('EMPTY_FILE for empty, blank or non-string input', () => {
    for (const text of ['', '   \r\n\n', '\uFEFF', null, undefined, 42]) {
      expect(parseVCard(text)).toEqual({ contacts: [], errors: [{ code: 'EMPTY_FILE' }], skipped: 0, unrecognizedPhones: 0 })
    }
  })

  it('NOT_VCARD for a LinkedIn export or any text without a BEGIN:VCARD line', () => {
    expect(parseVCard(LINKEDIN)).toEqual({ contacts: [], errors: [{ code: 'NOT_VCARD' }], skipped: 0, unrecognizedPhones: 0 })
    expect(parseVCard('FN:Sara Démo\nTEL:0600000001').errors).toEqual([{ code: 'NOT_VCARD' }])
    expect(parseVCard('x BEGIN:VCARD').errors).toEqual([{ code: 'NOT_VCARD' }])
  })

  it('NO_CONTACTS when no card has a name, with skipped counted', () => {
    const r = parseVCard(card('TEL:0600000001') + '\r\n' + card('ORG:Fictiva Banque'))
    expect(r).toEqual({ contacts: [], errors: [{ code: 'NO_CONTACTS' }], skipped: 2, unrecognizedPhones: 0 })
    expect(parseVCard('BEGIN:VCARD\nEND:VCARD').errors).toEqual([{ code: 'NO_CONTACTS' }])
  })

  it('TOO_MANY_ROWS above 30,000 cards, not at 30,000', () => {
    const cards = (n) => Array.from({ length: n }, (_, i) => `BEGIN:VCARD\nN:Test;P${i}\nEND:VCARD`).join('\n')
    expect(MAX_CARDS).toBe(30000)
    const atCap = parseVCard(cards(MAX_CARDS))
    expect(atCap.errors).toEqual([])
    expect(atCap.contacts).toHaveLength(MAX_CARDS)
    expect(parseVCard(cards(MAX_CARDS + 1))).toEqual({
      contacts: [], errors: [{ code: 'TOO_MANY_ROWS' }], skipped: 0, unrecognizedPhones: 0,
    })
  })
})

describe('parseVCard: names', () => {
  it('N gives Given (+ Middle) and Family; prefix and suffix are dropped', () => {
    expect(one('N:Démo;Sara;Amina;Dr;PhD', 'FN:Dr Sara Démo')).toMatchObject({
      firstName: 'Sara Amina', lastName: 'Démo', fullName: 'Sara Amina Démo',
    })
  })

  it('FN is used only when N gives nothing, split on the first space', () => {
    expect(one('FN:Sara Démo Fictive')).toMatchObject({ firstName: 'Sara', lastName: 'Démo Fictive' })
    expect(one('N:;;;;', 'FN:Maman')).toMatchObject({ firstName: 'Maman', lastName: '', fullName: 'Maman' })
    expect(one('N:Démo;;;;', 'FN:Autre Nom')).toMatchObject({ firstName: '', lastName: 'Démo', fullName: 'Démo' })
  })

  it('collapses whitespace and unescapes \\, \\; \\\\ \\n', () => {
    expect(one('N:Ben\\, Ali  ;  Sara\\nAmina;;;')).toMatchObject({ firstName: 'Sara Amina', lastName: 'Ben, Ali' })
    expect(one('N:Démo;Sara', 'ORG:A\\;B\\\\C;Dept')).toMatchObject({ company: 'A;B\\C' })
  })

  it('decodes ISO-8859-1 and windows-1252 quoted-printable', () => {
    const r = parseVCard([
      'BEGIN:VCARD', 'VERSION:2.1', 'N;CHARSET=ISO-8859-1;ENCODING=QUOTED-PRINTABLE:D=E9mo;L=E9a;;;', 'END:VCARD',
      'BEGIN:VCARD', 'VERSION:2.1', 'N;CHARSET=windows-1252;QUOTED-PRINTABLE:C=9Cur;Zo=E9;;;', 'END:VCARD',
      'BEGIN:VCARD', 'VERSION:2.1', 'N;CHARSET=X-UNKNOWN;ENCODING=QUOTED-PRINTABLE:D=C3=A9mo;Sara;;;', 'END:VCARD',
    ].join('\r\n'))
    expect(r.contacts.map((c) => c.fullName)).toEqual(['Léa Démo', 'Zoé Cœur', 'Sara Démo'])
  })

  it('accepts LF-only, CR-only and BOM-prefixed files', () => {
    for (const sep of ['\n', '\r']) {
      const r = parseVCard(['BEGIN:VCARD', 'N:Démo;Sara;;;', 'TEL;CELL:0600000001', 'END:VCARD'].join(sep))
      expect(r.contacts[0]).toMatchObject({ fullName: 'Sara Démo', phone: '+212600000001' })
    }
    expect(parseVCard('\uFEFF' + card('N:Démo;Sara')).contacts).toHaveLength(1)
  })
})

describe('parseVCard: phone and email', () => {
  it('prefers a CELL / MOBILE / IPHONE number, then a Moroccan mobile, then the first', () => {
    expect(one('N:A;B', 'TEL;TYPE=HOME:0500000001', 'TEL;TYPE=iPhone:+33600000001').phone).toBe('+33600000001')
    expect(one('N:A;B', 'TEL;TYPE=HOME:0500000001', 'TEL;TYPE=mobile:0700000001').phone).toBe('+212700000001')
    expect(one('N:A;B', 'TEL;TYPE=WORK:+33600000001', 'TEL;TYPE=HOME:0500000001', 'TEL:0700000002').phone).toBe('+212700000002')
    expect(one('N:A;B', 'TEL;TYPE=WORK:+33600000001', 'TEL;TYPE=HOME:0500000001').phone).toBe('+33600000001')
    // A CELL number that can't be read doesn't block a readable one.
    expect(one('N:A;B', 'TEL;TYPE=CELL:12345', 'TEL;TYPE=HOME:0500000001').phone).toBe('+212500000001')
  })

  it('counts a contact with only unreadable numbers in unrecognizedPhones, not one without TEL', () => {
    const r = parseVCard(card('N:A;B', 'TEL:12345', 'TEL:abc') + '\n' + card('N:C;D') + '\n' + card('N:E;F', 'TEL:'))
    expect(r.contacts.map((c) => c.phone)).toEqual([null, null, null])
    expect(r.unrecognizedPhones).toBe(1)
  })

  it('keeps the first valid email only', () => {
    expect(one('N:A;B', 'EMAIL:pas-un-email', 'EMAIL;TYPE=work:b.a@netgraph.test', 'EMAIL:autre@netgraph.test').email)
      .toBe('b.a@netgraph.test')
  })
})

describe('parseVCard: structure', () => {
  it('a card without END:VCARD ends at the next BEGIN:VCARD or at the end of the file', () => {
    const r = parseVCard('BEGIN:VCARD\nN:Un;Sara\nBEGIN:VCARD\nN:Deux;Karim\nEND:VCARD\nBEGIN:VCARD\nN:Trois;Leïla')
    expect(r.contacts.map((c) => c.lastName)).toEqual(['Un', 'Deux', 'Trois'])
  })

  it('ignores lines outside cards, unknown properties, and lines without a colon', () => {
    const r = parseVCard('N:Hors;Carte\nBEGIN:VCARD\nX-CUSTOM:1\nnonsense line\nN:Démo;Sara\nEND:VCARD\nTEL:0600000001')
    expect(r.contacts).toHaveLength(1)
    expect(r.contacts[0]).toMatchObject({ fullName: 'Sara Démo', phone: null })
  })

  it('a large folded PHOTO does not leak into the next property', () => {
    const photo = ['PHOTO;ENCODING=b;TYPE=JPEG:' + 'A'.repeat(70), ...Array.from({ length: 2000 }, () => ' ' + 'B'.repeat(74))]
    const c = one('N:Démo;Sara', ...photo, 'TEL;TYPE=CELL:0600000001')
    expect(c.phone).toBe('+212600000001')
    expect(JSON.stringify(c)).not.toContain('BBBB')
  })

  it('a vCard 2.1 base64 PHOTO ending with = padding does not swallow the next line', () => {
    const r = parseVCard('BEGIN:VCARD\r\nVERSION:2.1\r\nN:Démo;Sara\r\nPHOTO;ENCODING=BASE64;JPEG:AAAA\r\n BBB=\r\n\r\nTEL;CELL:0600000001\r\nEND:VCARD')
    expect(r.contacts[0].phone).toBe('+212600000001')
  })

  it('skips repeats (same number, or same name and company without a number): first kept', () => {
    const r = parseVCard([
      card('N:Démo;Sara', 'TEL;CELL:06 00 00 00 01', 'ORG:Atlas'),
      card('N:Autre;Nom', 'TEL:+212600000001'),
      card('N:Essai;Karim', 'ORG:Fictiva'),
      card('N:ESSAI;karim', 'ORG:fictiva'),
      card('N:Essai;Karim', 'ORG:Autre'),
    ].join('\n'))
    expect(r.contacts.map((c) => c.fullName)).toEqual(['Sara Démo', 'Karim Essai', 'Karim Essai'])
    expect(r.skipped).toBe(2)
  })

  it('never throws on odd input', () => {
    for (const text of ['BEGIN:VCARD\n:\n;;;:\nN;"unterminated:Démo;Sara\nEND:VCARD', 'BEGIN:VCARD\nN;ENCODING=QUOTED-PRINTABLE:=ZZ=\n', '\u0000BEGIN:VCARD']) {
      expect(() => parseVCard(text)).not.toThrow()
    }
  })
})

// #31: a fold or a quoted-printable soft break can split the bytes of one character.
describe('parseVCard: characters split across lines (#31)', () => {
  const enc = new TextEncoder()
  /** Concatenate strings (UTF-8 encoded) and raw byte arrays into one file. */
  const file = (...parts) => {
    const chunks = parts.map((p) => (typeof p === 'string' ? enc.encode(p) : Uint8Array.from(p)))
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
    let at = 0
    for (const c of chunks) {
      out.set(c, at)
      at += c.length
    }
    return out
  }
  const names = (bytes) => parseVCard(bytes).contacts.map((c) => c.fullName)

  it('rebuilds a UTF-8 « é » split by a fold (CRLF + space), from bytes, Uint8Array or ArrayBuffer', () => {
    const bytes = file('BEGIN:VCARD\r\nVERSION:3.0\r\nN:D', [0xc3], '\r\n ', [0xa9], 'mo;Fold;;;\r\nEND:VCARD\r\n')
    expect(names(bytes)).toEqual(['Fold Démo'])
    expect(names(bytes.buffer)).toEqual(['Fold Démo'])
    // The same split in a tab fold, in ORG and TITLE.
    const more = file('BEGIN:VCARD\r\nN:Démo;Sara\r\nORG:Fictiva Soci', [0xc3], '\r\n\t', [0xa9], 't', [0xc3, 0xa9],
      '\r\nTITLE:Directrice financi', [0xc3], '\r\n ', [0xa8], 're\r\nEND:VCARD')
    expect(parseVCard(more).contacts[0]).toMatchObject({ company: 'Fictiva Société', position: 'Directrice financière' })
  })

  it('shows the bug when the file was already decoded as text (why the UI must pass bytes)', () => {
    const bytes = file('BEGIN:VCARD\r\nN:D', [0xc3], '\r\n ', [0xa9], 'mo;Fold;;;\r\nEND:VCARD')
    expect(names(new TextDecoder().decode(bytes))).toEqual(['Fold D\uFFFD\uFFFDmo'])
  })

  it('rebuilds a quoted-printable « é » split by a soft break (=C3= / =A9)', () => {
    const text = 'BEGIN:VCARD\r\nVERSION:2.1\r\nN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:D=C3=\r\n=A9mo;Le=C3=\r\n=AFla;;;\r\nEND:VCARD'
    expect(names(file(text))).toEqual(['Leïla Démo'])
    expect(names(text)).toEqual(['Leïla Démo'])
  })

  it('handles a windows-1252 name: QP split by a soft break, and raw 8-bit bytes split by a fold', () => {
    const qp = 'BEGIN:VCARD\r\nVERSION:2.1\r\nN;CHARSET=windows-1252;ENCODING=QUOTED-PRINTABLE:C=\r\n=9Cur;Zo=\r\n=E9;;;\r\nEND:VCARD'
    expect(names(file(qp))).toEqual(['Zoé Cœur'])
    const raw = file('BEGIN:VCARD\r\nVERSION:2.1\r\nN;CHARSET=windows-1252:D', [0xe9], 'mo;L', [0xe9],
      '\r\n a;;;\r\nFN;CHARSET=ISO-8859-1:L', [0xe9], 'a D', [0xe9], 'mo\r\nEND:VCARD')
    expect(names(raw)).toEqual(['Léa Démo'])
  })

  it('rebuilds a 4-byte emoji split across a fold', () => {
    // 👋 = F0 9F 91 8B, split after 1, 2 and 3 bytes.
    const wave = [0xf0, 0x9f, 0x91, 0x8b]
    for (const cut of [1, 2, 3]) {
      const bytes = file('BEGIN:VCARD\r\nN:Essai;Karim ', wave.slice(0, cut), '\r\n ', wave.slice(cut), ';;;\r\nEND:VCARD')
      expect(names(bytes)).toEqual(['Karim 👋 Essai'])
    }
  })

  it('a fold between whole characters, a UTF-8 BOM and malformed UTF-8 still behave', () => {
    expect(names(file([0xef, 0xbb, 0xbf], 'BEGIN:VCARD\r\nN:Dé\r\n mo;Sara\r\nEND:VCARD'))).toEqual(['Sara Démo'])
    // A lone continuation byte is not a character: U+FFFD, as any UTF-8 decoder does.
    expect(names(file('BEGIN:VCARD\r\nN:D', [0xa9], 'mo;Sara\r\nEND:VCARD'))).toEqual(['Sara D\uFFFDmo'])
  })

  it('isVCardText and the error codes work on bytes too', () => {
    expect(isVCardText(file([0xef, 0xbb, 0xbf], '\r\nBEGIN:VCARD\r\nEND:VCARD'))).toBe(true)
    expect(isVCardText(enc.encode(LINKEDIN).buffer)).toBe(false)
    expect(isVCardText(new Uint8Array(0))).toBe(false)
    expect(parseVCard(new Uint8Array(0)).errors).toEqual([{ code: 'EMPTY_FILE' }])
    expect(parseVCard(enc.encode(LINKEDIN)).errors).toEqual([{ code: 'NOT_VCARD' }])
    expect(parseVCard(enc.encode(ANDROID))).toEqual(parseVCard(ANDROID))
    expect(parseVCard(enc.encode(IPHONE).buffer)).toEqual(parseVCard(IPHONE))
  })
})
