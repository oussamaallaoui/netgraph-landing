// Short privacy notice for the signup details step (#12), shown above « Confirmer mon inscription ».
// Copy: PO text on issue #12, plus the founder's 2026-11-21 addition (company and role also choose
// whom to invite first). Must match what the signup stores (#11) and /confidentialite.
import Link from 'next/link'
import { FOCUS } from './essayer/ui'

export default function SignupPrivacyNotice() {
  return (
    <p className="text-xs leading-relaxed text-slate">
      Nous utilisons votre email, votre nom, votre entreprise et votre rôle uniquement pour la beta de NetGraph :
      vous recontacter à son sujet et, d&apos;après votre entreprise et votre rôle, choisir qui inviter en premier.
      Nous les gardons jusqu&apos;à la création de votre compte, et les supprimons plus tôt si vous le demandez à
      contact@netgraph.app.{' '}
      <Link
        href="/confidentialite"
        className={`rounded font-medium text-violet underline underline-offset-2 hover:text-violet-dark ${FOCUS}`}
      >
        En savoir plus
      </Link>
    </p>
  )
}
