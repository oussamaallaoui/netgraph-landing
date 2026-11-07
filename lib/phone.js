// Phone numbers from imported contacts (#9) → E.164, Morocco by default.
// Pure, never throws, no logging. Contract: « Découpage tech lead Sprint 3 (2026-11-07) » on issue #9,
// section « normalizePhone ». No libphonenumber-js on purpose (≈145 KB of metadata for these rules).
//
// Accepted ambiguity: a French number saved in local form (« 06 12 34 56 78 » without +33) reads as
// Moroccan. Numbers saved with +33 or 0033 are correct.

/** Separators we ignore: every Unicode space (incl. U+00A0 and U+202F), . - / ( ) */
const SEPARATORS = /[\s.\-/()]/g
const DIGITS_WITH_OPTIONAL_PLUS = /^\+?\d+$/

const MA_E164 = /^\+212[5-7]\d{8}$/
const MA_TRUNK_ZERO = /^\+2120(\d{9})$/          // « +212 (0)6 12 34 56 78 »
const MA_LOCAL = /^0([5-7]\d{8})$/                // 06…, 07… mobile, 05… fixed (10 digits)
const MA_NO_PLUS = /^212[5-7]\d{8}$/              // 212612345678
const E164 = /^\+[1-9]\d{7,14}$/                  // + then 8 to 15 digits, first digit 1–9

/**
 * Normalise a phone number as written in an address book to E.164, or null if it can't be read.
 *
 * 1. Not a string, or empty → null. A leading `tel:` (vCard 4.0 `VALUE=uri`) is dropped.
 * 2. Spaces (any Unicode space), `.`, `-`, `/`, `(` and `)` are removed.
 * 3. What remains must be `+?` then digits only (letters, `*`, `#`, extensions → null).
 * 4. A leading `00` becomes `+`.
 * 5. Morocco: `+212 (0)…` drops the `0`; `0[5-7]` + 8 digits → `+212…`; `212[5-7]` + 8 digits → `+212…`;
 *    anything else starting with `+212` → null.
 * 6. Other countries: `+`, first digit 1–9, 8 to 15 digits in total → kept as is.
 * 7. Anything else → null (9 bare digits, `08…`, short codes…).
 *
 * @param {string} raw
 * @param {'MA'} [defaultCountry]  only 'MA' is supported; with any other value, local numbers → null
 * @returns {string|null}          e.g. '+212612345678'
 */
export function normalizePhone(raw, defaultCountry = 'MA') {
  if (typeof raw !== 'string') return null
  let s = raw.trim().replace(/^tel:/i, '').replace(SEPARATORS, '')
  if (!s || !DIGITS_WITH_OPTIONAL_PLUS.test(s)) return null

  if (s.startsWith('00')) s = '+' + s.slice(2)

  const trunk = MA_TRUNK_ZERO.exec(s)
  if (trunk) s = '+212' + trunk[1]

  if (defaultCountry === 'MA') {
    const local = MA_LOCAL.exec(s)
    if (local) return '+212' + local[1]
  }
  if (MA_NO_PLUS.test(s)) return '+' + s

  if (s.startsWith('+212')) return MA_E164.test(s) ? s : null
  return E164.test(s) ? s : null
}
