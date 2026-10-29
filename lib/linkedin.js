// TEMP stub — replaced by dev-backend's PR (feat/5-import-linkedin-lib).
// Same contract as issue #5: parseLinkedInCsv(text) → { contacts, errors, skipped }.
// Deliberately naive (no full RFC 4180, no French aliases, no URL/email validation):
// it only exists so the UI builds and can be checked in the browser.

/** @typedef {import('./types.js').ParseResult} ParseResult */

function splitLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

/** @param {string} text @returns {ParseResult} */
export function parseLinkedInCsv(text) {
  const clean = String(text || '').replace(/^﻿/, '')
  if (!clean.trim()) return { contacts: [], errors: [{ code: 'EMPTY_FILE' }], skipped: 0 }
  const lines = clean.split(/\r?\n/)
  const headerAt = lines.slice(0, 20).findIndex(l => {
    const h = splitLine(l).map(s => s.toLowerCase())
    return ['first name', 'last name', 'company', 'position'].every(k => h.includes(k))
  })
  if (headerAt === -1) return { contacts: [], errors: [{ code: 'NOT_LINKEDIN_EXPORT' }], skipped: 0 }
  const header = splitLine(lines[headerAt]).map(s => s.toLowerCase())
  const col = name => header.indexOf(name)
  const rows = lines.slice(headerAt + 1).filter(l => l.trim())
  if (rows.length > 30000) return { contacts: [], errors: [{ code: 'TOO_MANY_ROWS' }], skipped: 0 }
  const contacts = []
  let skipped = 0
  rows.forEach((line, i) => {
    const c = splitLine(line)
    const get = name => (col(name) >= 0 && c[col(name)]) || null
    const firstName = get('first name') || ''
    const lastName = get('last name') || ''
    if (!firstName && !lastName) { skipped++; return }
    contacts.push({
      id: `li-stub-${i}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      company: get('company'),
      position: get('position'),
      connectedOn: null,
      profileUrl: null,
      email: null,
      phone: null,
      sources: ['linkedin'],
    })
  })
  if (contacts.length === 0) return { contacts: [], errors: [{ code: 'NO_CONTACTS' }], skipped }
  return { contacts, errors: [], skipped }
}
