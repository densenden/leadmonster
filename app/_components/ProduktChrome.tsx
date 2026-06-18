// Header + Footer für Produkt-Hauptseiten.
// Wird sowohl von app/[produkt]/layout.tsx als auch von app/page.tsx verwendet —
// letzteres rendert das Root-Produkt (sterbegeld24plus) unter `/`. Daher sind
// `homePath` und `legalPathPrefix` als Props variabel.
import Link from 'next/link'
import { MonsterLogo } from '@/components/MonsterLogo'
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

  return (
    <div style={{ '--accent': accentColor } as React.CSSProperties}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#e2e8f0]">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={home} className="flex items-center gap-2 shrink-0">
            <NavbarLogoMark
              visible={navbarLogoVisible}
              customUrl={navbarLogoUrl}
              customAlt={navbarLogoAlt}
              accentColor={accentColor}
              productName={name}
            />
            <div className="flex flex-col items-start text-left leading-tight">
              <span className="font-heading font-bold text-base text-[#1a365d] tracking-tight">
                {name}
              </span>
              {brandSubline && (
                <span className="font-body text-sm font-light text-[#718096] mt-0.5">{brandSubline}</span>
              )}
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 font-body text-base font-light text-[#4a5568]">
            <Link href={`/${slug}/tarife`} className="hover:text-[#02a9e6] transition-colors">Tarifrechner</Link>
            <Link href={`/${slug}/vergleich`} className="hover:text-[#02a9e6] transition-colors">Vergleich</Link>
            <Link href={`/${slug}/faq`} className="hover:text-[#02a9e6] transition-colors">FAQ</Link>
            <Link href="/blog" className="hover:text-[#02a9e6] transition-colors">Blog</Link>
            <Link
              href="#formular"
              className="inline-flex items-center px-5 py-2 rounded-md font-body text-base font-semibold border-[1.5px] transition-all duration-200"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              Angebot anfordern
            </Link>
          </nav>

          {/* Mobile nav — compact icon row */}
          <nav className="flex md:hidden items-center gap-3 font-body text-sm font-normal text-[#4a5568]">
            <Link href={`/${slug}/tarife`} className="hover:text-[#02a9e6] transition-colors">Rechner</Link>
            <Link href={`/${slug}/vergleich`} className="hover:text-[#02a9e6] transition-colors">Vergleich</Link>
            <Link href={`/${slug}/faq`} className="hover:text-[#02a9e6] transition-colors">FAQ</Link>
            <Link
              href="#formular"
              className="px-3 py-1.5 rounded font-body text-sm font-semibold border-[1.5px] transition-all duration-200"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              Anfragen
            </Link>
          </nav>
        </div>
      </header>

      {children}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a3252] text-white/70 py-12 mt-16">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Logo row — uses produkt name as wordmark */}
          <div className="flex justify-center mb-6">
            <MonsterLogo color="#fff" showText text={name} textColor="white" size={34} />
          </div>
          {/* Legal links */}
          <div className="flex flex-wrap justify-center gap-6 font-body text-sm font-light mb-6">
            {[
              { href: `${legalPrefix}/impressum`,   label: 'Impressum' },
              { href: `${legalPrefix}/datenschutz`, label: 'Datenschutz' },
              { href: `${legalPrefix}/kontakt`,     label: 'Kontakt' },
              { href: `${legalPrefix}/agb`,         label: 'AGB' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
            <a
              href="https://finanzteam26.de"
              target="_blank"
              rel="noopener"
              className="hover:text-white transition-colors"
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
