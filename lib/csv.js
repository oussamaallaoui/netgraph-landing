// Minimal RFC 4180 CSV parser (#5). Pure, no dependencies, runs in the browser.
//
// Handles: quoted fields, "" escapes inside quotes, commas and newlines inside
// quotes, CRLF / LF / lone CR line endings, and a leading UTF-8 BOM.
// Lenient on malformed input (it never throws): a quote inside an unquoted field
// is kept as a literal character, text after a closing quote is appended to the
// field, and an unterminated quoted field runs to the end of the text.

const BOM = '\uFEFF'

/**
 * Parse CSV text into rows of fields.
 *
 * - Empty input (or only a BOM) gives [].
 * - A trailing line break does not create an extra empty row.
 * - An empty line in the middle gives a row with one empty field: [''].
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  if (typeof text !== 'string' || text.length === 0) return []
  let s = text.charCodeAt(0) === 0xfeff ? text.slice(BOM.length) : text
  if (s.length === 0) return []

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = s.length

  while (i < n) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      // Copy a run of ordinary characters at once (fast path for long fields).
      const next = s.indexOf('"', i)
      const end = next === -1 ? n : next
      field += s.slice(i, end)
      i = end
      continue
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true
      i += 1
    } else if (ch === ',') {
      row.push(field)
      field = ''
      i += 1
    } else if (ch === '\r' || ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += ch === '\r' && s[i + 1] === '\n' ? 2 : 1
    } else {
      field += ch
      i += 1
    }
  }

  // Last row, unless the text ended with a line break.
  const last = s[n - 1]
  if (inQuotes || field.length > 0 || row.length > 0 || (last !== '\n' && last !== '\r')) {
    row.push(field)
    rows.push(row)
  }
  return rows
}
