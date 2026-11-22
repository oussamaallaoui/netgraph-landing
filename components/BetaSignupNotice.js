// Shown in the #beta card instead of the signup form while signups are closed (#47).
// Asks for nothing: no field, no button, no request to /api/subscribe. Removed when #11 (PR #41) merges.
import Link from 'next/link'

export default function BetaSignupNotice() {
  return (
    <div className="text-center">
      <h3 className="text-base font-semibold text-ink mb-2">
        Nous ne collectons aucune donnée pour l'instant.
      </h3>
      <p className="text-sm text-slate leading-relaxed">
        Il n'y a rien à remplir{' '}: les inscriptions ne sont pas encore ouvertes.
      </p>
      <p className="text-sm text-slate leading-relaxed mt-2">
        En attendant, essayez NetGraph sur vos propres contacts, sans inscription. Ils restent sur votre appareil.
      </p>
      <Link href="/essayer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded text-sm font-medium text-violet
          hover:text-violet-dark underline-offset-2 hover:underline
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet">
        Essayer maintenant
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>
    </div>
  )
}
