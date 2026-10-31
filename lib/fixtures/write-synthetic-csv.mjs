// Writes an n-row fake LinkedIn Connections.csv to stdout, for QA (#6 Q4: 5,000 rows).
// Usage (output outside the repo, never committed):
//   node lib/fixtures/write-synthetic-csv.mjs 5000 [seed] > ~/netgraph-5000.csv
import { makeSyntheticContacts, toLinkedInCsv } from './synthetic.js'

const n = Number.parseInt(process.argv[2] ?? '', 10)
const seed = Number.parseInt(process.argv[3] ?? '1', 10)
if (!Number.isInteger(n) || n < 0 || !Number.isInteger(seed)) {
  process.stderr.write('Usage: node lib/fixtures/write-synthetic-csv.mjs <rows> [seed] > file.csv\n')
  process.exit(1)
}
process.stdout.write(toLinkedInCsv(makeSyntheticContacts(n, seed)))
