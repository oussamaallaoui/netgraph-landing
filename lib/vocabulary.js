// Matching vocabulary (#6): FR/EN phrases → concept ids. Data only.
//
// Terms are written as a person would type them; lib/match.js normalises them with
// lib/text.js (case, accents, elisions, stopwords, plural and feminine endings), so
// « directrice financière », « Directeur financier » and « directeurs financiers » are
// the same term. Multi-word terms match as a phrase.
//
// Fields beyond the #6 contract ({ id, label, terms }):
// - implies: concepts that a match on this concept also counts as (a CFO is in finance).
// - hints:   request-only words that point to this concept with a low weight
//            (« mission » → conseil, indépendant). They never make a person appear alone.
//
// Seed from the tech lead's breakdown on #6; the PO reviews and completes it.

/** @typedef {import('./types.js').Concept} Concept */

/**
 * @typedef {Concept & { implies?: string[], hints?: string[] }} VocabularyConcept
 */

/** @type {ReadonlyArray<Readonly<VocabularyConcept>>} */
export const CONCEPTS = Object.freeze([
  {
    id: 'finance',
    label: 'finance',
    terms: [
      'finance', 'finances', 'financier', 'financière', 'financial', 'corporate finance', 'trésorerie',
      'trésorier', 'trésorière', 'treasury', 'treasurer', 'contrôle de gestion', 'contrôleur de gestion',
      'contrôleuse de gestion', 'controller', 'controlling', 'comptabilité', 'comptable', 'accounting',
      'expert-comptable', 'experte-comptable', 'experts-comptables', 'expert comptable', 'experts comptables',
    ],
  },
  {
    id: 'cfo',
    label: 'direction financière (DAF, CFO)',
    implies: ['finance'],
    terms: [
      'daf', 'cfo', 'directeur financier', 'directrice financière', 'directeur administratif et financier',
      'directrice administrative et financière', 'chief financial officer', 'finance director',
      'director of finance', 'head of finance', 'vp finance', 'responsable financier', 'responsable financière',
      'directeur des finances', 'directrice des finances',
    ],
  },
  {
    id: 'conseil',
    label: 'conseil',
    hints: ['mission', 'missions'],
    terms: [
      'conseil', 'consulting', 'consultant', 'consultante', 'consultants', 'cabinet', 'advisory', 'advisor',
      'adviser', 'conseiller', 'conseillère', 'consultancy',
    ],
  },
  {
    id: 'banque',
    label: 'banque',
    terms: [
      'banque', 'bank', 'banking', 'bancaire', 'banquier', 'banquière', "chargé d'affaires",
      "chargée d'affaires", 'corporate banking', 'investment banking', 'banque d’affaires', 'banque privée',
      'private banking',
    ],
  },
  {
    id: 'investissement',
    label: 'investissement',
    terms: [
      'investissement', 'investissements', 'investment', 'investments', 'investir', 'investisseur',
      'investisseuse', 'investor', 'investors', 'private equity', 'capital-investissement',
      'capital investissement', 'venture capital', 'capital-risque', 'capital risque', 'vc', 'fonds',
      "fonds d'investissement", 'fund', 'funds', 'business angel', 'business angels', 'levée de fonds',
      'lever des fonds', 'fundraising', 'fund raising', 'raise funds', 'amorçage', 'seed', 'family office',
      'asset management', 'gestion d’actifs',
    ],
  },
  {
    id: 'ma',
    label: 'fusions-acquisitions (M&A)',
    terms: [
      'm&a', 'fusions-acquisitions', 'fusions et acquisitions', 'fusion-acquisition', 'fusion acquisition',
      'mergers and acquisitions', 'mergers & acquisitions', 'merger', 'mergers',
      'corporate development', 'cession', 'cessions', "rachat d'entreprise", 'transmission d’entreprise',
    ],
  },
  {
    id: 'associe',
    label: 'associé ou partner',
    terms: [
      'associé', 'associée', 'associés', 'partner', 'partners', 'directeur associé', 'directrice associée',
      'managing partner', 'managing director', 'general partner',
    ],
  },
  {
    id: 'audit',
    label: 'audit',
    terms: [
      'audit', 'auditeur', 'auditrice', 'auditor', 'commissaire aux comptes', 'expertise comptable',
      'expert-comptable', 'experte-comptable', 'experts-comptables', 'expert comptable', 'experts comptables',
      'chartered accountant', 'cpa', 'contrôle interne', 'internal audit',
    ],
  },
  {
    id: 'strategie',
    label: 'stratégie',
    terms: ['stratégie', 'strategy', 'stratégique', 'strategic', 'stratège', 'strategist'],
  },
  {
    id: 'rh',
    label: 'ressources humaines et recrutement',
    terms: [
      'rh', 'drh', 'ressources humaines', 'recrutement', 'recruter', 'recruteur', 'recruteuse', 'recruiter',
      'recruiting', 'recruitment', 'talent', 'talents', 'talent acquisition', 'hr', 'human resources',
      'chasseur de têtes', 'chasseuse de têtes', 'headhunter',
    ],
  },
  {
    id: 'achats',
    label: 'achats',
    terms: ['achats', 'achat', 'acheteur', 'acheteuse', 'procurement', 'purchasing', 'buyer', 'sourcing'],
  },
  {
    id: 'startup',
    label: 'startups',
    terms: [
      'startup', 'startups', 'start-up', 'start-ups', 'jeune pousse', 'fintech', 'incubateur', 'incubation',
      'incubator', 'accélérateur', 'accelerator', 'fondateur', 'fondatrice', 'cofondateur', 'cofondatrice',
      'co-fondateur', 'co-fondatrice', 'founder', 'co-founder', 'cofounder',
    ],
  },
  {
    id: 'independant',
    label: 'indépendant ou management de transition',
    hints: ['mission', 'missions', 'transition'],
    terms: [
      'indépendant', 'indépendante', 'freelance', 'free-lance', 'freelancer', 'management de transition',
      'manager de transition', 'interim management', 'interim manager', 'portage salarial',
    ],
  },
])

/**
 * Seniority words: a small bonus for a person who already matches something else.
 * Never enough on their own to show a person (PO, 2026-10-29), on either side.
 */
export const SENIORITY_TERMS = Object.freeze([
  'ceo', 'pdg', 'dg', 'directeur général', 'directrice générale', 'président', 'présidente', 'president',
  'head of', 'vp', 'vice president', 'vice-président', 'directeur', 'directrice', 'director', 'chief',
  'partner', 'associé', 'managing director', 'managing partner', 'fondateur', 'fondatrice', 'founder',
])

/** Example requests for the empty state: R1, R3, R6 and R8 word for word (PO, 2026-10-29). */
export const EXAMPLE_REQUESTS = Object.freeze([
  'Trouver ma prochaine mission de conseil en finance',
  'Lever des fonds pour ma startup fintech',
  'Contacter un expert en fusions-acquisitions',
  'Recruter un auditeur financier',
])
