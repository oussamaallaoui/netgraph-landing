import './globals.css'

export const metadata = {
  title: 'NetGraph — Votre réseau a plus de valeur que vous ne le pensez',
  description: 'Transformez vos contacts en opportunités. NetGraph détecte automatiquement les synergies cachées dans votre réseau professionnel.',
  openGraph: {
    title: 'NetGraph',
    description: 'Cartographie relationnelle & intelligence réseau',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
