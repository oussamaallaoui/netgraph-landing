import { describe, expect, it } from 'vitest'
import { companyKey } from './company.js'

describe('companyKey', () => {
  it('gives the same key to the sample variants', () => {
    expect(companyKey('ATLAS CONSEIL SA')).toBe('atlas conseil')
    expect(companyKey('Atlas Conseil')).toBe('atlas conseil')
    expect(companyKey('Oasis Capital Démo SARL')).toBe('oasis capital demo')
    expect(companyKey('Oasis Capital Démo')).toBe('oasis capital demo')
    expect(companyKey('FICTIVA BANQUE')).toBe('fictiva banque')
  })

  it('strips accents, punctuation and extra spaces', () => {
    expect(companyKey('  Zéroboîte   Industries, ')).toBe('zeroboite industries')
    expect(companyKey('Démo-Ventures (Maroc)')).toBe('demo ventures maroc')
  })

  it('turns & into « et »', () => {
    expect(companyKey('Fictis & Associés')).toBe('fictis et associes')
    expect(companyKey('M&A Partners')).toBe('m et a partners')
  })

  it('removes trailing legal suffixes repeatedly, including « S.A. » and « SARL AU »', () => {
    expect(companyKey('Fictiva Group SA')).toBe('fictiva')
    expect(companyKey('Testiflow S.A.')).toBe('testiflow')
    expect(companyKey('Exemplia SARL AU')).toBe('exemplia')
    expect(companyKey('Imaginis GmbH')).toBe('imaginis')
    expect(companyKey('Synthetix Ltd.')).toBe('synthetix')
  })

  it('keeps a legal word that is not at the end', () => {
    expect(companyKey('Groupe Fictiva')).toBe('groupe fictiva')
  })

  it('drops elisions like the rest of the matching', () => {
    expect(companyKey("L'Atelier Démo")).toBe('atelier demo')
  })

  it("returns '' for empty input or a name made only of a suffix", () => {
    expect(companyKey(null)).toBe('')
    expect(companyKey(undefined)).toBe('')
    expect(companyKey('')).toBe('')
    expect(companyKey('   ')).toBe('')
    expect(companyKey('SA')).toBe('')
  })
})
