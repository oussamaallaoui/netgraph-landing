import { describe, expect, it } from 'vitest'
import { ofName } from './format.js'

describe('ofName (#23)', () => {
  it.each([
    'Anas Figurant',
    'Omar Prototype',
    'Imane Modèle',
    'Adam Placebo',
    'Ilyas Cobaye',
    'Aya Exemple',
    'Amine Test',
    'Alice Démo',
    'Élodie Réplique',
    'émilie Démo',
    'Ugo Essai',
    'Ève Démo',
    'Èva Démo',
    'Îsa Démo',
    'Ôscar Démo',
    'Ûrsula Démo',
    'Àdam Démo',
    'Ägnès Démo',
    'anas figurant',
  ])('elides before a vowel: %s', (name) => {
    expect(ofName(name)).toBe(`d'${name}`)
  })

  it.each([
    'Sara Démo',
    'Hamza Fantôme',
    'Hanane Maquette',
    'Yasmine Simulé',
    'Youssef Exemple',
    'Karim Essai',
    'hamza fantôme',
    'yasmine simulé',
  ])('keeps « de » before a consonant, h or y: %s', (name) => {
    expect(ofName(name)).toBe(`de ${name}`)
  })

  it.each(['7 Sara', '😀 Sara', '« Sara »', '"Anas"', "'Anas"])(
    'keeps « de » before something other than a letter: %s',
    (name) => {
      expect(ofName(name)).toBe(`de ${name}`)
    },
  )

  it('keeps « de » for an empty or missing name', () => {
    expect(ofName('')).toBe('de')
    expect(ofName('   ')).toBe('de')
    expect(ofName(undefined)).toBe('de')
  })

  it('trims surrounding spaces', () => {
    expect(ofName('  Anas Figurant ')).toBe("d'Anas Figurant")
    expect(ofName('  Sara Démo ')).toBe('de Sara Démo')
  })

  it('uses a straight apostrophe with no space after it', () => {
    expect(ofName('Omar Prototype')).toBe("d'Omar Prototype")
  })
})
