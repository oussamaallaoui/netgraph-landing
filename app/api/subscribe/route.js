import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { validateSignup, MAX_BODY_BYTES } from '../../../lib/subscribe.js'

// Beta signup (#10). POST only: there is no GET handler, so Next.js answers 405 to GET/HEAD/PUT/…
// and nobody can read the list through the API. Nothing about a subscriber is ever logged.
// Storage is still a local file, which fails on Vercel's read-only filesystem (#11).

const FILE = path.join(process.cwd(), 'subscribers.json')

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

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
  const { email, name, company, role } = result.value

  const list = load()

  if (list.some(s => typeof s?.email === 'string' && s.email.toLowerCase() === email)) {
    return NextResponse.json({ error: 'Déjà inscrit' }, { status: 409 })
  }

  list.push({ email, name, company, role, date: new Date().toISOString(), source: 'landing' })

  try {
    save(list)
  } catch (err) {
    // One fixed line, the error code only: never the error object, its message or the body.
    console.error('subscribe: save failed', err?.code ?? 'unknown')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ success: true, total: list.length })
}
