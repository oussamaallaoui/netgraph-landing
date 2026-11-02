// Copy text to the clipboard from a click handler (#8 F4). The Clipboard API needs a secure
// context and a user gesture; when it is missing or refuses, a hidden textarea and
// document.execCommand('copy') are tried. Resolves true when the text was copied.
// Nothing is logged and nothing leaves the device.

/**
 * @param {string} text
 * @param {{ navigator?: Navigator, document?: Document }} [env]  injectable for tests
 * @returns {Promise<boolean>}
 */
export async function copyText(text, env = {}) {
  const nav = env.navigator ?? (typeof navigator !== 'undefined' ? navigator : undefined)
  const doc = env.document ?? (typeof document !== 'undefined' ? document : undefined)
  if (typeof text !== 'string') return false

  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text)
      return true
    } catch {
      // Refused (permissions, insecure context): try the fallback below.
    }
  }
  return legacyCopy(text, doc)
}

/** @param {string} text @param {Document|undefined} doc */
function legacyCopy(text, doc) {
  if (!doc?.body || typeof doc.execCommand !== 'function') return false
  const active = doc.activeElement
  const area = doc.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.setAttribute('aria-hidden', 'true')
  area.tabIndex = -1
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '0'
  area.style.opacity = '0'
  area.style.pointerEvents = 'none'
  doc.body.appendChild(area)
  let ok = false
  try {
    area.select()
    ok = doc.execCommand('copy') === true
  } catch {
    ok = false
  } finally {
    area.remove()
    if (active && typeof active.focus === 'function') active.focus()
  }
  return ok
}
