import type { Metadata } from 'next'
import { Roboto, Nunito_Sans } from 'next/font/google'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-roboto',
  display: 'swap',
})
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { template: '%s | LeadMonster', default: 'LeadMonster' },
  description: 'Skalierbares Vertriebs-Content-System für Versicherungsprodukte',
  robots: { index: true, follow: true },
  openGraph: { siteName: 'LeadMonster', locale: 'de_DE', type: 'website' },
  icons: {
    icon: '/images/ft26-logo.svg',
    shortcut: '/images/ft26-logo.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${roboto.variable} ${nunitoSans.variable}`}
    >
      <body className="font-body text-body bg-white antialiased">{children}</body>
    </html>
  )
}
