import { Inter } from 'next/font/google'
import './globals.css'

// #44: next/font downloads Inter at build time and serves it from our domain, so no visitor's
// browser contacts Google. Only the weights the UI uses (design system: 400, 500, 600).
// The font is exposed as --font-inter, which globals.css and tailwind.config.js (font-sans) use.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
})

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
    <html lang="fr" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
