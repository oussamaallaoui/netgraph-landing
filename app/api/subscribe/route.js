import { NextResponse } from 'next/server'
import { validateSignup, MAX_BODY_BYTES } from '../../../lib/subscribe.js'
import { getRedis } from '../../../lib/redis.js'
import { addSignup, errorCategory } from '../../../lib/signups.js'

// Beta signup (#10, #11). POST only: there is no GET handler, so Next.js answers 405 to
// GET/HEAD/PUT/… and nobody can read the list through the API.
//
// Signups are stored in Upstash Redis (ADR 0003), one key per address, with SET NX. A new
// address and one already signed up get the same status, headers and body, so nobody can learn
// whether a given person signed up. Nothing about a subscriber is ever logged: a storage failure
// logs one fixed line with a category from a closed list, never the error or its message.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const invalidRequest = () => NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

async function readJson(req) {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return { ok: false }

  let text
  try {
    text = await req.text()
  } catch {
    return { ok: false }
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) return { ok: false }

  try {
    return { ok: true, body: JSON.parse(text) }
  } catch {
    // Never pass the parse error on: its message quotes part of the body.
    return { ok: false }
  }
}

export async function POST(req) {
  const parsed = await readJson(req)
  if (!parsed.ok) return invalidRequest()

  const result = validateSignup(parsed.body)
  if (!result.ok) {
    return result.error === 'INVALID_EMAIL'
      ? NextResponse.json({ error: 'Email invalide' }, { status: 400 })
      : invalidRequest()
  }

  try {
    // Missing env vars throw in getRedis(): same clean 500 as a storage failure.
    // The result ({ created }) is deliberately ignored: same answer either way.
    await addSignup(getRedis(), result.value)
  } catch (err) {
    console.error('subscribe: save failed', errorCategory(err))
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
