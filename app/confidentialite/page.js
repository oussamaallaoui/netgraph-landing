// Server component, static (#12): metadata only; the text lives in components/PrivacyPolicy.js.
import PrivacyPolicy from '../../components/PrivacyPolicy'

export const metadata = {
  title: 'Confidentialité — NetGraph',
  description:
    'Quelles données NetGraph collecte quand vous vous inscrivez à la beta, pourquoi, où elles sont conservées, combien de temps, et comment exercer vos droits.',
}

export default function ConfidentialitePage() {
  return <PrivacyPolicy />
}
