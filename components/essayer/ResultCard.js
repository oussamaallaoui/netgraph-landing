// One person found for the request (#6): the shared PersonCard with MatchResult.why
// (lib/explain.js whyText) in « Pourquoi cette personne », and « Préparer un message »
// (#8, help draft) in its footer.

import PersonCard from './PersonCard'
import DraftAction from './DraftAction'

/** @param {{ result: import('../../lib/types.js').MatchResult }} props */
export default function ResultCard({ result }) {
  return (
    <PersonCard contact={result.contact} why={result.why}>
      <DraftAction contact={result.contact} kind="help" />
    </PersonCard>
  )
}
