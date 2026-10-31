import { describe, expect, it } from 'vitest'
import { STOPWORDS, normalize, scan, stem, tokenize } from './text.js'

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('Directrice Financière')).toBe('directrice financiere')
    expect(normalize('ÉCHANTILLON Zéroboîte')).toBe('echantillon zeroboite')
    expect(normalize('trouver une DIRECTRICE FINANCIERE')).toBe('trouver une directrice financiere')
  })

  it('folds ligatures', () => {
    expect(normalize('Cœur Ætna')).toBe('coeur aetna')
  })

  it("drops French elisions (l', d', qu', typographic apostrophe)", () => {
    expect(normalize("Le DAF d'Atlas Conseil")).toBe('le daf atlas conseil')
    expect(normalize('chez L’Oréal')).toBe('chez oreal')
    expect(normalize("qu'il soit")).toBe('il soit')
    expect(normalize("jusqu'à demain")).toBe('a demain')
  })

  it('splits other apostrophes into words', () => {
    expect(normalize("quelqu'un aujourd'hui")).toBe('quelqu un aujourd hui')
  })

  it('keeps M&A, R&D and « M & A » as one token', () => {
    expect(normalize('Directeur M&A')).toBe('directeur m&a')
    expect(normalize('conseil en M & A')).toBe('conseil en m&a')
    expect(normalize('R&D')).toBe('r&d')
    expect(normalize('Strategy & M&A')).toBe('strategy m&a')
  })

  it('splits long words joined by &', () => {
    expect(normalize('Fondatrice&CEO')).toBe('fondatrice ceo')
    expect(normalize('Fictis & Associés')).toBe('fictis associes')
  })

  it('keeps the first form of inclusive writing', () => {
    expect(normalize('Directeur·rice financier·ère')).toBe('directeur financier')
    expect(normalize('consultant•e')).toBe('consultant')
  })

  it('turns punctuation, hyphens, emoji and line breaks into single spaces', () => {
    expect(normalize('  fusions-acquisitions,\n\tstart-up !!! 🚀💼 ')).toBe('fusions acquisitions start up')
    expect(normalize('???')).toBe('')
  })

  it('handles non-strings and empty input', () => {
    expect(normalize('')).toBe('')
    expect(normalize(null)).toBe('')
    expect(normalize(42)).toBe('')
  })
})

describe('scan', () => {
  it('keeps each word as typed with its position', () => {
    const text = "Le DAF d'Atlas Conseil"
    const tokens = scan(text)
    expect(tokens.map((t) => t.norm)).toEqual(['le', 'daf', 'atlas', 'conseil'])
    expect(tokens.map((t) => t.surface)).toEqual(['Le', 'DAF', 'Atlas', 'Conseil'])
    for (const t of tokens) expect(text.slice(t.start, t.end)).toBe(t.surface)
  })

  it('keeps accents and inclusive writing in the surface', () => {
    expect(scan('Financière Directeur·rice').map((t) => t.surface)).toEqual(['Financière', 'Directeur·rice'])
  })
})

describe('tokenize', () => {
  it('drops French and English stopwords and generic request words', () => {
    expect(tokenize('Je veux trouver')).toEqual([])
    expect(tokenize('the')).toEqual([])
    expect(tokenize('de la')).toEqual([])
    expect(tokenize("Être présenté à quelqu'un chez Fictiva Banque")).toEqual(['fictiva', 'banque'])
    expect(tokenize('Find a partner at a private equity fund')).toEqual(['partner', 'private', 'equity', 'fund'])
  })

  it('drops the leftovers of « (e) » endings', () => {
    expect(tokenize('Consultant(e) indépendant(e)')).toEqual(['consultant', 'independant'])
  })

  it('exposes the stopword list', () => {
    expect(STOPWORDS.has('de')).toBe(true)
    expect(STOPWORDS.has('finance')).toBe(false)
  })
})

describe('stem', () => {
  it('folds plurals and feminine endings to one form', () => {
    expect(stem('directrice')).toBe('directeur')
    expect(stem('directrices')).toBe('directeur')
    expect(stem('directeur')).toBe('directeur')
    expect(stem('financiere')).toBe('financier')
    expect(stem('associee')).toBe('associe')
    expect(stem('consultante')).toBe('consultant')
    expect(stem('auditrice')).toBe('auditeur')
    expect(stem('fonds')).toBe('fond')
    expect(stem('achats')).toBe('achat')
  })

  it('leaves short words, tokens with & or digits, and -ss/-us/-is words alone', () => {
    expect(stem('daf')).toBe('daf')
    expect(stem('m&a')).toBe('m&a')
    expect(stem('web3')).toBe('web3')
    expect(stem('business')).toBe('business')
    expect(stem('campus')).toBe('campus')
    expect(stem('analysis')).toBe('analysis')
  })
})
