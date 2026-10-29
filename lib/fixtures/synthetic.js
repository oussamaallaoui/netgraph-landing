// Deterministic synthetic contacts for performance tests (#6: 5,000 contacts) and
// large-file tests (#5: more than 30,000 rows). Every name and company is invented;
// emails use the reserved @netgraph.test domain.
//
// For QA, lib/fixtures/write-synthetic-csv.mjs writes an n-row fake LinkedIn CSV to
// stdout. Its output is never committed.

/** @typedef {import('../types.js').Contact} Contact */

const FIRST_NAMES = [
  'Sara', 'Youssef', 'Nadia', 'Karim', 'Hanane', 'Omar', 'Leïla', 'Mehdi', 'Salma', 'Rachid',
  'Imane', 'Adam', 'Yasmine', 'Hamza', 'Zineb', 'Anas', 'Ghita', 'Tarik', 'Sofia', 'Ilyas',
  'Kenza', 'Badr', 'Meryem', 'Reda', 'Aya', 'Nabil', 'Houda', 'Amine', 'Lina', 'Samir',
  'Claire', 'Julien', 'Camille', 'Thomas', 'Inès', 'Hugo', 'Emma', 'Lucas', 'Chloé', 'Noé',
]

// Invented surnames only.
const LAST_NAMES = [
  'Démo', 'Exemple', 'Fictif', 'Essai', 'Maquette', 'Prototype', 'Pilote', 'Brouillon', 'Témoin',
  'Factice', 'Modèle', 'Placebo', 'Simulé', 'Fantôme', 'Sosie', 'Figurant', 'Doublure', 'Mannequin',
  'Prête-Nom', 'Cobaye', 'Échantillon', 'Silhouette', 'Avatar', 'Clone', 'Gabarit', 'Calque',
  'Ébauche', 'Esquisse', 'Spécimen', 'Prétexte', 'Synthèse', 'Fiction', 'Leurre', 'Copie',
]

// Invented company roots and forms.
const COMPANY_ROOTS = [
  'Fictiva', 'Exemplia', 'Testiflow', 'Démoventures', 'Medinova', 'Fictis', 'Exempla', 'Logistica',
  'Synthetix', 'Imaginis', 'Placebia', 'Maquetta', 'Brouillonne', 'Simulacra', 'Prototypa', 'Zéronord',
]
const COMPANY_FORMS = [
  '{r} Conseil', '{r} Banque', '{r} Capital', 'Cabinet {r}', '{r} Audit', '{r} Industries',
  '{r} Assurances', '{r} Labs', '{r} Démo SARL', '{R} SA', '{r} Partners', 'Groupe {r}',
]

const POSITIONS = [
  'Directrice financière', 'Directeur financier', 'CFO', 'DAF', 'Directeur administratif et financier',
  'Contrôleur de gestion', 'Trésorière', 'Associé', 'Partner', 'Managing Director',
  'Consultant senior', 'Consultante en stratégie', 'Senior Manager – Strategy & M&A', 'Directeur M&A',
  'Chargée d\'affaires entreprises', 'Head of Corporate Banking', 'Analyste investissement',
  'Chargé d\'investissement private equity', 'Manager audit financier', 'Auditrice',
  'Responsable recrutement', 'Responsable achats', 'Acheteur', 'Directrice des opérations',
  'Développeur full-stack', 'Product manager', 'Office manager', 'Supply chain manager',
  'Journaliste économique', 'Professeure de finance', 'Fondatrice & CEO', 'Responsable marketing',
  'Ingénieur qualité', 'Juriste', 'Commercial grands comptes', 'Data analyst',
]

/** Mulberry32: small deterministic PRNG, good enough for fixtures. */
function prng(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n, width) => String(n).padStart(width, '0')

function asciiSlug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Deterministic fake contacts: the same (n, seed) always gives the same list.
 * Ids are 'syn-000001'…; about 30% have an email, 90% a profile URL, 95% a company.
 *
 * @param {number} n
 * @param {number} [seed=1]
 * @returns {Contact[]}
 */
export function makeSyntheticContacts(n, seed = 1) {
  const rand = prng(seed)
  const pick = (list) => list[Math.floor(rand() * list.length)]
  const contacts = []
  for (let i = 1; i <= n; i++) {
    const id = `syn-${pad(i, 6)}`
    const firstName = pick(FIRST_NAMES)
    const lastName = pick(LAST_NAMES)
    const root = pick(COMPANY_ROOTS)
    const company = rand() < 0.95 ? pick(COMPANY_FORMS).replace('{r}', root).replace('{R}', root.toUpperCase()) : null
    const year = 2015 + Math.floor(rand() * 12)
    const month = 1 + Math.floor(rand() * 12)
    const day = 1 + Math.floor(rand() * 28)
    contacts.push({
      id,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      company,
      position: pick(POSITIONS),
      connectedOn: `${year}-${pad(month, 2)}-${pad(day, 2)}`,
      profileUrl: rand() < 0.9 ? `https://www.linkedin.com/in/netgraph-exemple-${id}` : null,
      email: rand() < 0.3 ? `${asciiSlug(firstName)}.${asciiSlug(lastName)}.${i}@netgraph.test` : null,
      phone: null,
      sources: ['sample'],
    })
  }
  return contacts
}

/** The notes LinkedIn puts before the header row (wording invented, format as described on #5). */
export const LINKEDIN_PREAMBLE = [
  'Notes:',
  '"Fictional sample file for NetGraph tests. Like a real LinkedIn export, it starts with notes, and email addresses are missing for connections who did not allow it, so the Email Address column is often empty."',
  '',
]

export const LINKEDIN_HEADER = ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'YYYY-MM-DD' → LinkedIn's '12 Mar 2024' ('' if null). */
export function toLinkedInDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`
}

function csvField(value) {
  const v = value ?? ''
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * Contacts → a fake LinkedIn Connections.csv (LF line endings, no BOM).
 *
 * @param {ReadonlyArray<Contact>} contacts
 * @param {{ preamble?: boolean }} [options]   preamble: include the "Notes:" lines (default true)
 * @returns {string}
 */
export function toLinkedInCsv(contacts, { preamble = true } = {}) {
  const lines = preamble ? [...LINKEDIN_PREAMBLE] : []
  lines.push(LINKEDIN_HEADER.join(','))
  for (const c of contacts) {
    lines.push(
      [c.firstName, c.lastName, c.profileUrl, c.email, c.company, c.position, toLinkedInDate(c.connectedOn)]
        .map(csvField)
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
