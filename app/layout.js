import localFont from 'next/font/local'
import './globals.css'

// #44, #51: Inter is served from our domain (no visitor's browser contacts Google) and its files
// are committed in app/fonts/, so the build downloads nothing. Only the weights the UI uses
// (design system: 400, 500, 600), latin subset. next/font adds a size-adjusted Arial fallback,
// as the Google loader did before #51. The font is exposed as --font-inter, which globals.css and
// tailwind.config.js (font-sans) use.
const inter = localFont({
  src: [
    { path: './fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: 'Arial',
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
