import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), 'subscribers.json')

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) }
  catch { return [] }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

export async function POST(req) {
  const { email, name, company, role } = await req.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const list = load()

  if (list.find(s => s.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: 'Déjà inscrit' }, { status: 409 })
  }

  list.push({
    email: email.toLowerCase().trim(),
    name:    name    || '',
    company: company || '',
    role:    role    || '',
    date: new Date().toISOString(),
    source: 'landing',
  })

  save(list)

  console.log(`✅ Nouvel inscrit : ${email} (${list.length} total)`)

  return NextResponse.json({ success: true, total: list.length })
}

export async function GET() {
  // Endpoint admin simple — protéger en prod avec un token
  const list = load()
  return NextResponse.json({ total: list.length, subscribers: list })
}
