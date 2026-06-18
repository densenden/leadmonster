// Übersicht aller öffentlichen Autoren-Profile.
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { PortraitCircle } from '@/components/ui/PortraitCircle'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Redaktion — finanzteam26',
  description:
    'Unsere Versicherungsmakler und Vorsorge-Experten — § 34d-zertifiziert, mit '
    + 'jahrzehntelanger Praxis im Versicherungsmarkt.',
}

export default async function RedaktionListPage() {
  const supabase = createAdminClient()
  const { data: autoren } = await supabase
    .from('redaktion')
    .select('id, slug, vorname, nachname, titel, rolle, kurz_bio, foto_url, foto_alt, expertise, jahre_erfahrung')
    .eq('public', true)
    .order('nachname', { ascending: true })

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-[#1a3252] mb-3">Redaktion</h1>
        <p className="text-lg text-[#4a5568] max-w-2xl mx-auto">
          Unsere Versicherungsmakler und Vorsorge-Experten — § 34d-zertifiziert,
          eingetragen bei der IHK München, mit jahrzehntelanger Praxis.
        </p>
      </header>

      {(autoren ?? []).length === 0 && (
        <p className="text-center text-[#666]">Aktuell keine Autoren-Profile öffentlich.</p>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(autoren ?? []).map(a => (
          <li key={a.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <Link href={`/redaktion/${a.slug}`} className="flex items-start gap-4 group">
              {a.foto_url
                ? <PortraitCircle
                    src={a.foto_url}
                    alt={a.foto_alt ?? `${a.vorname} ${a.nachname}`}
                    width={96}
                    height={96}
                    className="h-24 w-24 border border-gray-200"
                  />
                : <div className="h-24 w-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg text-gray-400 shrink-0">
                    {a.vorname[0]}{a.nachname[0]}
                  </div>
              }
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-xl text-[#1a3252] group-hover:text-[#02a9e6] transition-colors">
                  {[a.titel, a.vorname, a.nachname].filter(Boolean).join(' ')}
                </h2>
                <p className="text-sm text-[#666]">{a.rolle}</p>
                {a.jahre_erfahrung && (
                  <p className="mt-2 text-xs uppercase tracking-wider text-[#02a9e6] font-semibold">
                    {a.jahre_erfahrung}+ Jahre Erfahrung
                  </p>
                )}
                <p className="mt-3 text-sm text-[#4a5568] line-clamp-3">{a.kurz_bio}</p>
                {(a.expertise ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(a.expertise ?? []).slice(0, 5).map(e => (
                      <span key={e} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#abd5f4]/30 text-[#1a3252]">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
