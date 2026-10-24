'use client'
import { useState, useEffect, useRef } from 'react'

// ── Données ──────────────────────────────────────────────────────

// Votre réseau : vous, vos contacts (1er degré) et leurs contacts (2e degré)
const ME = { id: 'me', x: 110, y: 210, label: 'Vous' }

const NODES = [
  { id: 'sara',   x: 300, y: 100, label: 'Sara',   org: 'McKinsey',    degree: 1 },
  { id: 'amine',  x: 290, y: 215, label: 'Amine',  org: 'CIH Bank',    degree: 1 },
  { id: 'nadia',  x: 300, y: 330, label: 'Nadia',  org: 'Deloitte',    degree: 1 },
  { id: 'jerome', x: 520, y: 80,  label: 'Jérôme', org: 'BMCE Cap.',   degree: 2 },
  { id: 'youssef',x: 620, y: 170, label: 'Youssef',org: 'Attijari',    degree: 2 },
  { id: 'karim',  x: 500, y: 240, label: 'Karim',  org: 'OCP Group',   degree: 2 },
  { id: 'hanane', x: 530, y: 350, label: 'Hanane', org: 'Finance Is.', degree: 2 },
]

const EDGES = [
  ['me', 'sara'], ['me', 'amine'], ['me', 'nadia'],
  ['sara', 'jerome'], ['sara', 'youssef'], ['amine', 'karim'],
  ['amine', 'youssef'], ['nadia', 'hanane'], ['nadia', 'karim'],
]

// Chaque demande : le chemin trouvé, et pourquoi c'est la bonne personne
const REQUESTS = [
  {
    query: 'Trouver ma prochaine mission de conseil en finance',
    path: ['me', 'sara', 'jerome'],
    who: 'Jérôme D.', role: 'Directeur, BMCE Capital',
    why: 'Lance un appel d\'offres conseil ce trimestre',
    via: 'Sara peut vous présenter — vous échangez chaque semaine',
  },
  {
    query: 'Être présenté à quelqu\'un chez OCP',
    path: ['me', 'amine', 'karim'],
    who: 'Karim B.', role: 'Responsable achats, OCP Group',
    why: 'Travaille avec des cabinets de conseil',
    via: 'Amine peut vous présenter — ancien collègue de Karim',
  },
  {
    query: 'Lever des fonds pour ma startup',
    path: ['me', 'nadia', 'hanane'],
    who: 'Hanane E.', role: 'Partner, Finance Is.',
    why: 'Investit en amorçage dans la fintech',
    via: 'Nadia peut vous présenter — vous vous parlez chaque mois',
  },
]

const RESULTS = [
  { initials: 'JD', name: 'Jérôme D.', role: 'Directeur, BMCE Capital', path: 'via Sara · 2e degré',  score: 86 },
  { initials: 'NT', name: 'Nadia T.',  role: 'Senior Manager, Deloitte', path: 'Contact direct · 1er degré', score: 74 },
  { initials: 'YA', name: 'Youssef A.',role: 'Head of Strategy, Attijariwafa', path: 'via Sara ou Amine · 2e degré', score: 61 },
]

const TESTIMONIALS = [
  { name: 'Sara B.', role: 'Associée, McKinsey Maroc', text: 'En 20 minutes j\'ai identifié 3 introductions que j\'aurais mis des mois à faire autrement.' },
  { name: 'Amine K.', role: 'Dir. Corporate Finance, CIH Bank', text: 'La relation cachée entre deux de mes contacts a abouti sur un mandat. Je n\'aurais jamais fait le lien.' },
  { name: 'Nadia T.', role: 'Senior Manager, Deloitte', text: 'L\'équipe utilise NetGraph chaque semaine pour le BD. Le ROI est immédiat.' },
]

// ── Composants ───────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = e => setReduced(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

function nodeById(id) {
  return id === 'me' ? ME : NODES.find(n => n.id === id)
}

function onPath(path, a, b) {
  for (let i = 0; i < path.length - 1; i++) {
    if ((path[i] === a && path[i + 1] === b) || (path[i] === b && path[i + 1] === a)) return i
  }
  return -1
}

function RequestGraph() {
  const reduced = usePrefersReducedMotion()
  const [r, setR]         = useState(0)   // demande affichée
  const [typed, setTyped] = useState(0)   // caractères tapés
  const [lit, setLit]     = useState(0)   // arêtes du chemin allumées

  const req = REQUESTS[r]

  useEffect(() => {
    const timers = []
    const len = req.query.length
    if (reduced) {
      setTyped(len); setLit(req.path.length - 1)
    } else {
      setTyped(0); setLit(0)
      for (let i = 1; i <= len; i++) timers.push(setTimeout(() => setTyped(i), i * 28))
      const done = len * 28
      for (let k = 1; k < req.path.length; k++) timers.push(setTimeout(() => setLit(k), done + 300 + k * 450))
    }
    timers.push(setTimeout(() => setR(x => (x + 1) % REQUESTS.length), reduced ? 6000 : len * 28 + 4200))
    return () => timers.forEach(clearTimeout)
  }, [r, reduced])

  const found = lit >= req.path.length - 1
  const target = req.path[req.path.length - 1]

  return (
    <div>
      {/* Barre de demande */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="#5A5A6E" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="#5A5A6E" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-sm text-ink flex-1 min-w-0 truncate" aria-live="polite">
            {req.query.slice(0, typed)}
            {typed < req.query.length && <span className="inline-block w-px h-4 bg-violet align-middle ml-px animate-pulse"/>}
          </span>
          <span className="hidden sm:inline text-xs text-slate whitespace-nowrap">3 sources · 412 contacts</span>
        </div>
      </div>

      {/* Graphe */}
      <div className="relative w-full" style={{ height: 380 }}>
        <svg width="100%" height="100%" viewBox="0 0 720 420" preserveAspectRatio="xMidYMid meet"
          role="img" aria-label={`Chemin trouvé : ${req.path.map(id => nodeById(id).label).join(' → ')}`}>
          {EDGES.map(([a, b], i) => {
            const A = nodeById(a), B = nodeById(b)
            const k = onPath(req.path, a, b)
            const on = k !== -1 && k < lit
            const second = A.degree === 2 || B.degree === 2
            return (
              <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke={on ? '#4B3FCC' : '#D1D5DB'}
                strokeWidth={on ? 2.5 : 1}
                strokeDasharray={on ? '0' : (second ? '4 4' : '0')}
                opacity={on ? 1 : 0.6}
                style={{ transition: 'all .4s ease' }} />
            )
          })}

          {/* Vous */}
          <g>
            <circle cx={ME.x} cy={ME.y} r={32} fill="#0E0E0E" />
            <text x={ME.x} y={ME.y + 4} textAnchor="middle" fontSize={12} fontWeight={600}
              fill="#fff" fontFamily="Inter, sans-serif">Vous</text>
          </g>

          {NODES.map(n => {
            const idx = req.path.indexOf(n.id)
            const reached = idx > 0 && idx <= lit
            const isTarget = n.id === target && found
            const fill   = isTarget ? '#4B3FCC' : reached ? '#EAE8FA' : '#F3F4F6'
            const stroke = isTarget || reached ? '#4B3FCC' : '#D1D5DB'
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={isTarget ? 34 : 30}
                  fill={fill} stroke={stroke} strokeWidth={reached || isTarget ? 2 : 1}
                  strokeDasharray={n.degree === 2 && !reached ? '3 3' : '0'}
                  style={{ transition: 'all .4s ease' }} />
                <text x={n.x} y={n.y - 4} textAnchor="middle" fontSize={12} fontWeight={600}
                  fill={isTarget ? '#fff' : reached ? '#4B3FCC' : '#374151'}
                  fontFamily="Inter, sans-serif" style={{ transition: 'fill .4s ease' }}>
                  {n.label}
                </text>
                <text x={n.x} y={n.y + 11} textAnchor="middle" fontSize={9}
                  fill={isTarget ? 'rgba(255,255,255,.85)' : '#6B7280'}
                  fontFamily="Inter, sans-serif" style={{ transition: 'fill .4s ease' }}>
                  {n.org}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Légende */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-4 flex-wrap justify-center text-xs text-slate">
          <span className="flex items-center gap-1.5"><span className="w-5 h-px bg-gray-300"/>Vos contacts</span>
          <span className="flex items-center gap-1.5"><span className="w-5 border-t border-dashed border-gray-400"/>Leurs contacts</span>
          <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 rounded-full bg-violet"/>Chemin trouvé</span>
        </div>
      </div>

      {/* Résultat */}
      <div className="px-5 pb-5">
        <div className={`flex items-start gap-3 p-4 rounded-2xl bg-mist transition-opacity duration-300 ${found ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={!found}>
          <div className="w-10 h-10 rounded-xl bg-violet text-white text-sm font-semibold flex items-center justify-center flex-shrink-0">
            {req.who.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-ink"><span className="font-semibold">{req.who}</span> · {req.role}</p>
            <p className="text-xs text-slate mt-0.5">{req.why}</p>
            <p className="text-xs text-violet font-medium mt-1.5">{req.via}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ score, color }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { setTimeout(() => setWidth(score), 200) }, [score])
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, background: color }} />
    </div>
  )
}

function AgentCard() {
  const [sent, setSent] = useState(false)
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
        <span className="text-xs text-slate">Agent NetGraph · suggestion du jour</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet">
          <span className="w-1.5 h-1.5 rounded-full bg-signal"/>Brouillon
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-light text-violet text-sm font-semibold flex items-center justify-center flex-shrink-0">SB</div>
          <div className="min-w-0">
            <p className="text-sm text-ink"><span className="font-semibold">Sara B.</span> · Associée, McKinsey Maroc</p>
            <p className="text-xs text-slate mt-0.5">
              Vous échangez tous les 10 jours en moyenne. Dernier message il y a 5 semaines.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-mist p-4 text-sm text-ink leading-relaxed">
          Bonjour Sara, j'espère que tout va bien depuis notre dernier échange !
          Je cherche une mission de conseil en finance et j'ai vu que tu travailles
          avec Jérôme chez BMCE Capital. Accepterais-tu de nous mettre en relation ?
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => setSent(true)} disabled={sent}
            className="flex-1 px-6 py-3 rounded-xl bg-violet text-white text-sm font-medium
              hover:bg-violet-dark transition-colors disabled:opacity-60">
            {sent ? 'Ouvert dans WhatsApp ✓' : 'Envoyer sur WhatsApp →'}
          </button>
          <button type="button"
            className="px-6 py-3 rounded-xl border border-gray-200 bg-white text-ink text-sm font-medium
              hover:border-gray-300 transition-colors">
            Modifier
          </button>
        </div>
      </div>
    </div>
  )
}

const STEP_ICONS = {
  import: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v9M6 8l4 4 4-4M4 15h12" stroke="#4B3FCC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ask: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="#4B3FCC" strokeWidth="1.5"/>
      <path d="M13 13l4 4" stroke="#4B3FCC" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  agent: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 5h12v8H9l-3 3v-3H4z" stroke="#4B3FCC" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
}

function SubscribeForm() {
  const [step, setStep]     = useState('email')  // email | details | success | error
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole]     = useState('')
  const [loading, setLoading] = useState(false)
  const [count, setCount]   = useState(47)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleEmail(e) {
    e.preventDefault()
    if (!email.includes('@')) return
    setStep('details')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, company, role }),
      })
      const data = await res.json()
      if (res.ok) {
        setCount(data.total)
        setStep('success')
      } else if (res.status === 409) {
        setStep('already')
      } else {
        setStep('error')
      }
    } catch {
      setStep('error')
    }
    setLoading(false)
  }

  if (step === 'success') return (
    <div className="text-center py-6 animate-fade-up">
      <div className="w-14 h-14 rounded-2xl bg-signal/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">✓</span>
      </div>
      <p className="font-semibold text-ink text-lg mb-1">Vous êtes sur la liste !</p>
      <p className="text-slate text-sm">
        Vous faites partie des <strong>{count} premiers</strong> à rejoindre NetGraph.
        On vous contacte en priorité pour l'accès beta.
      </p>
    </div>
  )

  if (step === 'already') return (
    <div className="text-center py-6">
      <p className="text-slate text-sm">Cet email est déjà inscrit. On vous recontacte bientôt.</p>
    </div>
  )

  if (step === 'error') return (
    <div className="text-center py-4">
      <p className="text-red-500 text-sm mb-3">Une erreur s'est produite. Réessayez.</p>
      <button onClick={() => setStep('email')}
        className="text-violet text-sm underline">Réessayer</button>
    </div>
  )

  if (step === 'email') return (
    <form onSubmit={handleEmail} className="flex flex-col sm:flex-row gap-3">
      <input ref={inputRef} type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="votre@email.com" required
        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
          text-ink placeholder:text-gray-400 focus:border-violet transition-colors" />
      <button type="submit"
        className="px-6 py-3 rounded-xl bg-violet text-white text-sm font-medium
          hover:bg-violet-dark transition-colors whitespace-nowrap">
        Rejoindre la beta →
      </button>
    </form>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 animate-fade-up">
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Prénom et nom" required
          className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
            text-ink placeholder:text-gray-400 focus:border-violet transition-colors col-span-2" />
        <input type="text" value={company} onChange={e => setCompany(e.target.value)}
          placeholder="Entreprise" required
          className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
            text-ink placeholder:text-gray-400 focus:border-violet transition-colors" />
        <select value={role} onChange={e => setRole(e.target.value)} required
          className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
            text-ink focus:border-violet transition-colors">
          <option value="">Votre rôle</option>
          <option>Direction / C-level</option>
          <option>Business Development</option>
          <option>Conseil / Consulting</option>
          <option>Finance / Investissement</option>
          <option>Commercial / Vente</option>
          <option>Autre</option>
        </select>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-xl bg-violet text-white text-sm font-medium
          hover:bg-violet-dark transition-colors disabled:opacity-60">
        {loading ? 'Inscription…' : 'Confirmer mon inscription →'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Accès beta gratuit · Aucune carte requise · Invitation dans les 7 jours
      </p>
    </form>
  )
}

// ── Page principale ───────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* ── Nav ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200
        ${scrolled ? 'bg-white/90 backdrop-blur border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="6"  r="3" fill="#4B3FCC"/>
              <circle cx="4"  cy="17" r="3" fill="#4B3FCC" opacity=".6"/>
              <circle cx="18" cy="17" r="3" fill="#4B3FCC" opacity=".6"/>
              <line x1="11" y1="9" x2="4"  y2="14" stroke="#4B3FCC" strokeWidth="1.5" opacity=".5"/>
              <line x1="11" y1="9" x2="18" y2="14" stroke="#4B3FCC" strokeWidth="1.5" opacity=".5"/>
              <line x1="4"  y1="17" x2="18" y2="17" stroke="#4B3FCC" strokeWidth="1.5" opacity=".3"/>
            </svg>
            <span className="font-semibold text-ink tracking-tight">NetGraph</span>
          </div>
          <a href="#beta"
            className="px-4 py-1.5 rounded-lg bg-violet text-white text-sm font-medium
              hover:bg-violet-dark transition-colors">
            Accès beta
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
            bg-violet-light text-violet text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-signal"></span>
            47 professionnels déjà inscrits · Accès beta ouvert
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold text-ink leading-[1.12] tracking-tight mb-6">
            Votre réseau a plus de valeur<br className="hidden sm:block"/>
            <span className="text-violet"> que vous ne le pensez.</span>
          </h1>

          <p className="text-lg text-slate leading-relaxed max-w-xl mx-auto mb-10">
            Dites à NetGraph ce que vous cherchez. Il trouve, parmi vos contacts
            et les contacts de vos contacts, les personnes qui peuvent vous aider —
            et qui peut vous les présenter.
          </p>

          {/* CTA principal */}
          <div className="max-w-md mx-auto mb-6">
            <a href="#beta"
              className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl
                bg-violet text-white font-medium text-base hover:bg-violet-dark
                transition-all hover:shadow-lg hover:shadow-violet/20">
              Rejoindre la beta gratuite
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <p className="text-xs text-gray-400 mt-2">Gratuit · Aucune carte requise · Accès en 7 jours</p>
          </div>

          {/* Sources */}
          <div className="flex items-center justify-center gap-6 text-sm text-slate flex-wrap">
            {['Téléphone', 'LinkedIn', 'Instagram', 'Excel'].map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gray-300"/>
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Démo : une demande, un chemin ── */}
      <section className="py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200"/>
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200"/>
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200"/>
              </div>
              <span className="text-xs text-gray-400 ml-2">Nouvelle demande</span>
            </div>
            <RequestGraph />
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            Exemple de démonstration — noms et entreprises fictifs
          </p>
        </div>
      </section>

      {/* ── Problème ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-ink mb-5 leading-snug">
            La bonne personne est souvent à deux contacts de vous.
          </h2>
          <p className="text-slate text-base leading-relaxed">
            Votre prochaine mission, votre prochain client ou votre prochain investisseur
            connaît quelqu'un que vous connaissez. Le problème, c'est de savoir qui —
            et d'oser demander. NetGraph trouve le chemin et prépare la demande.
          </p>
        </div>
      </section>

      {/* ── Résultats d'une demande ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-ink mb-3">
              Une demande, les bonnes personnes, classées
            </h2>
            <p className="text-slate text-sm">
              « Trouver ma prochaine mission de conseil en finance » — chaque piste reçoit un score
              selon la force de vos liens sur le chemin
            </p>
          </div>

          <div className="space-y-3">
            {RESULTS.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100
                hover:border-gray-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-light text-violet text-sm font-semibold
                  flex items-center justify-center flex-shrink-0">
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-0.5">
                    <span className="font-medium text-ink text-sm truncate">{p.name} · <span className="font-normal text-slate">{p.role}</span></span>
                    <span className="text-xs font-semibold text-violet whitespace-nowrap">{p.score}/100</span>
                  </div>
                  <p className="text-xs text-slate">{p.path}</p>
                  <ScoreBar score={p.score} color="#4B3FCC" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-ink text-center mb-12">
            De votre besoin à la bonne introduction en 3 étapes
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                n: '01', icon: STEP_ICONS.import,
                title: 'Importez vos contacts',
                desc: 'Téléphone, LinkedIn, Instagram ou Excel. Les doublons se fusionnent automatiquement.',
              },
              {
                n: '02', icon: STEP_ICONS.ask,
                title: 'Dites ce que vous cherchez',
                desc: 'Une mission, un client, un investisseur, une intro. NetGraph trouve qui peut vous aider, même à deux contacts de vous.',
              },
              {
                n: '03', icon: STEP_ICONS.agent,
                title: 'Votre agent ouvre la conversation',
                desc: 'Il choisit la personne la plus proche du chemin et le bon moment, et prépare le message. Vous l\'envoyez en un clic.',
              },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-xs font-medium text-violet/50 mb-3">{step.n}</div>
                <div className="w-10 h-10 rounded-xl bg-violet-light flex items-center justify-center mb-3">{step.icon}</div>
                <h3 className="font-semibold text-ink text-sm mb-2">{step.title}</h3>
                <p className="text-slate text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agent ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-semibold text-ink mb-4 leading-snug">
              Votre agent relance au bon moment.
            </h2>
            <p className="text-slate text-sm leading-relaxed mb-5">
              NetGraph connaît le rythme de vos échanges avec chaque contact. Quand une relation
              refroidit, ou quand quelqu'un est sur le chemin d'une de vos demandes, l'agent vous
              propose de reprendre contact — avec un message écrit dans votre ton.
            </p>
            <ul className="space-y-2 text-sm text-slate">
              {[
                'Priorise selon la fréquence de vos échanges',
                'Prépare le message, vous gardez la main',
                'Rien n\'est envoyé sans votre accord',
              ].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-1 flex-shrink-0">
                    <path d="M2 6l3 3 5-5" stroke="#4B3FCC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <AgentCard />
        </div>
      </section>

      {/* ── Témoignages ── */}
      <section className="py-16 px-6 bg-mist">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-ink text-center mb-10">
            Ce que disent les premiers utilisateurs
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-white/50">
                <p className="text-sm text-slate leading-relaxed mb-4 italic">
                  "{t.text}"
                </p>
                <div>
                  <p className="font-medium text-ink text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section capture ── */}
      <section id="beta" className="py-24 px-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
              bg-signal/10 text-signal text-xs font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse"/>
              Beta ouverte — accès gratuit pendant 3 mois
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink mb-3">
              Rejoignez les premiers
            </h2>
            <p className="text-slate text-sm leading-relaxed">
              Les 100 premiers inscrits ont accès gratuitement pendant 3 mois,
              avec un onboarding personnalisé sur leurs propres données.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <SubscribeForm />
          </div>

          {/* Garanties */}
          <div className="flex items-center justify-center gap-x-6 gap-y-2 flex-wrap mt-6 text-xs text-gray-400">
            {['Aucune carte requise', 'Données 100% privées', 'Aucun message sans votre accord'].map(g => (
              <span key={g} className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#00C37A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="6"  r="3" fill="#4B3FCC"/>
              <circle cx="4"  cy="17" r="3" fill="#4B3FCC" opacity=".5"/>
              <circle cx="18" cy="17" r="3" fill="#4B3FCC" opacity=".5"/>
              <line x1="11" y1="9" x2="4"  y2="14" stroke="#4B3FCC" strokeWidth="1.5" opacity=".4"/>
              <line x1="11" y1="9" x2="18" y2="14" stroke="#4B3FCC" strokeWidth="1.5" opacity=".4"/>
            </svg>
            <span className="text-sm text-slate">NetGraph © 2025</span>
          </div>
          <p className="text-xs text-gray-400">
            Casablanca, Maroc · contact@netgraph.app
          </p>
        </div>
      </footer>

    </div>
  )
}
