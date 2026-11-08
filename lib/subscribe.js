import { cleanEmail } from './linkedin.js'

/** Longest accepted email (RFC 5321 path limit). */
export const MAX_EMAIL_LENGTH = 254
/** Longest accepted name, company or role, after trimming and collapsing whitespace. */
export const MAX_FIELD_LENGTH = 100
/** Largest raw request body the route accepts, in bytes (checked by the route, before JSON.parse). */
export const MAX_BODY_BYTES = 10 * 1024

/**
 * @typedef {{ email: string, name: string, company: string, role: string }} Signup
 * @typedef {{ ok: true, value: Signup } | { ok: false, error: 'INVALID_BODY' | 'INVALID_EMAIL' }} SignupValidation
 */

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** Optional text field: undefined/null → '', non-string → undefined (invalid), too long → undefined. */
function optionalText(value) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return undefined
  const s = value.replace(/\s+/g, ' ').trim()
  return s.length > MAX_FIELD_LENGTH ? undefined : s
}

/**
 * Validates a beta signup request body (#10). Pure: never throws, never logs.
 * Unknown fields are dropped.
 *
 * @param {unknown} body  the parsed JSON body
 * @returns {SignupValidation}
 */
export function validateSignup(body) {
  if (!isPlainObject(body)) return { ok: false, error: 'INVALID_BODY' }

  const name = optionalText(body.name)
  const company = optionalText(body.company)
  const role = optionalText(body.role)
  if (name === undefined || company === undefined || role === undefined) {
    return { ok: false, error: 'INVALID_BODY' }
  }

  if (typeof body.email !== 'string') return { ok: false, error: 'INVALID_EMAIL' }
  const trimmed = body.email.trim().toLowerCase()
  if (trimmed.length > MAX_EMAIL_LENGTH) return { ok: false, error: 'INVALID_EMAIL' }
  const email = cleanEmail(trimmed)
  if (!email) return { ok: false, error: 'INVALID_EMAIL' }

  return { ok: true, value: { email, name, company, role } }
}
