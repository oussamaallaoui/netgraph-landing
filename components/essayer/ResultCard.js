// One person found for the request (#6): the shared PersonCard with MatchResult.why
// (lib/explain.js whyText) in « Pourquoi cette personne ».

import PersonCard from './PersonCard'

/** @param {{ result: import('../../lib/types.js').MatchResult }} props */
export default function ResultCard({ result }) {
  return <PersonCard contact={result.contact} why={result.why} />
}
