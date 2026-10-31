import { describe, expect, it } from 'vitest'
import { whyText } from './explain.js'

const NBSP = ' '
const q = (s) => `«${NBSP}${s}${NBSP}»`

const sara = { id: 's01', fullName: 'Sara Démo', position: 'Directrice financière', company: 'Atlas Conseil' }

describe('whyText', () => {
  it('cites the position and company matches', () => {
    const text = whyText(sara, [
      { field: 'position', kind: 'concept', concept: 'finance', label: 'finance' },
      { field: 'company', kind: 'concept', concept: 'conseil', label: 'conseil' },
    ])
    expect(text).toBe(
      `Directrice financière chez Atlas Conseil : son poste correspond à ${q('finance')} et son entreprise à ${q('conseil')}, comme indiqué dans votre demande.`,
    )
  })

  it('says when the company is the one named in the request', () => {
    const text = whyText(sara, [
      { field: 'position', kind: 'concept', concept: 'cfo', label: 'direction financière (DAF, CFO)' },
      { field: 'company', kind: 'company_mentioned', label: 'Atlas Conseil' },
    ])
    expect(text).toBe(
      `Directrice financière chez Atlas Conseil : son poste correspond à ${q('direction financière (DAF, CFO)')} et son entreprise est celle que vous citez.`,
    )
  })

  it('lists up to three labels, without duplicates', () => {
    const text = whyText(sara, [
      { field: 'position', kind: 'concept', concept: 'a', label: 'finance' },
      { field: 'position', kind: 'term', label: 'Finance' },
      { field: 'position', kind: 'term', label: 'b' },
      { field: 'position', kind: 'term', label: 'c' },
      { field: 'position', kind: 'term', label: 'd' },
    ])
    expect(text).toContain(`${q('finance')}, ${q('b')} et ${q('c')}`)
    expect(text).not.toContain('d»')
  })

  it('works without a company', () => {
    const ilyas = { fullName: 'Ilyas Cobaye', position: "Consultant indépendant en finance d'entreprise", company: null }
    const text = whyText(ilyas, [
      { field: 'position', kind: 'concept', concept: 'finance', label: 'finance' },
      { field: 'company', kind: 'company_mentioned', label: 'x' },
    ])
    expect(text).toBe(`Consultant indépendant en finance d'entreprise : son poste correspond à ${q('finance')}, comme indiqué dans votre demande.`)
    expect(text).not.toMatch(/chez|null|undefined/)
  })

  it('works without a position', () => {
    const text = whyText({ fullName: 'A B', position: '', company: 'Fictiva Banque' }, [
      { field: 'company', kind: 'company_mentioned', label: 'Fictiva Banque' },
    ])
    expect(text).toBe('Fictiva Banque : son entreprise est celle que vous citez.')
    const termOnly = whyText({ fullName: 'A B', position: null, company: 'Fictiva Banque' }, [
      { field: 'company', kind: 'term', label: 'Fictiva' },
    ])
    expect(termOnly).toBe(`Fictiva Banque : son entreprise correspond à ${q('Fictiva')}, comme indiqué dans votre demande.`)
  })

  it('never returns an empty or broken sentence', () => {
    for (const [contact, reasons] of [[{}, []], [null, null], [{ fullName: 'A B' }, undefined], [{ position: '  x  y ' }, [null]]]) {
      const text = whyText(contact, reasons)
      expect(text.trim().length).toBeGreaterThan(0)
      expect(text).not.toMatch(/undefined|null| {2}/)
    }
    expect(whyText({ position: '  x  y ' }, [])).toBe('x y : correspond à votre demande.')
  })
})
