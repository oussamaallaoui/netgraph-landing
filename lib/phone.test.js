import { describe, it, expect } from 'vitest'
import { normalizePhone } from './phone.js'

// Invented numbers only (PO §8 on #9): never dial or open them on a real phone.

describe('normalizePhone: Moroccan numbers (default country)', () => {
  it.each([
    ['06 12 34 56 78', '+212612345678'],
    ['07-12-34-56-78', '+212712345678'],
    ['0522123456', '+212522123456'],
    ['06.12.34.56.78', '+212612345678'],
    ['(06) 12/34/56/78', '+212612345678'],
    ['+212 6 12 34 56 78', '+212612345678'],
    ['+212 (0)6 12 34 56 78', '+212612345678'],
    ['00212612345678', '+212612345678'],
    ['00 212 6 12 34 56 78', '+212612345678'],
    ['212612345678', '+212612345678'],
    ['tel:+212612345678', '+212612345678'],
    ['TEL:0612345678', '+212612345678'],
    ['  06 12 34 56 78  ', '+212612345678'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected)
    expect(normalizePhone(raw, 'MA')).toBe(expected)
  })

  it('ignores no-break spaces (U+00A0) and narrow no-break spaces (U+202F)', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('+212612345678')
    expect(normalizePhone('+212 6 12 34 56 78')).toBe('+212612345678')
  })

  it.each([
    ['0812345678'],          // 08… is not a Moroccan mobile or fixed line
    ['612345678'],           // 9 bare digits
    ['+2126123'],            // +212 but too short
    ['+21261234567890'],     // +212 but too long
    ['+212812345678'],       // +212 then 8
    ['+212 (0)8 12 34 56 78'],
    ['061234567'],           // 9 digits starting with 0
    ['06123456789'],         // 11 digits starting with 0
    ['2126123456789'],       // 212 + 10 digits, no +
  ])('%s → null', (raw) => {
    expect(normalizePhone(raw)).toBeNull()
  })
})

describe('normalizePhone: other countries', () => {
  it.each([
    ['+33 6 12 34 56 78', '+33612345678'],
    ['0033612345678', '+33612345678'],
    ['+1 (415) 555-0100', '+14155550100'],
    ['+44 20 7946 0000', '+442079460000'],
    ['+123456789012345', '+123456789012345'], // 15 digits
    ['+12345678', '+12345678'],               // 8 digits
  ])('%s → %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected)
  })

  it.each([
    ['+1234567'],            // 7 digits
    ['+1234567890123456'],   // 16 digits
    ['+0612345678'],         // first digit 0
    ['33612345678'],         // international without + or 00
    ['000612345678'],        // 00 then 0
  ])('%s → null', (raw) => {
    expect(normalizePhone(raw)).toBeNull()
  })
})

describe('normalizePhone: invalid input', () => {
  it.each([
    ['06 12 34 56 78 p123'],   // pause / extension
    ['06 12 34 56 78 x12'],
    ['+212612345678;ext=12'],
    ['0612345678,1'],
    ['0612345678w'],
    ['*123#'],
    ['#06 12 34 56 78'],
    ['06 12 AB 56 78'],
    ['++212612345678'],
    ['06+12345678'],
    ['tel:'],
    ['12345'],
    [''],
    ['   '],
  ])('%j → null', (raw) => {
    expect(normalizePhone(raw)).toBeNull()
  })

  it('returns null for non-strings and never throws', () => {
    for (const raw of [null, undefined, 612345678, {}, [], true, Symbol('x')]) {
      expect(() => normalizePhone(raw)).not.toThrow()
      expect(normalizePhone(raw)).toBeNull()
    }
  })

  it('reads local numbers only with the Moroccan default', () => {
    expect(normalizePhone('0612345678', 'FR')).toBeNull()
    expect(normalizePhone('+212612345678', 'FR')).toBe('+212612345678')
    expect(normalizePhone('+33612345678', 'FR')).toBe('+33612345678')
  })
})
