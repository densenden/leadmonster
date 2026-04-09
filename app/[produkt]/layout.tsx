import Link from 'next/link'
import Image from 'next/image'

export default function ProduktLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="LeadMonster" width={130} height={40} priority />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="#faq" className="hover:text-[#1a365d] transition-colors">FAQ</Link>
            <Link href="#formular" className="hover:text-[#1a365d] transition-colors">Anfragen</Link>
            <Link
              href="#formular"
              className="bg-[#d4af37] hover:bg-[#b8860b] text-white px-4 py-2 transition-colors"
            >
              Angebot anfordern
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="bg-[#1a365d] text-white/70 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-sm text-center">
          © {new Date().getFullYear()} LeadMonster — Alle Rechte vorbehalten
        </div>
      </footer>
    </>
  )
}
