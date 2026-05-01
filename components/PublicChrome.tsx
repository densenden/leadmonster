// Gemeinsamer Header + Footer für öffentliche, nicht-produktspezifische Seiten
// (/wissen, /blog). Produktseiten haben ihren eigenen Layout-Header in
// app/[produkt]/layout.tsx, weil dort Logo-Akzent + Produktname dynamisch sind.
import Link from 'next/link'
import { MonsterLogo } from '@/components/MonsterLogo'
import { TrustFooterStrip } from '@/components/sections/trust/TrustFooterStrip'

const ACCENT = '#02a9e6'

export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7fafc]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#e2e8f0]">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <MonsterLogo color={ACCENT} showText text="finanzteam26" size={38} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#4a5568]">
            <Link href="/" className="hover:text-[#02a9e6] transition-colors">Produkte</Link>
            <Link href="/wissen" className="hover:text-[#02a9e6] transition-colors">Wissensbasis</Link>
            <Link href="/blog" className="hover:text-[#02a9e6] transition-colors">Blog</Link>
            <Link href="/redaktion" className="hover:text-[#02a9e6] transition-colors">Redaktion</Link>
          </nav>

          {/* Mobile nav — kompakt */}
          <nav className="flex md:hidden items-center gap-4 text-xs font-semibold text-[#4a5568]">
            <Link href="/" className="hover:text-[#02a9e6] transition-colors">Produkte</Link>
            <Link href="/wissen" className="hover:text-[#02a9e6] transition-colors">Wissen</Link>
            <Link href="/blog" className="hover:text-[#02a9e6] transition-colors">Blog</Link>
            <Link href="/redaktion" className="hover:text-[#02a9e6] transition-colors">Redaktion</Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a3252] text-white/70 py-12 mt-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex justify-center mb-6">
            <MonsterLogo color="#fff" showText text="finanzteam26" textColor="white" size={34} />
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm mb-6">
            <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <Link href="/erstinformation" className="hover:text-white transition-colors">Erstinformation</Link>
            <Link href="/redaktion" className="hover:text-white transition-colors">Redaktion</Link>
            <Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link>
          </div>
          {/* Trust-Strip: Verbände + Aufsicht + Berufshaftpflicht (E-E-A-T-Signal) */}
          <TrustFooterStrip />
          <p className="text-center text-xs text-white/40 mt-6">
            © {new Date().getFullYear()} finanzteam26 — Alle Rechte vorbehalten
          </p>
        </div>
      </footer>
    </div>
  )
}
