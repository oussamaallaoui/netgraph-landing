// The 30 fictional sample contacts (« Essayer avec des contacts d'exemple »),
// from the tech lead's dataset on issue #5. Every person and company is invented,
// except the made-up use of "Atlas Conseil" required by the #6/#7 acceptance criteria.
// Emails use the reserved @netgraph.test domain; profile URLs use a made-up slug.
// lib/fixtures/Connections.sample.csv holds the same people in LinkedIn's format.
//
// Deliberate variants: s02 'ATLAS CONSEIL SA', s22 'FICTIVA BANQUE',
// s30 'Oasis Capital Démo SARL' (company keys, #7); s20 has no company;
// s20 and s27 have no profile URL.

/** @typedef {import('../types.js').Contact} Contact */

const PROFILE_PREFIX = 'https://www.linkedin.com/in/netgraph-exemple-'

// [id, firstName, lastName, company, position, email, connectedOn, hasProfileUrl]
const ROWS = [
  ['s01', 'Sara', 'Démo', 'Atlas Conseil', 'Directrice financière', 'sara.demo@netgraph.test', '2024-03-12', true],
  ['s02', 'Youssef', 'Exemple', 'ATLAS CONSEIL SA', 'Associé', null, '2021-06-02', true],
  ['s03', 'Nadia', 'Fictif', 'Atlas Conseil', 'Consultante senior, stratégie', 'nadia.fictif@netgraph.test', '2025-01-20', true],
  ['s04', 'Karim', 'Essai', 'Fictiva Banque', 'Directeur des risques', null, '2020-09-15', true],
  ['s05', 'Hanane', 'Maquette', 'Fictiva Banque', "Chargée d'affaires entreprises", 'hanane.maquette@netgraph.test', '2023-11-03', true],
  ['s06', 'Omar', 'Prototype', 'Démoventures', 'Partner – Venture Capital', null, '2022-04-28', true],
  ['s07', 'Leïla', 'Pilote', 'Démoventures', 'Analyste investissement', null, '2025-07-07', true],
  ['s08', 'Mehdi', 'Brouillon', 'Exemplia Audit', 'Manager audit financier', 'mehdi.brouillon@netgraph.test', '2019-12-01', true],
  ['s09', 'Salma', 'Témoin', 'Exemplia Audit', 'Responsable recrutement', null, '2024-08-19', true],
  ['s10', 'Rachid', 'Factice', 'Testiflow', 'CFO', 'rachid.factice@netgraph.test', '2023-02-14', true],
  ['s11', 'Imane', 'Modèle', 'Testiflow', 'Fondatrice & CEO', null, '2022-10-10', true],
  ['s12', 'Adam', 'Placebo', 'Oasis Capital Démo', 'Directeur M&A', 'adam.placebo@netgraph.test', '2021-03-30', true],
  ['s13', 'Yasmine', 'Simulé', 'Oasis Capital Démo', "Chargée d'investissement private equity", null, '2024-05-05', true],
  ['s14', 'Hamza', 'Fantôme', 'Medinova Démo', 'Responsable achats', null, '2020-01-22', true],
  ['s15', 'Zineb', 'Sosie', 'Medinova Démo', 'Directrice des opérations', null, '2025-09-09', true],
  ['s16', 'Anas', 'Figurant', 'Cabinet Fictis', 'Consultant en transformation digitale', 'anas.figurant@netgraph.test', '2023-06-16', true],
  ['s17', 'Ghita', 'Doublure', 'Cabinet Fictis', 'Directrice associée, conseil en finance', 'ghita.doublure@netgraph.test', '2022-12-12', true],
  ['s18', 'Tarik', 'Mannequin', 'Assurances Exempla', 'Actuaire', null, '2021-11-11', true],
  ['s19', 'Sofia', 'Prête-Nom', 'Assurances Exempla', 'Responsable partenariats', null, '2024-02-29', true],
  ['s20', 'Ilyas', 'Cobaye', null, "Consultant indépendant en finance d'entreprise", 'ilyas.cobaye@netgraph.test', '2026-01-15', false],
  ['s21', 'Kenza', 'Échantillon', 'Université Démo', 'Professeure de finance', null, '2019-05-20', true],
  ['s22', 'Badr', 'Silhouette', 'FICTIVA BANQUE', 'Head of Corporate Banking', null, '2025-04-01', true],
  ['s23', 'Meryem', 'Avatar', 'Startup Lab Démo', 'Responsable incubation startups', null, '2023-09-27', true],
  ['s24', 'Reda', 'Clone', 'Testiflow', 'Développeur full-stack', null, '2026-03-03', true],
  ['s25', 'Aya', 'Gabarit', 'Logistica Démo', 'Supply chain manager', null, '2022-07-18', true],
  ['s26', 'Nabil', 'Calque', 'Logistica Démo', 'Directeur administratif et financier', 'nabil.calque@netgraph.test', '2020-10-30', true],
  ['s27', 'Houda', 'Ébauche', 'Démoventures', 'Office manager', null, '2024-12-24', false],
  ['s28', 'Amine', 'Esquisse', 'Cabinet Fictis', 'Senior Manager – Strategy & M&A', null, '2021-08-08', true],
  ['s29', 'Lina', 'Spécimen', 'Exempla Média', 'Journaliste économique', null, '2025-02-02', true],
  ['s30', 'Samir', 'Prétexte', 'Oasis Capital Démo SARL', 'Investment Director', null, '2023-04-14', true],
]

/** @type {ReadonlyArray<Readonly<Contact>>} */
export const SAMPLE_CONTACTS = Object.freeze(
  ROWS.map(([id, firstName, lastName, company, position, email, connectedOn, hasProfileUrl]) =>
    Object.freeze({
      id,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      company,
      position,
      connectedOn,
      profileUrl: hasProfileUrl ? PROFILE_PREFIX + id : null,
      email,
      phone: null,
      sources: Object.freeze(['sample']),
    }),
  ),
)
