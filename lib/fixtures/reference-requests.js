// Reference requests R1–R16 for the matching quality bar (#6) and the introducers (#7).
// Source: the tech lead's draft list on issue #6 (R1–R12), QA's additions (R13–R16) and
// the « Clarifications PO (2026-10-29) » comment on #6 (R12 → none, R15 amended).
// The founder will add fictional equivalents of real, anonymised requests.
// Ids refer to SAMPLE_CONTACTS (lib/fixtures/sample-contacts.js).
//
// lib/match.reference.test.js (#6, B5) fails if a mustTop3 id is missing from the
// top 3, or if a `none` request returns any result. lib/introducers.reference.test.js (#7)
// checks `introducers` (every request has one since Sprint 2: PO AC 5, no company → nothing).

/**
 * @typedef {Object} ExpectedIntroducers
 * @property {'found'|'not_found'|'no_company'} status
 * @property {string} [companyLabel]   expected section title (found) or text as typed (not_found)
 * @property {string[]} [ids]          exactly these people, when found
 */

/**
 * @typedef {Object} ReferenceRequest
 * @property {string} id                  'R1'…'R16'
 * @property {string} request             as a user would type it
 * @property {string[]} mustTop3          every id must be in the top 3 of match()
 * @property {string[]} acceptable        may appear in the top 10
 * @property {boolean} none               true: match() must return [] (empty state, reformulate help)
 * @property {ExpectedIntroducers} [introducers]   expected introducers() result (#7), when checked
 * @property {string} checks              what this request is meant to exercise
 */

/** @type {ReadonlyArray<Readonly<ReferenceRequest>>} */
export const REFERENCE_REQUESTS = Object.freeze([
  {
    id: 'R1',
    request: 'Trouver ma prochaine mission de conseil en finance',
    mustTop3: ['s01', 's17'],
    acceptable: ['s20', 's02', 's28', 's03'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'story example (#6)',
  },
  {
    id: 'R2',
    request: 'Rencontrer le DAF de Atlas Conseil',
    mustTop3: ['s01'],
    acceptable: ['s02', 's03', 's26', 's10'],
    none: false,
    introducers: { status: 'found', companyLabel: 'Atlas Conseil', ids: ['s01', 's02', 's03'] },
    checks: '#7 introducers = s01, s02, s03 (ATLAS CONSEIL SA variant)',
  },
  {
    id: 'R3',
    request: 'Lever des fonds pour ma startup fintech',
    mustTop3: ['s06'],
    acceptable: ['s07', 's13', 's23', 's30', 's11'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'fundraising vocabulary',
  },
  {
    id: 'R4',
    request: "Être présenté à quelqu'un chez Fictiva Banque",
    mustTop3: ['s04', 's05', 's22'],
    acceptable: [],
    none: false,
    introducers: { status: 'found', companyLabel: 'Fictiva Banque', ids: ['s04', 's05', 's22'] },
    checks: '#7 introducers = s04, s05, s22 (FICTIVA BANQUE variant)',
  },
  {
    id: 'R5',
    request: 'Trouver un CFO pour une mission de transition',
    mustTop3: ['s10', 's26', 's01'],
    acceptable: ['s20'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'DAF / CFO / directeur administratif et financier synonyms',
  },
  {
    id: 'R6',
    request: 'Contacter un expert en fusions-acquisitions',
    mustTop3: ['s12', 's28'],
    acceptable: ['s13', 's30'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'FR term ⇄ « M&A » in positions',
  },
  {
    id: 'R7',
    request: 'Find a partner at a private equity fund',
    mustTop3: ['s13'],
    acceptable: ['s06', 's30', 's12', 's17', 's02'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'English request',
  },
  {
    id: 'R8',
    request: 'Recruter un auditeur financier',
    mustTop3: ['s08'],
    acceptable: ['s09', 's26'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'audit vocabulary',
  },
  {
    id: 'R9',
    request: "Vendre une solution aux achats d'un industriel",
    mustTop3: ['s14'],
    acceptable: ['s15'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'procurement vocabulary',
  },
  {
    id: 'R10',
    request: 'trouver une DIRECTRICE FINANCIERE',
    mustTop3: ['s01'],
    acceptable: ['s10', 's26'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'case, no accents',
  },
  {
    id: 'R11',
    request: 'Apprendre la plongée sous-marine',
    mustTop3: [],
    acceptable: [],
    none: true,
    introducers: { status: 'no_company' },
    checks: 'no match: empty state with reformulate help',
  },
  {
    id: 'R12',
    request: "Être présenté à quelqu'un chez Zéroboîte Industries",
    mustTop3: [],
    acceptable: [],
    none: true,
    introducers: { status: 'not_found', companyLabel: 'Zéroboîte Industries' },
    checks: 'PO 2026-10-29: empty state for #6; #7 not_found, no introducers',
  },
  {
    id: 'R13',
    request: "Rencontrer le DAF d'Atlas Conseil",
    mustTop3: ['s01'],
    acceptable: ['s02', 's03', 's26', 's10'],
    none: false,
    introducers: { status: 'found', companyLabel: 'Atlas Conseil', ids: ['s01', 's02', 's03'] },
    checks: "elision d' (R2 uses « de Atlas »)",
  },
  {
    id: 'R14',
    request: 'rencontrer la daf d atlas conseil',
    mustTop3: ['s01'],
    acceptable: ['s02', 's03', 's26', 's10'],
    none: false,
    introducers: { status: 'found', companyLabel: 'Atlas Conseil', ids: ['s01', 's02', 's03'] },
    checks: 'lowercase, no apostrophe',
  },
  {
    id: 'R15',
    request: 'Trouver un directeur financier pour ma PME',
    mustTop3: ['s10', 's26', 's01'],
    acceptable: ['s20', 's08'],
    none: false,
    introducers: { status: 'no_company' },
    checks: 'synonyms DAF / CFO / directeur financier (PO: s08 acceptable)',
  },
  {
    id: 'R16',
    request: 'Trouver une mission de conseil en M&A',
    mustTop3: ['s28'],
    acceptable: ['s12', 's17', 's16', 's13', 's30', 's02'],
    none: false,
    introducers: { status: 'no_company' },
    checks: '« M&A » kept as one token on the request side',
  },
].map((r) => Object.freeze(r)))
