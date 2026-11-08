import { describe, expect, it } from 'vitest'
import {
  DRAFT_UI,
  EMPTY_EDIT,
  currentDraft,
  draftActions,
  draftKey,
  editorHeading,
  effectiveTone,
  isEdited,
  linkedInHint,
  normalizeTone,
  prepareSrText,
  replaceQuestion,
  withFieldEdit,
  withTone,
} from './draftState'
import { copyText } from './clipboard'
import { linkedInHref } from './search'
import { draftMessage, linkedInProfileUrl } from '../../lib/drafts.js'
import { SAMPLE_CONTACTS } from '../../lib/fixtures/sample-contacts.js'
import { buildIndex } from '../../lib/match.js'
import { introducers } from '../../lib/introducers.js'

const byId = (id) => SAMPLE_CONTACTS.find((c) => c.id === id)
const s01 = byId('s01')
const s02 = byId('s02')
const s20 = byId('s20')
const s27 = byId('s27')
const R1 = 'Trouver ma prochaine mission de conseil en finance'
const R2 = 'Rencontrer le DAF de Atlas Conseil'
const NBSP = ' '

describe('draft copy', () => {
  it('has no element labelled « Envoyer » (F7)', () => {
    for (const value of Object.values(DRAFT_UI)) {
      const texts = typeof value === 'string' ? [value] : Object.values(value)
      for (const text of texts) expect(text).not.toMatch(/^\s*Envoyer/i)
    }
  })

  it('keeps the PO lines word for word', () => {
    expect(DRAFT_UI.promise).toBe("NetGraph n'envoie rien à votre place. C'est vous qui envoyez le message.")
    expect(DRAFT_UI.notSaved).toBe(`Votre texte n'est pas enregistré${NBSP}: il disparaît si vous rechargez la page.`)
    expect([DRAFT_UI.copy, DRAFT_UI.openLinkedIn, DRAFT_UI.openMail]).toEqual([
      'Copier',
      'Ouvrir le profil LinkedIn',
      'Ouvrir dans votre messagerie',
    ])
  })

  it('names the person in the heading, the button and the LinkedIn hint', () => {
    expect(editorHeading(s01, 'help')).toBe('Message pour Sara')
    expect(editorHeading(s01, 'intro')).toBe('Message pour Sara (mise en relation)')
    expect(editorHeading({ firstName: '', fullName: 'Démo SA' }, 'help')).toBe('Message pour Démo SA')
    expect(prepareSrText(s01)).toBe(' pour Sara Démo')
    expect(linkedInHint(s01)).toBe(`Pour LinkedIn${NBSP}: copiez le message, puis collez-le dans votre conversation avec Sara.`)
    expect(linkedInHint({ firstName: ' ' })).toMatch(/avec cette personne\.$/)
  })

  it('asks before replacing an edited text', () => {
    expect(replaceQuestion('tu')).toBe(`Remplacer votre texte par la version «${NBSP}Tu${NBSP}»${NBSP}?`)
    expect(replaceQuestion('bogus')).toContain('Vous')
  })
})

describe('tone and keys', () => {
  it('falls back to « vous » for anything but « tu »', () => {
    expect(normalizeTone('tu')).toBe('tu')
    for (const v of ['vous', null, undefined, 'TU', 'toi', 42]) expect(normalizeTone(v)).toBe('vous')
  })

  it('keys one draft per kind and contact', () => {
    expect(draftKey('help', 's01')).toBe('help:s01')
    expect(draftKey('intro', 's01')).toBe('intro:s01')
    expect(draftKey('other', 's01')).toBe('help:s01')
    expect(draftKey('help', 's01')).not.toBe(draftKey('help', 's02'))
  })

  it('uses the pinned tone first, then the preference', () => {
    expect(effectiveTone(undefined, 'tu')).toBe('tu')
    expect(effectiveTone({ ...EMPTY_EDIT, tone: 'vous' }, 'tu')).toBe('vous')
  })
})

describe('currentDraft and edits', () => {
  const base = { contact: s01, request: R1, kind: 'help', preferredTone: 'vous' }

  it('is the generated draft when nothing was edited', () => {
    const d = currentDraft({ ...base, edit: undefined })
    expect(d).toMatchObject(draftMessage({ contact: s01, request: R1, kind: 'help', tone: 'vous' }))
    expect(d.body).toContain('Comme vous êtes Directrice financière chez Atlas Conseil')
    expect(isEdited(undefined)).toBe(false)
  })

  it('follows the saved tone when not edited', () => {
    expect(currentDraft({ ...base, preferredTone: 'tu' }).body).toContain("J'espère que tu vas bien.")
  })

  it('stores only the edited field', () => {
    const d = currentDraft(base)
    const edit = withFieldEdit(undefined, 'body', 'Mon texte', d.generated, 'vous')
    expect(edit).toEqual({ subject: null, body: 'Mon texte', tone: 'vous' })
    expect(isEdited(edit)).toBe(true)
    const shown = currentDraft({ ...base, edit })
    expect(shown.body).toBe('Mon texte')
    expect(shown.subject).toBe(d.generated.subject)
  })

  it('counts typing the generated text back as not edited', () => {
    const d = currentDraft(base)
    const edited = withFieldEdit(undefined, 'body', 'x', d.generated, 'vous')
    const back = withFieldEdit(edited, 'body', d.generated.body, d.generated, 'vous')
    expect(back.body).toBeNull()
    expect(isEdited(back)).toBe(false)
  })

  it('keeps an edited text in its tone when the preference changes elsewhere', () => {
    const d = currentDraft(base)
    const edit = withFieldEdit(undefined, 'body', 'Texte vous', d.generated, 'vous')
    const shown = currentDraft({ ...base, edit, preferredTone: 'tu' })
    expect(shown.tone).toBe('vous')
    expect(shown.body).toBe('Texte vous')
  })

  it('keeps an empty body as an edit (the user cleared it)', () => {
    const d = currentDraft(base)
    const edit = withFieldEdit(undefined, 'body', '', d.generated, 'vous')
    expect(currentDraft({ ...base, edit }).body).toBe('')
  })

  it('switches tone directly when not edited, or replaces on request', () => {
    expect(currentDraft({ ...base, edit: withTone(undefined, 'tu') }).body).toContain('Aurais-tu')
    const d = currentDraft(base)
    const edit = withFieldEdit(undefined, 'subject', 'Objet perso', d.generated, 'vous')
    const kept = withTone(edit, 'tu')
    expect(kept.subject).toBe('Objet perso')
    const replaced = withTone(edit, 'tu', { replace: true })
    expect(replaced).toEqual({ subject: null, body: null, tone: 'tu' })
    expect(currentDraft({ ...base, edit: replaced }).subject).toBe('Une question pour toi')
  })

  it('lets an unedited draft follow a new request, an edited one stays', () => {
    const d = currentDraft(base)
    const edit = withFieldEdit(undefined, 'body', 'Gardé', d.generated, 'vous')
    expect(currentDraft({ ...base, request: R2 }).body).toContain('rencontrer le DAF de Atlas Conseil')
    expect(currentDraft({ ...base, request: R2, edit }).body).toBe('Gardé')
  })

  it('opens the intro draft with the section label (s02 at ATLAS CONSEIL SA)', () => {
    const intro = introducers(R2, buildIndex(SAMPLE_CONTACTS))
    expect(intro.status).toBe('found')
    expect(intro.people.map((p) => p.contact.id)).toContain('s02')
    const d = currentDraft({ contact: s02, request: R2, kind: 'intro', companyLabel: intro.companyLabel, preferredTone: 'vous' })
    expect(d.subject).toBe(`Une mise en relation chez Atlas Conseil${NBSP}?`)
    expect(d.body).toContain('Comme vous travaillez chez Atlas Conseil')
    expect(d.body).not.toContain('ATLAS CONSEIL SA')
  })
})

describe('draftActions (PO §5)', () => {
  const textOf = (contact) => draftMessage({ contact, request: R1, kind: 'help', tone: 'vous' })

  it('s01: LinkedIn and email', () => {
    const { subject, body } = textOf(s01)
    const a = draftActions(s01, subject, body)
    expect(a.linkedIn).toMatch(/^https:\/\/www\.linkedin\.com\//)
    expect(a.hasEmail).toBe(true)
    expect(a.mailto).toMatch(/^mailto:sara\.demo@netgraph\.test\?subject=/)
    expect(a.hint).toBeNull()
  })

  it('s02: LinkedIn only, no subject field', () => {
    const a = draftActions(s02, 'x', 'y')
    expect(a.linkedIn).not.toBeNull()
    expect(a.hasEmail).toBe(false)
    expect(a.mailto).toBeNull()
    expect(a.hint).toBeNull()
  })

  it('s20: email only', () => {
    const a = draftActions(s20, 'x', 'y')
    expect(a.linkedIn).toBeNull()
    expect(a.mailto).toMatch(/^mailto:ilyas\.cobaye@netgraph\.test\?/)
    expect(a.hint).toBeNull()
  })

  it('s27: neither, Copier only with the explanation', () => {
    const a = draftActions(s27, 'x', 'y')
    expect(a).toEqual({
      linkedIn: null,
      hasEmail: false,
      mailto: null,
      hasPhone: false,
      whatsapp: null,
      hint: 'none',
      whatsappHint: null,
    })
  })

  it('email but too long: no mailto link, the « trop long » line, the subject field stays', () => {
    const a = draftActions(s01, 'Objet', 'é'.repeat(800))
    expect(a.hasEmail).toBe(true)
    expect(a.mailto).toBeNull()
    expect(a.hint).toBe('tooLong')
    expect(a.linkedIn).not.toBeNull()
  })

  it('uses the current (edited) subject and body in the mailto link', () => {
    const a = draftActions(s01, 'Mon objet', 'Ligne 1\nLigne 2')
    expect(a.mailto).toBe('mailto:sara.demo@netgraph.test?subject=Mon%20objet&body=Ligne%201%0D%0ALigne%202')
  })

  it('treats javascript: and http: profile URLs as « no LinkedIn »', () => {
    expect(draftActions({ ...s27, profileUrl: 'javascript:alert(1)' }, '', '').linkedIn).toBeNull()
    expect(draftActions({ ...s27, profileUrl: 'http://www.linkedin.com/in/x' }, '', '').hint).toBe('none')
  })

  it('rejects a recipient that would add headers', () => {
    expect(draftActions({ ...s27, email: 'a@b.ma?cc=c@d.ma' }, '', '').hasEmail).toBe(false)
  })
})

describe('draftActions: « Ouvrir dans WhatsApp » (#9 PO §5)', () => {
  const PHONE = '+212600000001'

  it('no number: no button, no WhatsApp line', () => {
    const a = draftActions(s01, 'x', 'y')
    expect(a.hasPhone).toBe(false)
    expect(a.whatsapp).toBeNull()
    expect(a.whatsappHint).toBeNull()
  })

  it('a valid number: the wa.me link with the body only, and the « Vérifiez le destinataire » line', () => {
    const a = draftActions({ ...s01, phone: PHONE }, 'Mon objet', 'Bonjour Sara,\nÇa va ?')
    expect(a.hasPhone).toBe(true)
    expect(a.whatsapp).toBe('https://wa.me/212600000001?text=Bonjour%20Sara%2C%0A%C3%87a%20va%20%3F')
    expect(a.whatsapp).not.toContain('objet')
    expect(a.whatsappHint).toBe('ready')
  })

  it('follows the edited body live', () => {
    const c = { ...s27, phone: PHONE }
    expect(draftActions(c, '', 'A').whatsapp).toBe('https://wa.me/212600000001?text=A')
    expect(draftActions(c, '', 'B').whatsapp).toBe('https://wa.me/212600000001?text=B')
  })

  it('a non-E.164 or invalid number counts as no number', () => {
    for (const phone of ['0612345678', '12345', '+0612345678', '', null, 42]) {
      const a = draftActions({ ...s27, phone }, '', 'x')
      expect(a.whatsapp).toBeNull()
      expect(a.hasPhone).toBe(false)
      expect(a.hint).toBe('none')
    }
  })

  it('a body too long for the link: no button, the « trop long … WhatsApp » line', () => {
    const a = draftActions({ ...s27, phone: PHONE }, '', 'é'.repeat(800))
    expect(a.hasPhone).toBe(true)
    expect(a.whatsapp).toBeNull()
    expect(a.whatsappHint).toBe('tooLong')
    expect(a.hint).toBeNull()
  })

  it('the « no channel » line only when LinkedIn, email and number are all missing', () => {
    expect(draftActions({ ...s27, phone: PHONE }, '', 'x').hint).toBeNull()
    expect(draftActions(s27, '', 'x').hint).toBe('none')
    expect(DRAFT_UI.noChannel).toBe(
      "Votre fichier ne contient ni profil LinkedIn, ni adresse email, ni numéro de téléphone pour cette personne. Copiez le message pour l'envoyer par le moyen de votre choix.",
    )
  })

  it('uses the PO copy word for word', () => {
    expect(DRAFT_UI.openWhatsApp).toBe('Ouvrir dans WhatsApp')
    expect(DRAFT_UI.whatsappHint).toBe(
      "WhatsApp s'ouvre avec votre message prérempli. Vérifiez le destinataire, puis envoyez-le vous-même.",
    )
    expect(DRAFT_UI.whatsappTooLong).toBe(
      'Ce message est trop long pour être ouvert dans WhatsApp. Copiez-le, puis collez-le dans votre conversation WhatsApp.',
    )
  })

  it('the six PO numbers: 2126, 2127, 2126, 2126, 336, and none for 12345', async () => {
    const { normalizePhone } = await import('../../lib/phone.js')
    const raw = ['06 12 34 56 78', '07-12-34-56-78', '+212 6 12 34 56 78', '00212612345678', '+33 6 12 34 56 78', '12345']
    const links = raw.map((r) => draftActions({ ...s27, phone: normalizePhone(r) }, '', '').whatsapp)
    expect(links).toEqual([
      'https://wa.me/212612345678',
      'https://wa.me/212712345678',
      'https://wa.me/212612345678',
      'https://wa.me/212612345678',
      'https://wa.me/33612345678',
      null,
    ])
  })
})

describe('linkedInHref (#6) and linkedInProfileUrl (#8) agree (F8)', () => {
  const urls = [
    'https://www.linkedin.com/in/netgraph-exemple-s01',
    'https://linkedin.com/in/x',
    '  https://www.linkedin.com/in/x  ',
    'https://WWW.LINKEDIN.COM/in/x',
    'http://www.linkedin.com/in/x',
    'javascript:alert(1)',
    'https://www.linkedin.com.evil.ma/in/x',
    'https://evil.ma/https://www.linkedin.com/in/x',
    'https://user:pass@www.linkedin.com/in/x',
    'https://www.linkedin.com:8443/in/x',
    'https://fr.linkedin.com/in/x',
    `https://www.linkedin.com/in/${'a'.repeat(2000)}`,
    '',
    null,
    undefined,
  ]
  for (const url of urls) {
    it(`same verdict for ${JSON.stringify(url)?.slice(0, 60)}`, () => {
      const a = linkedInHref(url)
      const b = linkedInProfileUrl({ profileUrl: url })
      expect(a === null).toBe(b === null)
    })
  }
})

describe('copyText', () => {
  it('uses the Clipboard API when it works', async () => {
    let written = null
    const nav = { clipboard: { writeText: async (t) => { written = t } } }
    expect(await copyText('Bonjour', { navigator: nav, document: undefined })).toBe(true)
    expect(written).toBe('Bonjour')
  })

  function fakeDocument(execResult) {
    const calls = { appended: 0, removed: 0, selected: 0, refocused: 0 }
    const area = {
      style: {},
      setAttribute() {},
      select() { calls.selected++ },
      remove() { calls.removed++ },
    }
    const doc = {
      body: { appendChild() { calls.appended++ } },
      activeElement: { focus() { calls.refocused++ } },
      createElement: () => area,
      execCommand: () => {
        if (execResult instanceof Error) throw execResult
        return execResult
      },
    }
    return { doc, calls, area }
  }

  it('falls back to execCommand when the Clipboard API refuses', async () => {
    const nav = { clipboard: { writeText: async () => { throw new Error('denied') } } }
    const { doc, calls, area } = fakeDocument(true)
    expect(await copyText('Texte', { navigator: nav, document: doc })).toBe(true)
    expect(area.value).toBe('Texte')
    expect(calls).toEqual({ appended: 1, removed: 1, selected: 1, refocused: 1 })
  })

  it('reports a failure when nothing works', async () => {
    expect(await copyText('x', { navigator: {}, document: fakeDocument(false).doc })).toBe(false)
    expect(await copyText('x', { navigator: {}, document: fakeDocument(new Error('no')).doc })).toBe(false)
    expect(await copyText('x', { navigator: {}, document: undefined })).toBe(false)
    expect(await copyText(null, { navigator: {}, document: undefined })).toBe(false)
  })
})
