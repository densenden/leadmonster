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

export default async function WissenIndexPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('wissensfundus')
    .select('slug, thema, kategorie, inhalt')
    .eq('published', true)
    .not('slug', 'is', null)
    .order('kategorie', { ascending: true })

  const entries = (data ?? []) as WissenRow[]

  // Gruppieren nach Kategorie
  const grouped: Record<string, WissenRow[]> = {}
  for (const e of entries) {
    grouped[e.kategorie] = grouped[e.kategorie] ?? []
    grouped[e.kategorie].push(e)
  }
  const kategorieLabel: Record<string, string> = {
    allgemein: 'Allgemein',
    sterbegeld: 'Sterbegeld',
    pflege: 'Pflege',
    leben: 'Risikoleben',
    bu: 'Berufsunfähigkeit',
    unfall: 'Unfallversicherung',
  }

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-[#1a365d] mb-2">Wissensbasis</h1>
      <p className="text-lg text-gray-600 mb-10">
        Versicherungswissen kompakt und verständlich erklärt.
      </p>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-gray-500">Wissensbasis ist noch leer.</p>
      ) : (
        Object.entries(grouped).map(([kat, rows]) => (
          <section key={kat} className="mb-10">
            <h2 className="text-2xl font-bold text-[#1a365d] mb-4">{kategorieLabel[kat] ?? kat}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map(r => (
                <li key={r.slug}>
                  <Link
                    href={`/wissen/${r.slug}`}
                    className="block bg-white border border-gray-200 rounded-md p-4 hover:border-[#02a9e6] hover:shadow-sm transition-all"
                  >
                    <h3 className="font-semibold text-[#1a365d] mb-1">{r.thema}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {r.inhalt.replace(/[#*`]/g, '').slice(0, 130)}…
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}
