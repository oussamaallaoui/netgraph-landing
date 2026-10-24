import './globals.css'

export const metadata = {
  title: 'NetGraph — Votre réseau a plus de valeur que vous ne le pensez',
  description: 'Dites ce que vous cherchez : NetGraph trouve, parmi vos contacts et les contacts de vos contacts, qui peut vous aider — et qui peut vous le présenter.',
  openGraph: {
    title: 'NetGraph',
    description: 'Trouvez qui peut vous aider dans votre réseau, à deux contacts près',
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
