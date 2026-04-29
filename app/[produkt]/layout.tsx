import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { MonsterLogo } from '@/components/MonsterLogo'
import { resolveAccentColor } from '@/lib/utils/accent'

export default async function ProduktLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { produkt: string }
}) {
  // Fetch accent color for this product — fallback gracefully if DB unavailable.
  let accentColor = '#02a9e6'
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('produkte')
      .select('typ, accent_color')
      .eq('slug', params.produkt)
      .maybeSingle()
    if (data) {
      accentColor = resolveAccentColor(data.typ, data.accent_color)
    }
  } catch {
    // Keep default
  }

  return (
    <div style={{ '--accent': accentColor } as React.CSSProperties}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#e2e8f0]">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/">
            <MonsterLogo color={accentColor} showText size={38} />
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-[#4a5568]">
            <Link href={`/${params.produkt}/tarife`} className="hover:text-[#02a9e6] transition-colors">Tarifrechner</Link>
            <Link href={`/${params.produkt}/vergleich`} className="hover:text-[#02a9e6] transition-colors">Vergleich</Link>
            <Link href={`/${params.produkt}/faq`} className="hover:text-[#02a9e6] transition-colors">FAQ</Link>
            <Link href={`/${params.produkt}/ratgeber`} className="hover:text-[#02a9e6] transition-colors">Ratgeber</Link>
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
            <Link href={`/${params.produkt}/tarife`} className="hover:text-[#02a9e6] transition-colors">Rechner</Link>
            <Link href={`/${params.produkt}/vergleich`} className="hover:text-[#02a9e6] transition-colors">Vergleich</Link>
            <Link href={`/${params.produkt}/faq`} className="hover:text-[#02a9e6] transition-colors">FAQ</Link>
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
          {/* Logo row */}
          <div className="flex justify-center mb-6">
            <MonsterLogo color="#fff" showText textColor="white" size={34} />
          </div>
          {/* Legal links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm mb-6">
            {[
              { href: `/${params.produkt}/impressum`,   label: 'Impressum' },
              { href: `/${params.produkt}/datenschutz`, label: 'Datenschutz' },
              { href: `/${params.produkt}/kontakt`,     label: 'Kontakt' },
              { href: `/${params.produkt}/agb`,         label: 'AGB' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-white/40">
            © {new Date().getFullYear()} LeadMonster — Alle Rechte vorbehalten
          </p>
        </div>
      </footer>
    </div>
  )
}
