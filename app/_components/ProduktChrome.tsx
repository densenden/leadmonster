// Header + Footer für Produkt-Hauptseiten.
// Wird sowohl von app/[produkt]/layout.tsx als auch von app/page.tsx verwendet —
// letzteres rendert das Root-Produkt (sterbegeld24plus) unter `/`. Daher sind
// `homePath` und `legalPathPrefix` als Props variabel.
import Link from 'next/link'
import { MonsterLogo } from '@/components/MonsterLogo'
import { LEGAL_NAME } from '@/lib/seo/organization'

export interface ProduktChromeProps {
  /** URL-Slug des Produkts. Wird für Sub-Routen-Links verwendet. */
  slug: string
  /** Anzeige-Name im Logo + Footer. */
  name: string
  /** Akzentfarbe (z. B. resolveAccentColor). */
  accentColor: string
  /** Pfad zur Produkt-Hauptseite — '/' für Root-Produkt, sonst '/<slug>'. */
  homePath?: string
  /**
   * Präfix für Legal-Pages (Impressum/Datenschutz/Kontakt/AGB).
   * '/<slug>' für nicht-Root-Produkte (z. B. '/bu/impressum').
   * '' für Root-Produkt — Legal-Pages liegen top-level (z. B. '/impressum').
   */
  legalPathPrefix?: string
  /**
   * Optionale Sub-Brand-Zeile rechts vom Logo (z. B. „handwerker.bu" auf /bu).
   * Aus produkte.brand_subline. Phase 4 § 8 Mitigation 1.
   */
  brandSubline?: string | null
  children: React.ReactNode
}

export function ProduktChrome({
  slug,
  name,
  accentColor,
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
          <Link href={home} className="flex items-baseline gap-2">
            <MonsterLogo color={accentColor} showText text={name} size={38} />
            {brandSubline && (
              <span className="hidden sm:inline text-xs font-mono text-[#718096] -ml-1">
                · {brandSubline}
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-[#4a5568]">
            <Link href={`/${slug}/tarife`} className="hover:text-[#02a9e6] transition-colors">Tarifrechner</Link>
            <Link href={`/${slug}/vergleich`} className="hover:text-[#02a9e6] transition-colors">Vergleich</Link>
            <Link href={`/${slug}/faq`} className="hover:text-[#02a9e6] transition-colors">FAQ</Link>
            <Link href="/blog" className="hover:text-[#02a9e6] transition-colors">Blog</Link>
            <Link
              href="#formular"
              className="inline-flex items-center px-5 py-2 rounded-md text-sm font-semibold border-[1.5px] transition-all duration-200"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              Angebot anfordern
            </Link>
          </nav>

          {/* Mobile nav — compact icon row */}
          <nav className="flex md:hidden items-center gap-3 text-xs font-semibold text-[#4a5568]">
            <Link href={`/${slug}/tarife`} className="hover:text-[#02a9e6] transition-colors">Rechner</Link>
            <Link href={`/${slug}/vergleich`} className="hover:text-[#02a9e6] transition-colors">Vergleich</Link>
            <Link href={`/${slug}/faq`} className="hover:text-[#02a9e6] transition-colors">FAQ</Link>
            <Link
              href="#formular"
              className="px-3 py-1.5 rounded text-xs font-semibold border-[1.5px] transition-all duration-200"
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
          <div className="flex flex-wrap justify-center gap-6 text-sm mb-6">
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
