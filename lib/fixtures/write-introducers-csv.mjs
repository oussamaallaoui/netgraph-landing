// Writes a fake LinkedIn Connections.csv with SAMPLE_CONTACTS + INTRODUCER_CONTACTS to stdout,
// for QA on #7 (« chez Atlasia », « chez L'Atelier Démo », « Finance Conseil », 25 people).
// Usage (output outside the repo, never committed; .gitignore blocks Connections*.csv):
//   node lib/fixtures/write-introducers-csv.mjs > ~/netgraph-introducers.csv
import { INTRODUCER_CONTACTS } from './introducer-contacts.js'
import { SAMPLE_CONTACTS } from './sample-contacts.js'
import { toLinkedInCsv } from './synthetic.js'

process.stdout.write(toLinkedInCsv([...SAMPLE_CONTACTS, ...INTRODUCER_CONTACTS]))
