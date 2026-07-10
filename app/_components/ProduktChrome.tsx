// Header + Footer für Produkt-Hauptseiten.
// Wird sowohl von app/[produkt]/layout.tsx als auch von app/page.tsx verwendet —
// letzteres rendert das Root-Produkt (sterbegeld24plus) unter `/`. Daher sind
// `homePath` und `legalPathPrefix` als Props variabel.
import Link from 'next/link'
import { CookieSettingsLink } from '@/components/cookies/CookieSettingsLink'
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { NavbarLogoMark } from '@/components/NavbarLogoMark'
import { LEGAL_NAME } from '@/lib/seo/organization'

export interface ProduktChromeProps {
  /** URL-Slug des Produkts. Wird für Sub-Routen-Links verwendet. */
  slug: string
  /** Anzeige-Name im Logo + Footer. */
  name: string
  /** Akzentfarbe (z. B. resolveAccentColor). */
  accentColor: string
  /** Show logo left of product name — default false when omitted. */
  navbarLogoVisible?: boolean
  /** Custom navbar logo URL; when visible and empty → colored MonsterLogo. */
  navbarLogoUrl?: string | null
  navbarLogoAlt?: string | null
  /** Pfad zur Produkt-Hauptseite — '/' für Root-Produkt, sonst '/<slug>'. */
  homePath?: string
  /**
   * Präfix für Legal-Pages (Impressum/Datenschutz/Kontakt/AGB).
   * '/<slug>' für nicht-Root-Produkte (z. B. '/bu/impressum').
   * '' für Root-Produkt — Legal-Pages liegen top-level (z. B. '/impressum').
   */
  legalPathPrefix?: string
  /**
   * Brand claim under the product name (e.g. „Die Sterbegeldversicherung mit garantierter Aufnahme.").
   * From produkte.brand_subline. Phase 4 § 8 Mitigation 1.
   */
  brandSubline?: string | null
  children: React.ReactNode
}

export function ProduktChrome({
  slug,
  name,
  accentColor,
  navbarLogoVisible = false,
  navbarLogoUrl = null,
  navbarLogoAlt = null,
  homePath,
  legalPathPrefix,
  brandSubline,
  children,
}: ProduktChromeProps) {
  const home = homePath ?? `/${slug}`
  const legalPrefix = legalPathPrefix ?? `/${slug}`

  const mobileNavLinks = [
    { href: `/${slug}/tarife`, label: 'Tarifrechner' },
    { href: `/${slug}/vergleich`, label: 'Vergleich' },
    { href: `/${slug}/faq`, label: 'FAQ' },
    { href: `/${slug}/ratgeber`, label: 'Ratgeber' },
    { href: '/blog', label: 'Blog' },
  ]

  return (
    <div style={{ '--accent': accentColor } as React.CSSProperties} className="overflow-x-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#e2e8f0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href={home} className="flex items-center gap-2 min-w-0 shrink-0">
            <NavbarLogoMark
              visible={navbarLogoVisible}
              customUrl={navbarLogoUrl}
              customAlt={navbarLogoAlt}
              accentColor={accentColor}
              productName={name}
            />
            <div className="flex flex-col items-start text-left leading-tight min-w-0">
              <span className="font-heading font-bold text-lg sm:text-[1.2rem] text-navy tracking-tight truncate max-w-[min(100%,14rem)] sm:max-w-none">
                {name}
              </span>
              {brandSubline && (
                <span className="hidden sm:block font-body text-sm font-normal text-muted mt-0.5 line-clamp-1">
                  {brandSubline}
                </span>
              )}
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 font-body text-base font-medium text-body shrink-0">
            <Link href={`/${slug}/tarife`} className="hover:text-accent transition-colors">
              Tarifrechner
            </Link>
            <Link href={`/${slug}/vergleich`} className="hover:text-accent transition-colors">
              Vergleich
            </Link>
            <Link href={`/${slug}/faq`} className="hover:text-accent transition-colors">
              FAQ
            </Link>
            <Link href={`/${slug}/ratgeber`} className="hover:text-accent transition-colors">
              Ratgeber
            </Link>
            <Link href="/blog" className="hover:text-accent transition-colors">
              Blog
            </Link>
            <Link
              href="#formular"
              className="inline-flex items-center min-h-[44px] px-5 py-2 rounded-lg font-body text-base font-bold border-[1.5px] border-accent text-accent bg-transparent hover:bg-accent hover:text-white transition-all duration-200"
            >
              Angebot anfordern
            </Link>
          </nav>

          <MobileNavDrawer
            links={mobileNavLinks}
            cta={{ href: '#formular', label: 'Angebot anfordern' }}
            ctaClassName="border-accent text-accent hover:bg-accent hover:text-white"
          />
        </div>
      </header>

      {children}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a3252] text-white/70 py-10 md:py-12 mt-12 md:mt-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          {/* Logo row — uses produkt name as wordmark */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3">
              {navbarLogoVisible && navbarLogoUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={navbarLogoUrl.trim()}
                  alt={navbarLogoAlt?.trim() || name}
                  className="h-[34px] w-auto max-w-[140px] object-contain shrink-0"
                />
              ) : null}
              <span className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight text-center">
                {name}
              </span>
            </div>
          </div>
          {/* Legal links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 font-body text-sm font-light mb-6">
            {[
              { href: `${legalPrefix}/impressum`, label: 'Impressum' },
              { href: `${legalPrefix}/datenschutz`, label: 'Datenschutz' },
              { href: null, label: 'cookie-settings' },
              { href: `${legalPrefix}/kontakt`, label: 'Kontakt' },
              { href: `${legalPrefix}/agb`, label: 'AGB' },
            ].map(({ href, label }) =>
              label === 'cookie-settings' ? (
                <CookieSettingsLink
                  key="cookie-settings"
                  className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                />
              ) : (
                <Link
                  key={href!}
                  href={href!}
                  className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                >
                  {label}
                </Link>
              ),
            )}
            <a
              href="https://finanzteam26.de"
              target="_blank"
              rel="noopener"
              className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
            >
              Unternehmen
            </a>
          </div>
          <p className="text-center text-xs text-white/40">
            © {new Date().getFullYear()} {name} by {LEGAL_NAME} — Alle Rechte vorbehalten
          </p>
        </div>
      </footer>
    </div>
  )
}
