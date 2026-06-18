// Redaktions-Liste — Server Component.
// Zeigt alle Autoren mit Foto, Rolle, Expertise + Counter "Christian betreut N Produkte / M Artikel".
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import type { Redaktion } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/Badge'
import { DeleteAutor } from './_components/DeleteAutor'
import { TogglePublic } from './_components/TogglePublic'
import { PortraitCircle } from '@/components/ui/PortraitCircle'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { filter?: string }
}

interface RedaktionWithCounts extends Redaktion {
  produkt_count: number
  content_count: number
  blog_count: number
  wissen_count: number
}

export default async function RedaktionListPage({ searchParams }: PageProps) {
  const supabase = createAdminClient()
  const filter = searchParams.filter ?? 'all'

  let query = supabase
    .from('redaktion')
    .select('*')
    .order('nachname', { ascending: true })

  if (filter === 'public') query = query.eq('public', true)
  if (filter === 'hidden') query = query.eq('public', false)

  const { data: rows } = await query
  const autoren = rows ?? []

  // Counter pro Autor — 4 parallele Queries pro ID
  const counts: RedaktionWithCounts[] = await Promise.all(
    autoren.map(async (a) => {
      const [{ count: pCount }, { count: cCount }, { count: bCount }, { count: wCount }] = await Promise.all([
        supabase.from('produkte').select('id', { count: 'exact', head: true }).eq('standard_autor_id', a.id),
        supabase.from('generierter_content').select('id', { count: 'exact', head: true }).eq('autor_id', a.id),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('autor_id', a.id),
        supabase.from('wissensfundus').select('id', { count: 'exact', head: true }).eq('autor_id', a.id),
      ])
      return {
        ...a,
        produkt_count: pCount ?? 0,
        content_count: cCount ?? 0,
        blog_count: bCount ?? 0,
        wissen_count: wCount ?? 0,
      }
    })
  )

  const filterTabs = [
    { value: 'all', label: 'Alle' },
    { value: 'public', label: 'Öffentlich' },
    { value: 'hidden', label: 'Versteckt' },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333]">Redaktion</h1>
          <p className="mt-1 text-sm text-[#666]">
            Autoren-Profile mit E-E-A-T-Daten verwalten — Foto, Bio, § 34d, Vermittlerregister.
          </p>
        </div>
        <Link
          href="/admin/redaktion/neu"
          className="rounded-lg bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90"
        >
          Neuen Autor anlegen
        </Link>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-gray-200">
        {filterTabs.map(tab => {
          const isActive = filter === tab.value
          const href = tab.value === 'all' ? '/admin/redaktion' : `/admin/redaktion?filter=${tab.value}`
          return (
            <Link
              key={tab.value}
              href={href}
              className={[
                'rounded-t-md px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-[#1a365d] text-[#1a365d]'
                  : 'text-[#666] hover:bg-gray-50 hover:text-[#333]',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {counts.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-[#666]">Keine Autoren angelegt.</p>
          <Link href="/admin/redaktion/neu" className="mt-3 inline-block text-sm text-[#1a365d] hover:underline">
            Jetzt ersten Autor anlegen
          </Link>
        </div>
      )}

      {counts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {counts.map(a => (
            <article key={a.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start gap-4">
                {a.foto_url
                  ? <PortraitCircle src={a.foto_url} alt={a.foto_alt ?? `${a.vorname} ${a.nachname}`} className="h-20 w-20 border border-gray-200" />
                  : <div className="h-20 w-20 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-400">{a.vorname[0]}{a.nachname[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading text-lg font-bold text-[#333]">
                    {[a.titel, a.vorname, a.nachname].filter(Boolean).join(' ')}
                  </h2>
                  <p className="text-sm text-[#666]">{a.rolle}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(a.expertise ?? []).slice(0, 6).map(e => (
                      <Badge key={e} variant="info">{e}</Badge>
                    ))}
                  </div>
                </div>
                <TogglePublic id={a.id} value={a.public} />
              </div>

              <dl className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-[#666] border-t border-gray-100 pt-3">
                <div><dt className="text-[10px] uppercase tracking-wide">Produkte</dt><dd className="text-base font-semibold text-[#1a365d]">{a.produkt_count}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-wide">Content</dt><dd className="text-base font-semibold text-[#1a365d]">{a.content_count}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-wide">Blog</dt><dd className="text-base font-semibold text-[#1a365d]">{a.blog_count}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-wide">Wissen</dt><dd className="text-base font-semibold text-[#1a365d]">{a.wissen_count}</dd></div>
              </dl>

              <div className="mt-4 flex items-center justify-between">
                <Link href={`/admin/redaktion/${a.id}`} className="text-sm text-[#1a365d] hover:underline">
                  Bearbeiten
                </Link>
                <div className="flex items-center gap-3">
                  {a.public && (
                    <Link
                      href={`/redaktion/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#666] hover:text-[#333]"
                    >
                      Profil öffnen ↗
                    </Link>
                  )}
                  <DeleteAutor id={a.id} name={`${a.vorname} ${a.nachname}`} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
