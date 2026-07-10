import type { Metadata } from 'next'
import { Fraunces, Quicksand } from 'next/font/google'
import { CookieConsentProvider } from '@/components/cookies/CookieConsent'
import { MetaPixel } from '@/components/tracking/MetaPixel'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { template: '%s | LeadMonster', default: 'LeadMonster' },
  description: 'Skalierbares Vertriebs-Content-System für Versicherungsprodukte',
  robots: { index: true, follow: true },
  openGraph: { siteName: 'LeadMonster', locale: 'de_DE', type: 'website' },
  // Icons werden automatisch aus app/icon.svg + app/apple-icon.svg gepickt
  // (Next.js File-Convention) — keine explizite Konfig nötig.
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${fraunces.variable} ${quicksand.variable}`}
    >
      <body className="font-body text-body bg-white antialiased overflow-x-hidden">
        <CookieConsentProvider>
          <MetaPixel />
          {children}
        </CookieConsentProvider>
      </body>
    </html>
  )
}
