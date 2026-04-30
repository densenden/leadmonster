import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { MonsterLogo } from '@/components/MonsterLogo'
import { resolveAccentColor } from '@/lib/utils/accent'

// Always re-fetch — die Startseite ist die Produkt-Übersicht und muss
// CRUD-Operationen aus dem Admin sofort widerspiegeln. Ohne diese Direktive
// wird die Page als statische Page gecacht und zeigt bis zum nächsten Build
// veraltete Daten ("3 alte Produkte").
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'LeadMonster — Versicherungsprodukte',
  description: 'Übersicht aller Versicherungsprodukte im LeadMonster System',
}

const TYP_LABELS: Record<string, string> = {
  sterbegeld: 'Sterbegeld',
  pflege:     'Pflege',
  leben:      'Lebensversicherung',
  unfall:     'Unfall',
}

export default async function HomePage() {
  let produkte: {
    slug: string; name: string; status: string; typ: string; accent_color: string | null
  }[] = []

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('produkte')
      .select('slug, name, status, typ, accent_color')
      .not('status', 'eq', 'archiviert')
      .order('name')
    produkte = data ?? []
  } catch {
    // DB not yet set up — show empty state
  }

  return (
    <main className="min-h-screen bg-[#f7fafc]" style={{ fontFamily: 'var(--font-nunito, Nunito Sans), sans-serif' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between">
        <MonsterLogo showText size={40} color="#02a9e6" />
        <Link
          href="/admin"
          className="text-sm font-semibold border-[1.5px] border-[#1a3252] text-[#1a3252] px-4 py-1.5 rounded-md hover:bg-[#1a3252] hover:text-white transition-all duration-200"
        >
          Admin
        </Link>
      </header>

      {/* ── Hero band ─────────────────────────────────────────────────────── */}
      <div className="bg-[#1a3252] text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-roboto, Roboto), sans-serif' }}>
            Versicherungsprodukte
          </h1>
          <p className="text-white/60 text-sm">
            Alle Microsites und Landingpages auf einen Blick
          </p>
        </div>
      </div>

      {/* ── Product grid ──────────────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {produkte.map((p) => {
            const accent = resolveAccentColor(p.typ, p.accent_color)
            return (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="group block bg-white border border-[#e2e8f0] rounded-lg overflow-hidden hover:shadow-md hover:border-[#02a9e6] transition-all duration-200"
              >
                {/* Accent top bar */}
                <div className="h-1" style={{ backgroundColor: accent }} />

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <MonsterLogo color={accent} size={36} />
                    <span className="text-xs font-semibold text-[#718096] uppercase tracking-widest">
                      {TYP_LABELS[p.typ] ?? p.typ}
                    </span>
                  </div>

                  <h2 className="font-bold text-[#1a3252] text-lg leading-snug mb-1"
                    style={{ fontFamily: 'var(--font-roboto, Roboto), sans-serif' }}>
                    {p.name}
                  </h2>
                  <p className="text-xs text-[#718096] font-mono mb-4">/{p.slug}</p>

                  <div className="flex items-center justify-between">
                    {/* Status tag — outline style */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${
                        p.status === 'aktiv'
                          ? 'border-green-500 text-green-700 bg-green-50'
                          : 'border-amber-400 text-amber-700 bg-amber-50'
                      }`}
                    >
                      {p.status}
                    </span>
                    <span
                      className="text-sm font-semibold border-b border-transparent group-hover:border-current transition-colors"
                      style={{ color: accent }}
                    >
                      Zur Seite →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Add new product — outline dashed card */}
          <Link
            href="/admin/produkte/neu"
            className="group flex flex-col items-center justify-center bg-white border-[1.5px] border-dashed border-[#cbd5e0] rounded-lg hover:border-[#02a9e6] hover:bg-[#e1f0fb] transition-all duration-200 p-6 min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-full border-[1.5px] border-[#cbd5e0] group-hover:border-[#02a9e6] flex items-center justify-center mb-3 transition-colors">
              <span className="text-xl text-[#a0aec0] group-hover:text-[#02a9e6] leading-none transition-colors">+</span>
            </div>
            <span className="text-sm font-semibold text-[#718096] group-hover:text-[#02a9e6] transition-colors">
              Neues Produkt
            </span>
          </Link>
        </div>

        {produkte.length === 0 && (
          <p className="mt-8 text-center text-sm text-[#a0aec0]">
            Noch keine Produkte — starten Sie mit &quot;Neues Produkt&quot;.
          </p>
        )}
      </div>
    </main>
  )
}
