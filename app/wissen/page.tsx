// Public Wissen-Index — listet alle published wissensfundus-Einträge.
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Wissensbasis — finanzteam26',
  description:
    'Versicherungswissen kompakt: Sterbegeld, Pflege, Risikoleben, BU und Unfall — alle wichtigen Begriffe verständlich erklärt.',
}

interface WissenRow {
  slug: string
  thema: string
  kategorie: string
  inhalt: string
}

const KATEGORIE_LABEL: Record<string, string> = {
  allgemein: 'Allgemein',
  sterbegeld: 'Sterbegeld',
  pflege: 'Pflege',
  leben: 'Risikoleben',
  bu: 'Berufsunfähigkeit',
  unfall: 'Unfallversicherung',
}

const KATEGORIE_REIHENFOLGE = ['allgemein', 'sterbegeld', 'pflege', 'leben', 'bu', 'unfall']

export default async function WissenIndexPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('wissensfundus')
    .select('slug, thema, kategorie, inhalt')
    .eq('published', true)
    .not('slug', 'is', null)
    .order('thema', { ascending: true })

  const entries = (data ?? []) as WissenRow[]

  const grouped: Record<string, WissenRow[]> = {}
  for (const e of entries) {
    grouped[e.kategorie] = grouped[e.kategorie] ?? []
    grouped[e.kategorie].push(e)
  }
  const orderedKats = [
    ...KATEGORIE_REIHENFOLGE.filter(k => grouped[k]),
    ...Object.keys(grouped).filter(k => !KATEGORIE_REIHENFOLGE.includes(k)),
  ]

  return (
    <>
      {/* ── Hero-Band ─────────────────────────────────────────────────── */}
      <section className="bg-[#1a3252] text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <h1 className="text-4xl font-bold mb-3">Wissensbasis</h1>
          <p className="text-lg text-white/70 max-w-2xl">
            Versicherungswissen kompakt und verständlich erklärt — von Sterbegeld bis Berufsunfähigkeit.
          </p>
        </div>
      </section>

      <main className="max-w-[1200px] mx-auto px-6 py-12">
        {entries.length === 0 ? (
          <p className="text-gray-500">Wissensbasis ist noch leer.</p>
        ) : (
          orderedKats.map(kat => (
            <section key={kat} className="mb-12">
              <h2 className="text-2xl font-bold text-[#1a3252] mb-5">
                {KATEGORIE_LABEL[kat] ?? kat}
              </h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[kat].map(r => (
                  <li key={r.slug}>
                    <Link
                      href={`/wissen/${r.slug}`}
                      className="group block bg-white border border-gray-200 rounded-lg p-5 hover:border-[#02a9e6] hover:shadow-md transition-all h-full"
                    >
                      <h3 className="font-semibold text-[#1a3252] group-hover:text-[#02a9e6] transition-colors mb-2 leading-snug">
                        {r.thema}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-3">
                        {r.inhalt.replace(/[#*`]/g, '').replace(/\n+/g, ' ').slice(0, 140)}…
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </>
  )
}
