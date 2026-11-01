// Extra fictional contacts for the introducers (#7), on top of SAMPLE_CONTACTS (s01–s30,
// unchanged). Cases from the « Précisions PO Sprint 2 » and « Découpage tech lead Sprint 2 »
// comments on #7. Every person and company is invented; no emails; made-up profile slugs.
//
// - i01 'Atlasia & Co'                       « chez Atlasia » (key 'atlasia')
// - i02, i03 "L'Atelier Démo", i04 'L’ATELIER DÉMO SAS'   « chez L'Atelier Démo » (elision, label ×2 wins)
// - i05 'Finance Conseil'                     generic name: only after a cue
// - i06–i30 'Foulia Démo' ×24 + 'FOULIA DÉMO SA' ×1        25 people: 20 listed, total 25
//
// For QA, lib/fixtures/write-introducers-csv.mjs writes SAMPLE_CONTACTS + these people as a
// fake LinkedIn CSV to stdout (never committed), to import on /essayer.

/** @typedef {import('../types.js').Contact} Contact */

const PROFILE_PREFIX = 'https://www.linkedin.com/in/netgraph-exemple-'

// [id, firstName, lastName, company, position]
const ROWS = [
  ['i01', 'Jade', 'Parodie', 'Atlasia & Co', 'Directrice générale'],
  ['i02', 'Malik', 'Pastiche', "L'Atelier Démo", 'Designer produit'],
  ['i03', 'Élodie', 'Réplique', "L'Atelier Démo", 'Cheffe de projet'],
  ['i04', 'Ayoub', 'Facsimilé', 'L’ATELIER DÉMO SAS', 'Fondateur'],
  ['i05', 'Rim', 'Contrefaçon', 'Finance Conseil', 'Office manager'],
]

const CROWD_FIRST_NAMES = [
  'Zoé', 'Yanis', 'Wassim', 'Victor', 'Ulysse', 'Thaïs', 'Sami', 'Rania', 'Quentin', 'Paul',
  'Océane', 'Nora', 'Mila', 'Louis', 'Kawtar', 'Jules', 'Ismaël', 'Hiba', 'Gabriel', 'Farah',
  'Éva', 'Dina', 'Chaïma', 'Bilal', 'Alice',
]

const CROWD = CROWD_FIRST_NAMES.map((firstName, k) => [
  `i${String(k + 6).padStart(2, '0')}`,
  firstName,
  'Cohorte',
  k === 0 ? 'FOULIA DÉMO SA' : 'Foulia Démo',
  k % 2 === 0 ? 'Chargé de mission' : 'Analyste',
])

/** @type {ReadonlyArray<Readonly<Contact>>} */
export const INTRODUCER_CONTACTS = Object.freeze(
  [...ROWS, ...CROWD].map(([id, firstName, lastName, company, position]) =>
    Object.freeze({
      id,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      company,
      position,
      connectedOn: '2025-06-01',
      profileUrl: PROFILE_PREFIX + id,
      email: null,
      phone: null,
      sources: Object.freeze(['sample']),
    }),
  ),
)
