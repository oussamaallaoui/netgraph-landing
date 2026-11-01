import { describe, expect, it } from 'vitest'
import { DRAFT_COPY, MAX_MAILTO_LENGTH, draftMessage, linkedInProfileUrl, mailtoUrl, requestClause } from './drafts.js'
import { SAMPLE_CONTACTS } from './fixtures/sample-contacts.js'
import { cleanProfileUrl } from './linkedin.js'
import { MAX_REQUEST_LENGTH } from './match.js'

const NBSP = ' '
const byId = (id) => SAMPLE_CONTACTS.find((c) => c.id === id)
const s01 = byId('s01') // position + company, LinkedIn + email
const s02 = byId('s02') // LinkedIn only, company 'ATLAS CONSEIL SA'
const s20 = byId('s20') // position only, email only
const s27 = byId('s27') // neither LinkedIn nor email
const R1 = 'Trouver ma prochaine mission de conseil en finance'

/** Write the PO text with plain spaces; « : » and « ? » get their no-break space here. */
const po = (text) => text.replace(/ ([:?])/g, `${NBSP}$1`)

const FORBIDDEN = ['{', '}', 'undefined', 'null', '  ', '[Votre', 'NaN']

function expectClean({ subject, body }) {
  for (const text of [subject, body]) {
    expect(typeof text).toBe('string')
    for (const bad of FORBIDDEN) expect(text).not.toContain(bad)
    expect(text).not.toMatch(/ [:?]/) // always a no-break space before « : » and « ? »
    expect(text).not.toMatch(/\n{3,}/)
  }
  expect(subject).not.toContain('\n')
}

describe('requestClause (PO §2)', () => {
  it.each([
    [R1, 'trouver ma prochaine mission de conseil en finance'],
    ['Trouver un poste.', 'trouver un poste'],
    ['Trouver un poste ?', 'trouver un poste'],
    ['Trouver un poste…', 'trouver un poste'],
    ['Trouver un poste...', 'trouver un poste'],
    ['Trouver un poste !?! ', 'trouver un poste'],
    ['Trouver un poste :', 'trouver un poste'],
    ['Trouver un poste ;', 'trouver un poste'],
    ['  Trouver\nun   poste\r\n\tà Rabat  ', 'trouver un poste à Rabat'],
    ['DAF Atlas pour un audit', 'DAF Atlas pour un audit'],
    ['CV à relire', 'CV à relire'],
    ["L'IA en finance", "L'IA en finance"],
    ['McKinsey ou un cabinet similaire', 'McKinsey ou un cabinet similaire'],
    ['Étudier un rachat', 'étudier un rachat'],
    ['À Casablanca, un poste en finance', 'à Casablanca, un poste en finance'],
    ['Rencontrer quelqu’un de Atlas Conseil', 'rencontrer quelqu’un de Atlas Conseil'],
    ['trouver : mission, finance.', 'trouver : mission, finance'],
  ])('%j → %j', (input, expected) => {
    expect(requestClause(input)).toBe(expected)
  })

  it('returns an empty string for empty, punctuation-only or non-string requests', () => {
    for (const input of ['', '   ', '?!.', undefined, null, 42, {}, ['a']]) {
      expect(requestClause(input)).toBe('')
    }
  })

  it('keeps only the first MAX_REQUEST_LENGTH characters, like match()', () => {
    const long = `Trouver ${'a'.repeat(392)}` // 400 characters
    expect(long.length).toBe(400)
    const clause = requestClause(long)
    expect(clause.length).toBe(MAX_REQUEST_LENGTH)
    expect(clause).toBe(`trouver ${'a'.repeat(MAX_REQUEST_LENGTH - 8)}`)
  })
})

describe('draftMessage: the four PO templates on s01, word for word', () => {
  it('help · vous (PO R1 example)', () => {
    const draft = draftMessage({ contact: s01, request: R1, kind: 'help', tone: 'vous' })
    expect(draft).toEqual({
      subject: 'Une question pour vous',
      body: po(
        'Bonjour Sara,\n\n' +
          "J'espère que vous allez bien. Mon objectif en ce moment : trouver ma prochaine mission de conseil en finance.\n\n" +
          'Comme vous êtes Directrice financière chez Atlas Conseil, votre avis me serait précieux. Auriez-vous quelques minutes pour en parler ?\n\n' +
          "Merci d'avance,",
      ),
    })
    expectClean(draft)
  })

  it('help · tu', () => {
    const draft = draftMessage({ contact: s01, request: R1, kind: 'help', tone: 'tu' })
    expect(draft).toEqual({
      subject: 'Une question pour toi',
      body: po(
        'Bonjour Sara,\n\n' +
          "J'espère que tu vas bien. Mon objectif en ce moment : trouver ma prochaine mission de conseil en finance.\n\n" +
          'Comme tu es Directrice financière chez Atlas Conseil, ton avis me serait précieux. Aurais-tu quelques minutes pour en parler ?\n\n' +
          'Merci et à bientôt,',
      ),
    })
    expectClean(draft)
  })

  it('intro · vous', () => {
    const draft = draftMessage({ contact: s01, request: R1, kind: 'intro', tone: 'vous', companyLabel: 'Atlas Conseil' })
    expect(draft).toEqual({
      subject: po('Une mise en relation chez Atlas Conseil ?'),
      body: po(
        'Bonjour Sara,\n\n' +
          "J'espère que vous allez bien. Mon objectif en ce moment : trouver ma prochaine mission de conseil en finance.\n\n" +
          "Comme vous travaillez chez Atlas Conseil, pourriez-vous m'indiquer la bonne personne à contacter, ou me mettre en relation avec elle si cela vous convient ?\n\n" +
          "Merci d'avance,",
      ),
    })
    expectClean(draft)
  })

  it('intro · tu', () => {
    const draft = draftMessage({ contact: s01, request: R1, kind: 'intro', tone: 'tu', companyLabel: 'Atlas Conseil' })
    expect(draft).toEqual({
      subject: po('Une mise en relation chez Atlas Conseil ?'),
      body: po(
        'Bonjour Sara,\n\n' +
          "J'espère que tu vas bien. Mon objectif en ce moment : trouver ma prochaine mission de conseil en finance.\n\n" +
          "Comme tu travailles chez Atlas Conseil, pourrais-tu m'indiquer la bonne personne à contacter, ou me mettre en relation avec elle si cela te convient ?\n\n" +
          'Merci et à bientôt,',
      ),
    })
    expectClean(draft)
  })

  it('the intro draft differs from the help draft, and vous from tu', () => {
    const bodies = new Set()
    for (const kind of ['help', 'intro']) {
      for (const tone of ['vous', 'tu']) {
        bodies.add(draftMessage({ contact: s01, request: R1, kind, tone, companyLabel: 'Atlas Conseil' }).body)
      }
    }
    expect(bodies.size).toBe(4)
  })

  it('uses no-break spaces before « : » and « ? »', () => {
    const { subject, body } = draftMessage({ contact: s01, request: R1, kind: 'intro', tone: 'vous', companyLabel: 'Atlas Conseil' })
    expect(body).toContain(`en ce moment${NBSP}:`)
    expect(body).toContain(`convient${NBSP}?`)
    expect(subject.endsWith(`${NBSP}?`)).toBe(true)
  })
})

describe('draftMessage: missing fields (PO §3 table)', () => {
  const comme = (contact, tone) => draftMessage({ contact, request: R1, kind: 'help', tone }).body.split('\n\n')[2]

  it('position only (s20)', () => {
    expect(comme(s20, 'vous')).toBe(
      po("Comme vous êtes Consultant indépendant en finance d'entreprise, votre avis me serait précieux. Auriez-vous quelques minutes pour en parler ?"),
    )
    expect(comme(s20, 'tu')).toBe(
      po("Comme tu es Consultant indépendant en finance d'entreprise, ton avis me serait précieux. Aurais-tu quelques minutes pour en parler ?"),
    )
  })

  it('company only', () => {
    const contact = { ...s01, position: null }
    expect(comme(contact, 'vous')).toBe(
      po('Comme vous travaillez chez Atlas Conseil, votre avis me serait précieux. Auriez-vous quelques minutes pour en parler ?'),
    )
    expect(comme(contact, 'tu')).toBe(
      po('Comme tu travailles chez Atlas Conseil, ton avis me serait précieux. Aurais-tu quelques minutes pour en parler ?'),
    )
  })

  it('neither position nor company (blank strings count as missing)', () => {
    const contact = { ...s01, position: '   ', company: null }
    expect(comme(contact, 'vous')).toBe(po('Votre avis me serait précieux. Auriez-vous quelques minutes pour en parler ?'))
    expect(comme(contact, 'tu')).toBe(po('Ton avis me serait précieux. Aurais-tu quelques minutes pour en parler ?'))
  })

  it('keeps {poste} and {entreprise} as written (no case change), trimmed', () => {
    const contact = { ...s01, position: '  Head of Corporate Banking ', company: 'FICTIVA BANQUE' }
    expect(comme(contact, 'vous')).toContain('Comme vous êtes Head of Corporate Banking chez FICTIVA BANQUE,')
  })

  it('empty first name → « Bonjour, »', () => {
    for (const firstName of ['', '   ', null, undefined]) {
      const draft = draftMessage({ contact: { ...s01, firstName }, request: R1, kind: 'help', tone: 'vous' })
      expect(draft.body.startsWith('Bonjour,\n\n')).toBe(true)
      expect(draft.body).not.toContain('Démo') // never the last name alone
      expectClean(draft)
    }
  })

  it.each(['Leïla', 'Anne-Sophie', 'Éloïse', "N'Golo"])('keeps the first name %j as written', (firstName) => {
    const draft = draftMessage({ contact: { ...s01, firstName: ` ${firstName} ` }, request: R1, kind: 'help', tone: 'tu' })
    expect(draft.body.startsWith(`Bonjour ${firstName},\n\n`)).toBe(true)
    expectClean(draft)
  })

  it('a request with trailing punctuation, line breaks or an all-caps first word', () => {
    const line = (request) => draftMessage({ contact: s01, request, kind: 'help', tone: 'vous' }).body.split('\n\n')[1]
    expect(line('Trouver un poste ?')).toBe(po("J'espère que vous allez bien. Mon objectif en ce moment : trouver un poste."))
    expect(line('Trouver un poste…')).toBe(po("J'espère que vous allez bien. Mon objectif en ce moment : trouver un poste."))
    expect(line('Trouver\nun poste.')).toBe(po("J'espère que vous allez bien. Mon objectif en ce moment : trouver un poste."))
    expect(line('DAF Atlas')).toBe(po("J'espère que vous allez bien. Mon objectif en ce moment : DAF Atlas."))
  })

  it('a 400-character request is cut at 300', () => {
    const request = `Trouver ${'a'.repeat(392)}`
    const { body } = draftMessage({ contact: s01, request, kind: 'help', tone: 'vous' })
    expect(body).toContain(`${NBSP}: trouver ${'a'.repeat(MAX_REQUEST_LENGTH - 8)}.`)
    expect(body).not.toContain('a'.repeat(MAX_REQUEST_LENGTH))
  })

  it('an empty request leaves out the objective sentence', () => {
    const { body } = draftMessage({ contact: s01, request: '  ?  ', kind: 'help', tone: 'vous' })
    expect(body.split('\n\n')[1]).toBe("J'espère que vous allez bien.")
    expect(body).not.toContain('objectif')
  })

  it('user text containing a placeholder is not re-filled', () => {
    const draft = draftMessage({ contact: { ...s01, firstName: '{demande}' }, request: 'x', kind: 'help', tone: 'vous' })
    expect(draft.body.startsWith('Bonjour {demande},')).toBe(true)
  })
})

describe('draftMessage: intro company and fallbacks', () => {
  it('intro uses companyLabel, not the spelling in the file (s02)', () => {
    const draft = draftMessage({ contact: s02, request: R1, kind: 'intro', tone: 'vous', companyLabel: 'Atlas Conseil' })
    expect(draft.subject).toBe(po('Une mise en relation chez Atlas Conseil ?'))
    expect(draft.body).toContain('Comme vous travaillez chez Atlas Conseil, pourriez-vous')
    expect(draft.body).not.toContain('ATLAS CONSEIL SA')
    expectClean(draft)
  })

  it('intro works for a contact without LinkedIn or email (s27)', () => {
    const draft = draftMessage({ contact: s27, request: R1, kind: 'intro', tone: 'tu', companyLabel: 'Démoventures' })
    expect(draft.body.startsWith('Bonjour Houda,')).toBe(true)
    expect(draft.body).toContain('Comme tu travailles chez Démoventures, pourrais-tu')
    expectClean(draft)
  })

  it('intro without companyLabel falls back to contact.company', () => {
    for (const companyLabel of [undefined, null, '', '   ', 42]) {
      const draft = draftMessage({ contact: s02, request: R1, kind: 'intro', tone: 'vous', companyLabel })
      expect(draft.subject).toBe(po('Une mise en relation chez ATLAS CONSEIL SA ?'))
      expectClean(draft)
    }
  })

  it('intro without companyLabel nor contact.company falls back to the help draft', () => {
    const draft = draftMessage({ contact: s20, request: R1, kind: 'intro', tone: 'vous' })
    expect(draft).toEqual(draftMessage({ contact: s20, request: R1, kind: 'help', tone: 'vous' }))
    expect(draft.subject).toBe('Une question pour vous')
  })

  it('help ignores companyLabel', () => {
    const draft = draftMessage({ contact: s02, request: R1, kind: 'help', tone: 'vous', companyLabel: 'Atlas Conseil' })
    expect(draft.body).toContain('Comme vous êtes Associé chez ATLAS CONSEIL SA,')
  })

  it('a bad tone → vous, a bad kind → help', () => {
    const vousHelp = draftMessage({ contact: s01, request: R1, kind: 'help', tone: 'vous' })
    for (const tone of [undefined, 'Tu', 'TU', 'toi', 1, null]) {
      expect(draftMessage({ contact: s01, request: R1, kind: 'help', tone })).toEqual(vousHelp)
    }
    for (const kind of [undefined, 'Intro', 'introduction', 0, null]) {
      expect(draftMessage({ contact: s01, request: R1, kind, tone: 'vous', companyLabel: 'Atlas Conseil' })).toEqual(vousHelp)
    }
  })

  it('never throws, whatever the input', () => {
    const throwing = {
      get firstName() {
        throw new Error('boom')
      },
    }
    for (const input of [undefined, null, 0, 'x', [], {}, { contact: null }, { contact: 'x', request: {} }, { contact: throwing }]) {
      const draft = draftMessage(input)
      expect(draft.body.startsWith('Bonjour,\n\n')).toBe(true)
      expect(draft.subject).toBe('Une question pour vous')
      expectClean(draft)
    }
  })

  it('every sample contact × kind × tone gives a clean draft', () => {
    for (const contact of SAMPLE_CONTACTS) {
      for (const kind of ['help', 'intro']) {
        for (const tone of ['vous', 'tu']) {
          for (const request of [R1, 'DAF Atlas ?', '', `${'mot '.repeat(120)}.`]) {
            expectClean(draftMessage({ contact, request, kind, tone, companyLabel: contact.company ?? undefined }))
          }
        }
      }
    }
  })

  it('DRAFT_COPY is frozen and has no sender placeholder', () => {
    expect(Object.isFrozen(DRAFT_COPY)).toBe(true)
    expect(Object.isFrozen(DRAFT_COPY.vous)).toBe(true)
    expect(JSON.stringify(DRAFT_COPY)).not.toMatch(/\[|Votre prénom|cher|chère|ravi/)
  })
})

describe('linkedInProfileUrl', () => {
  it('returns the profile URL of a sample contact', () => {
    expect(linkedInProfileUrl(s01)).toBe('https://www.linkedin.com/in/netgraph-exemple-s01')
    expect(linkedInProfileUrl(s02)).toBe('https://www.linkedin.com/in/netgraph-exemple-s02')
  })

  it('returns null without a profile URL (s20, s27)', () => {
    expect(linkedInProfileUrl(s20)).toBeNull()
    expect(linkedInProfileUrl(s27)).toBeNull()
  })

  const urls = [
    ['https://www.linkedin.com/in/netgraph-exemple-x', true],
    ['https://linkedin.com/in/netgraph-exemple-x', true],
    ['https://WWW.LinkedIn.com/in/x', true],
    ['javascript:alert(1)', false],
    ['JavaScript://www.linkedin.com/%0Aalert(1)', false],
    ['http://www.linkedin.com/in/x', false],
    ['https://www.linkedin.com.evil.test/in/x', false],
    ['https://evil.test/https://www.linkedin.com/in/x', false],
    ['https://user:pass@www.linkedin.com/in/x', false],
    ['https://www.linkedin.com:8443/in/x', false],
    ['//www.linkedin.com/in/x', false],
    ['data:text/html,hi', false],
    [`https://www.linkedin.com/in/${'x'.repeat(2000)}`, false],
    ['', false],
  ]

  it.each(urls)('%j → valid: %j', (profileUrl, valid) => {
    expect(linkedInProfileUrl({ ...s01, profileUrl })).toBe(valid ? profileUrl : null)
  })

  it('agrees with cleanProfileUrl (one LinkedIn rule in the codebase)', () => {
    for (const [profileUrl] of urls) {
      expect(linkedInProfileUrl({ profileUrl })).toBe(cleanProfileUrl(profileUrl))
    }
  })

  it('never throws on bad input', () => {
    for (const input of [undefined, null, 'https://www.linkedin.com/in/x', 42, {}, { profileUrl: 42 }, { profileUrl: {} }]) {
      expect(linkedInProfileUrl(input)).toBeNull()
    }
  })
})

describe('mailtoUrl', () => {
  const to = 'sara.demo@netgraph.test'

  /** Parse our own output back: recipient, subject and body. */
  function parse(url) {
    const match = /^mailto:([^?]*)\?subject=([^&]*)&body=([^&]*)$/.exec(url)
    expect(match).not.toBeNull()
    return { to: match[1], subject: decodeURIComponent(match[2]), body: decodeURIComponent(match[3]) }
  }

  it('builds a link for a s01 draft that round-trips accents, no-break spaces and line breaks', () => {
    const draft = draftMessage({ contact: s01, request: R1, kind: 'help', tone: 'vous' })
    const url = mailtoUrl({ to: s01.email, ...draft })
    expect(url.startsWith(`mailto:${to}?subject=Une%20question%20pour%20vous&body=Bonjour%20Sara%2C%0D%0A%0D%0A`)).toBe(true)
    const back = parse(url)
    expect(back.to).toBe(to)
    expect(back.subject).toBe(draft.subject)
    expect(back.body).toBe(draft.body.replace(/\n/g, '\r\n'))
    expect(url).toContain('%C3%A9') // é
    expect(url).toContain('%C2%A0') // no-break space
  })

  it('spaces are %20, never +; a literal + in the text is encoded', () => {
    const url = mailtoUrl({ to, subject: 'a b', body: '1 + 1' })
    expect(url).toBe(`mailto:${to}?subject=a%20b&body=1%20%2B%201`)
  })

  it('normalises every line break to CRLF', () => {
    const url = mailtoUrl({ to, subject: 'x', body: 'a\nb\r\nc\rd' })
    expect(url.endsWith('&body=a%0D%0Ab%0D%0Ac%0D%0Ad')).toBe(true)
  })

  it('encodes & # = ? in the subject and body, so they cannot add parameters', () => {
    const url = mailtoUrl({ to, subject: 'a&cc=x@y.test', body: 'b?bcc=z@y.test#frag' })
    expect(url).toBe(`mailto:${to}?subject=a%26cc%3Dx%40y.test&body=b%3Fbcc%3Dz%40y.test%23frag`)
    expect(parse(url).subject).toBe('a&cc=x@y.test')
  })

  it('accepts an email with + and trims the recipient', () => {
    expect(mailtoUrl({ to: ' sara+reseau@netgraph.test ', subject: 's', body: 'b' })).toBe(
      'mailto:sara+reseau@netgraph.test?subject=s&body=b',
    )
  })

  it.each([
    'sara@netgraph.test?cc=x@netgraph.test',
    'sara@netgraph.test&bcc=x@netgraph.test',
    'sara@netgraph.test#x',
    'sara@netgraph.test%0Abcc:x@netgraph.test',
    'sara%40netgraph.test',
    'sara@netgraph.test,x@netgraph.test',
    'sara@netgraph.test;x@netgraph.test',
    'sara/x@netgraph.test',
    'sara@netgraph.test\nbcc:x@netgraph.test',
    'pas-une-adresse',
    'javascript:alert(1)//@netgraph.test',
    '',
  ])('rejects the recipient %j', (bad) => {
    expect(mailtoUrl({ to: bad, subject: 's', body: 'b' })).toBeNull()
  })

  it('returns null for a missing or non-string recipient, and never throws', () => {
    for (const input of [undefined, null, 'x', {}, { to: null }, { to: 42 }, { to: ['a@b.test'] }]) {
      expect(mailtoUrl(input)).toBeNull()
    }
    expect(mailtoUrl({ to, subject: 'x', body: 'lone \uD800 surrogate' })).toBeNull()
  })

  it('treats a missing subject or body as empty', () => {
    expect(mailtoUrl({ to })).toBe(`mailto:${to}?subject=&body=`)
  })

  it('2,000 characters exactly is allowed, 2,001 is null', () => {
    const base = `mailto:${to}?subject=s&body=`
    const exact = 'a'.repeat(MAX_MAILTO_LENGTH - base.length)
    expect(mailtoUrl({ to, subject: 's', body: exact })).toHaveLength(MAX_MAILTO_LENGTH)
    expect(mailtoUrl({ to, subject: 's', body: `${exact}a` })).toBeNull()
    // Encoded length counts: one « é » is 6 characters in the URL.
    expect(mailtoUrl({ to, subject: 's', body: `${exact.slice(6)}é` })).toHaveLength(MAX_MAILTO_LENGTH)
    expect(mailtoUrl({ to, subject: 's', body: `${exact.slice(5)}é` })).toBeNull()
  })

  it('no mailto for the sample contacts without an email (s02, s27)', () => {
    for (const contact of [s02, s27]) {
      expect(mailtoUrl({ to: contact.email, subject: 's', body: 'b' })).toBeNull()
    }
    expect(mailtoUrl({ to: s20.email, subject: 's', body: 'b' })).not.toBeNull()
  })
})
