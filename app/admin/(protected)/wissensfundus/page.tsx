// Wissensfundus article list page — Server Component.
// Fetches all knowledge base articles from Supabase, filtered by the
// kategorie URL search param. Filter state lives in the URL, not in client state,
// so this page remains a Server Component with full SSR.
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import type { Wissensfundus } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/Badge'
import { DeleteConfirm } from './_components/DeleteConfirm'

// All valid category values for the filter tab bar.
const CATEGORIES = [
  { value: '', label: 'Alle' },
  { value: 'sterbegeld', label: 'Sterbegeld' },
  { value: 'pflege', label: 'Pflege' },
  { value: 'leben', label: 'Leben' },
  { value: 'unfall', label: 'Unfall' },
  { value: 'allgemein', label: 'Allgemein' },
] as const

interface PageProps {
  searchParams: { kategorie?: string }
}

export default async function WissensfundusPage({ searchParams }: PageProps) {
  const supabase = createAdminClient()
  const activeKategorie = searchParams.kategorie ?? ''

  // Build the query — apply kategorie filter when a specific category is active.
  let query = supabase
    .from('wissensfundus')
    .select('*')
    .order('created_at', { ascending: false })

  if (activeKategorie) {
    query = query.eq('kategorie', activeKategorie)
  }

  const { data: rows } = await query
  const artikel: Wissensfundus[] = (rows ?? []).map((row) => ({
    ...row,
    tags: row.tags ?? [],
  }))

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333333]">Wissensfundus</h1>
          <p className="mt-1 text-sm text-[#666666]">
            Wissensartikel für die KI-Content-Generierung verwalten
          </p>
        </div>
        <Link
          href="/admin/wissensfundus/neu"
          className="rounded-lg bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/50"
        >
          Neuen Artikel anlegen
        </Link>
      </div>

      {/* Category filter tab bar — filter state driven by URL search param */}
      <nav className="mb-6 flex gap-1 border-b border-gray-200">
        {CATEGORIES.map((cat) => {
          const isActive = activeKategorie === cat.value
          const href =
            cat.value
              ? `/admin/wissensfundus?kategorie=${cat.value}`
              : '/admin/wissensfundus'
          return (
            <Link
              key={cat.value || 'all'}
              href={href}
              className={[
                'rounded-t-md px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-[#1a365d] text-[#1a365d]'
                  : 'text-[#666666] hover:bg-gray-50 hover:text-[#333333]',
              ].join(' ')}
            >
              {cat.label}
            </Link>
          )
        })}
      </nav>

      {/* Article count */}
      <p className="mb-4 text-xs text-[#999999]">
        {artikel.length} {artikel.length === 1 ? 'Artikel' : 'Artikel'} gefunden
      </p>

      {/* Empty state */}
      {artikel.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-[#666666]">Keine Artikel in dieser Kategorie.</p>
          <Link
            href="/admin/wissensfundus/neu"
            className="mt-3 inline-block text-sm text-[#1a365d] hover:underline"
          >
            Jetzt ersten Artikel anlegen
          </Link>
        </div>
      )}

      {/* Articles table */}
      {artikel.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#999999]">
                  Kategorie
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#999999]">
                  Thema
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#999999] md:table-cell">
                  Inhalt (Vorschau)
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#999999] lg:table-cell">
                  Tags
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#999999]">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {artikel.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Badge variant="neutral">{row.kategorie}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#333333]">{row.thema}</td>
                  <td className="hidden px-4 py-3 text-[#666666] md:table-cell">
                    {row.inhalt.length > 100
                      ? `${row.inhalt.slice(0, 100)}…`
                      : row.inhalt}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(row.tags ?? []).map((tag) => (
                        <Badge key={tag} variant="info">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/wissensfundus/${row.id}`}
                        className="text-sm text-[#1a365d] hover:underline"
                      >
                        Bearbeiten
                      </Link>
                      <DeleteConfirm id={row.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
