'use client'
import { useState, useEffect, useRef } from 'react'

// ── Données ──────────────────────────────────────────────────────

const NODES = [
  { id: 'a', x: 200, y: 120, label: 'Amine', org: 'HEC / CIH', hot: true },
  { id: 'b', x: 420, y: 80,  label: 'Sara',  org: 'McKinsey',  hot: false },
  { id: 'c', x: 560, y: 200, label: 'Jérôme',org: 'BMCE Cap.', hot: false },
  { id: 'd', x: 380, y: 280, label: 'Nadia', org: 'Deloitte',  hot: true },
  { id: 'e', x: 160, y: 300, label: 'Karim', org: 'OCP Group', hot: false },
  { id: 'f', x: 510, y: 360, label: 'Hanane',org: 'Finance Is.',hot: true },
]

const EDGES = [
  { from: 'a', to: 'b', type: 'structure',  label: 'Structure commune' },
  { from: 'b', to: 'c', type: 'project',    label: 'Potentiel projet' },
  { from: 'd', to: 'f', type: 'project',    label: 'Potentiel projet' },
  { from: 'a', to: 'e', type: 'country',    label: 'Autres pays' },
  { from: 'c', to: 'f', type: 'service',    label: 'Autres services' },
  { from: 'b', to: 'd', type: 'structure',  label: 'Structure commune' },
]

const TYPE_COLOR = {
  structure: '#4B3FCC',
  project:   '#00C37A',
  country:   '#F59E0B',
  service:   '#EF4444',
}

const POTENTIALS = [
  { icon: '🏛', type: 'Structure commune',   example: 'Amine (HEC) ↔ Sara (HEC)', score: 91, color: '#4B3FCC', bg: '#EAE8FA' },
  { icon: '⚡', type: 'Potentiel projet',    example: 'Hanane ↔ Jérôme',          score: 84, color: '#00C37A', bg: '#E6FAF3' },
  { icon: '🏢', type: 'Autres services',     example: 'ALMT ↔ Contrôle gestion',  score: 72, color: '#F59E0B', bg: '#FEF9E7' },
  { icon: '🔀', type: 'Autres structures',   example: 'BNP ↔ Caisse d\'Épargne',  score: 68, color: '#8B5CF6', bg: '#F3EFFE' },
  { icon: '🌍', type: 'Autres pays',         example: 'Renault FR ↔ Renault MA',  score: 79, color: '#EF4444', bg: '#FEF2F2' },
]

const TESTIMONIALS = [
  { name: 'Sara B.', role: 'Associée, McKinsey Maroc', text: 'En 20 minutes j\'ai identifié 3 introductions que j\'aurais mis des mois à faire autrement.' },
  { name: 'Amine K.', role: 'Dir. Corporate Finance, CIH Bank', text: 'La relation cachée entre deux de mes contacts a abouti sur un mandat. Je n\'aurais jamais fait le lien.' },
  { name: 'Nadia T.', role: 'Senior Manager, Deloitte', text: 'L\'équipe utilise NetGraph chaque semaine pour le BD. Le ROI est immédiat.' },
]

// ── Composants ───────────────────────────────────────────────────

function GraphViz() {
  const [active, setActive] = useState(null)
  const [step, setStep]     = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % EDGES.length), 1800)
    return () => clearInterval(t)
  }, [])

  const activeEdge = EDGES[step]

  function nodePos(id) {
    const n = NODES.find(n => n.id === id)
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 }
  }

  return (
    <div className="relative w-full" style={{ height: 420 }}>
      <svg width="100%" height="100%" viewBox="0 0 720 420" preserveAspectRatio="xMidYMid meet">
        {/* Edges de fond */}
        {EDGES.map((e, i) => {
          const a = nodePos(e.from), b = nodePos(e.to)
          const isActive = i === step
          return (
            <line key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isActive ? TYPE_COLOR[e.type] : '#D1D5DB'}
              strokeWidth={isActive ? 2.5 : 1}
              strokeDasharray={isActive ? '0' : '4 4'}
              opacity={isActive ? 1 : 0.4}
              style={{ transition: 'all .4s ease' }}
            />
          )
        })}

        {/* Label arête active */}
        {(() => {
          const e = activeEdge
          const a = nodePos(e.from), b = nodePos(e.to)
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
          return (
            <g key={step} style={{ animation: 'fade-up .3s ease' }}>
              <rect x={mx - 58} y={my - 14} width={116} height={22} rx={11}
                fill={TYPE_COLOR[e.type]} opacity={.12} />
              <text x={mx} y={my + 2} textAnchor="middle"
                fontSize={10} fontWeight={500} fill={TYPE_COLOR[e.type]} fontFamily="Inter, sans-serif">
                {e.label}
              </text>
            </g>
          )
        })()}

        {/* Nodes */}
        {NODES.map(n => {
          const isLinked = activeEdge.from === n.id || activeEdge.to === n.id
          return (
            <g key={n.id} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActive(n.id)}
              onMouseLeave={() => setActive(null)}>
              <circle cx={n.x} cy={n.y} r={isLinked ? 34 : 30}
                fill={isLinked ? TYPE_COLOR[activeEdge.type] : (n.hot ? '#EAE8FA' : '#F3F4F6')}
                stroke={isLinked ? TYPE_COLOR[activeEdge.type] : (n.hot ? '#4B3FCC' : '#D1D5DB')}
                strokeWidth={isLinked ? 2 : 1}
                opacity={isLinked ? 1 : 0.85}
                style={{ transition: 'all .4s ease' }}
              />
              <text x={n.x} y={n.y - 4} textAnchor="middle"
                fontSize={12} fontWeight={600}
                fill={isLinked ? '#fff' : (n.hot ? '#4B3FCC' : '#374151')}
                fontFamily="Inter, sans-serif"
                style={{ transition: 'fill .4s ease' }}>
                {n.label}
              </text>
              <text x={n.x} y={n.y + 11} textAnchor="middle"
                fontSize={9} fontWeight={400}
                fill={isLinked ? 'rgba(255,255,255,.8)' : '#9CA3AF'}
                fontFamily="Inter, sans-serif"
                style={{ transition: 'fill .4s ease' }}>
                {n.org}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Légende */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-4 flex-wrap justify-center">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded-full" style={{ background: color }} />
            <span className="text-xs text-gray-400 capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
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
            NetGraph transforme vos contacts Excel, LinkedIn et téléphoniques
            en un graphe qui détecte automatiquement les opportunités cachées
            dans votre réseau professionnel.
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

          {/* Social proof micro */}
          <div className="flex items-center justify-center gap-6 text-sm text-slate">
            {['Finance', 'Conseil', 'Investissement', 'Banque'].map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gray-300"/>
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Graphe interactif ── */}
      <section className="py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200"/>
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200"/>
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200"/>
              </div>
              <span className="text-xs text-gray-400 ml-2">Mon réseau — 6 contacts sélectionnés</span>
            </div>
            <GraphViz />
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            Les relations colorées se détectent automatiquement à l'import
          </p>
        </div>
      </section>

      {/* ── Problème ── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-ink mb-5 leading-snug">
            Vos prochains deals sont déjà dans vos contacts.
          </h2>
          <p className="text-slate text-base leading-relaxed">
            Vous avez des centaines de contacts. Certains se connaissent, certains cherchent exactement
            ce que d'autres proposent. Ces synergies existent — elles ne sont juste pas visibles.
            NetGraph les rend visibles.
          </p>
        </div>
      </section>

      {/* ── 5 potentiels ── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-ink mb-3">
              5 types de potentiels détectés automatiquement
            </h2>
            <p className="text-slate text-sm">Sur chaque paire de contacts, NetGraph calcule un score 0–100</p>
          </div>

          <div className="space-y-3">
            {POTENTIALS.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100
                hover:border-gray-200 transition-colors group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: p.bg }}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-ink text-sm">{p.type}</span>
                    <span className="text-xs font-semibold" style={{ color: p.color }}>{p.score}/100</span>
                  </div>
                  <p className="text-xs text-slate">{p.example}</p>
                  <ScoreBar score={p.score} color={p.color} />
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
            De vos contacts à vos opportunités en 3 étapes
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                title: 'Importez vos contacts',
                desc: 'Excel, export LinkedIn, ou carnet d\'adresses téléphonique. Tout se fusionne automatiquement.',
                icon: '📥',
              },
              {
                n: '02',
                title: 'Le graphe se génère',
                desc: 'Chaque contact devient un nœud. L\'algorithme analyse les attributs et colore les synergies.',
                icon: '🕸',
              },
              {
                n: '03',
                title: 'Agissez sur les potentiels',
                desc: 'Chaque matin : 3 actions prioritaires. Féliciter, mettre en relation, relancer. 5 minutes.',
                icon: '⚡',
              },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-xs font-medium text-violet/50 mb-3">{step.n}</div>
                <div className="text-2xl mb-3">{step.icon}</div>
                <h3 className="font-semibold text-ink text-sm mb-2">{step.title}</h3>
                <p className="text-slate text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
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
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-400">
            {['Aucune carte requise', 'Données 100% privées', 'Désabonnement en 1 clic'].map(g => (
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
