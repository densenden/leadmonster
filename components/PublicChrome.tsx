// Gemeinsamer Header + Footer für öffentliche, nicht-produktspezifische Seiten
// (/wissen, /blog, /redaktion). Produktseiten haben ihren eigenen Layout-Header in
// app/[produkt]/layout.tsx, weil dort Logo-Akzent + Produktname dynamisch sind.
//
// Single-Domain-Strategie (siehe docs/content-strategie-nischen-anbieter.md § 8):
// Default-Brand ist "Sterbegeld24Plus". Layouts können über Props einen anderen
// Brand-Text bzw. Akzent setzen, falls nötig.
import Link from 'next/link'
import { CookieSettingsLink } from '@/components/cookies/CookieSettingsLink'
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { MonsterLogo } from '@/components/MonsterLogo'
import { TrustFooterStrip } from '@/components/sections/trust/TrustFooterStrip'
import { LEGAL_NAME } from '@/lib/seo/organization'

const DEFAULT_BRAND_TEXT = 'Sterbegeld24Plus'
const DEFAULT_ACCENT = '#02a9e6'

export interface PublicChromeProps {
  children: React.ReactNode
  brandText?: string
  brandAccent?: string
}

const PUBLIC_NAV_LINKS = [
  { href: '/', label: 'Produkte' },
  { href: '/wissen', label: 'Wissensbasis' },
  { href: '/blog', label: 'Blog' },
  { href: '/redaktion', label: 'Redaktion' },
]

export function PublicChrome({
  children,
  brandText = DEFAULT_BRAND_TEXT,
  brandAccent = DEFAULT_ACCENT,
}: PublicChromeProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7fafc] overflow-x-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#e2e8f0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="shrink-0 min-w-0">
            <MonsterLogo color={brandAccent} showText text={brandText} size={38} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 font-body text-base font-light text-[#4a5568]">
            {PUBLIC_NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[#02a9e6] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <MobileNavDrawer links={PUBLIC_NAV_LINKS} />
        </div>
      </header>

      <div className="flex-1">{children}</div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a3252] text-white/70 py-10 md:py-12 mt-12 md:mt-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex justify-center mb-6">
            <MonsterLogo color="#fff" showText text={brandText} textColor="white" size={34} />
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 font-body text-sm font-light mb-6">
            <Link href="/impressum" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">
              Datenschutz
            </Link>
            <CookieSettingsLink className="hover:text-white transition-colors min-h-[44px] inline-flex items-center" />
            <Link href="/erstinformation" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">
              Erstinformation
            </Link>
            <Link href="/redaktion" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">
              Redaktion
            </Link>
            <Link href="/kontakt" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center">
              Kontakt
            </Link>
            <a
              href="https://finanzteam26.de"
              target="_blank"
              rel="noopener"
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Unternehmen
            </a>
          </div>
          {/* Trust-Strip: Verbände + Aufsicht + Berufshaftpflicht (E-E-A-T-Signal) */}
          <TrustFooterStrip />
          <p className="text-center text-xs text-white/40 mt-6">
            © {new Date().getFullYear()} {brandText} by {LEGAL_NAME} — Alle Rechte vorbehalten
          </p>
        </div>
      </footer>
    </div>
  )
}
