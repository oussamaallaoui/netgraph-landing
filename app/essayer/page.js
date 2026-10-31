// Server component: metadata only. All contact handling happens in the client
// component below (ADR 0001: contacts never leave the device).
import TryApp from '../../components/essayer/TryApp'

export const metadata = {
  title: 'Essayer NetGraph',
  description:
    'Importez vos relations LinkedIn et essayez NetGraph. Vos contacts restent sur cet appareil : ils ne sont jamais envoyés à NetGraph.',
  referrer: 'no-referrer',
}

export default function EssayerPage() {
  return <TryApp />
}
