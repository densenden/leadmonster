import type { Metadata } from 'next'
import { Inter, Roboto, Nunito_Sans } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-roboto',
})
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: { template: '%s | LeadMonster', default: 'LeadMonster' },
  description: 'Skalierbares Vertriebs-Content-System für Versicherungsprodukte',
  robots: { index: true, follow: true },
  openGraph: { siteName: 'LeadMonster', locale: 'de_DE', type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${roboto.variable} ${nunitoSans.variable}`}
    >
      <body className="font-body bg-white text-brand-neutral-base">{children}</body>
    </html>
  )
}
