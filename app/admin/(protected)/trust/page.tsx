// Trust-Bausteine Liste — Server Component.
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { TRUST_TYPE_LABELS } from '@/lib/validation/trust'
import { Badge } from '@/components/ui/Badge'
import { DeleteTrust } from './_components/DeleteTrust'
import { ToggleTrust } from './_components/ToggleTrust'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { typ?: string }
}

export default async function TrustListPage({ searchParams }: PageProps) {
  const supabase = createAdminClient()
  const typ = searchParams.typ ?? ''

  let query = supabase
    .from('trust_baustein')
    .select('*, produkte:produkt_id(name, slug)')
    .order('reihenfolge', { ascending: true })
  if (typ) query = query.eq('typ', typ)

  const { data: rows } = await query
  const items = rows ?? []

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333]">Trust-Bausteine</h1>
          <p className="mt-1 text-sm text-[#666]">
            Pressezitate, Siegel, Kundenstimmen, Partner-Logos &amp; Verbände — global oder pro Produkt.
          </p>
        </div>
        <Link
          href="/admin/trust/neu"
          className="rounded-lg bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90"
        >
          Neuen Trust-Baustein
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
        <Link
          href="/admin/trust"
          className={`rounded-t-md px-4 py-2 text-sm font-medium ${typ === '' ? 'border-b-2 border-[#1a365d] text-[#1a365d]' : 'text-[#666] hover:text-[#333]'}`}
        >
          Alle
        </Link>
        {Object.entries(TRUST_TYPE_LABELS).map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/trust?typ=${k}`}
            className={`rounded-t-md px-4 py-2 text-sm font-medium ${typ === k ? 'border-b-2 border-[#1a365d] text-[#1a365d]' : 'text-[#666] hover:text-[#333]'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-[#666]">Keine Trust-Bausteine vorhanden.</p>
          <Link href="/admin/trust/neu" className="mt-3 inline-block text-sm text-[#1a365d] hover:underline">
            Jetzt ersten anlegen
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(b => {
            const produkt = b.produkte as { name: string; slug: string } | null
            return (
              <li key={b.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-[80px_1fr_auto] gap-4 items-start">
                  {b.bild_url
                    ? <img src={b.bild_url} alt={b.bild_alt ?? ''} className="h-16 w-16 object-contain border border-gray-200 bg-white rounded p-1" />
                    : <div className="h-16 w-16 rounded bg-gray-100 border border-gray-200" />
                  }
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="info">{TRUST_TYPE_LABELS[b.typ as keyof typeof TRUST_TYPE_LABELS] ?? b.typ}</Badge>
                      {b.jahr && <Badge variant="neutral">{b.jahr}</Badge>}
                      {produkt && <Badge variant="neutral">→ {produkt.slug}</Badge>}
                      {!produkt && <Badge variant="neutral">global</Badge>}
                      {!b.belegt_durch && <Badge variant="danger">Beleg fehlt</Badge>}
                    </div>
                    <p className="font-medium text-[#333]">{b.titel}</p>
                    {b.body && <p className="text-sm text-[#666] line-clamp-2 mt-1">{b.body}</p>}
                    {b.quelle_url && (
                      <p className="text-xs text-[#02a9e6] mt-1">
                        <a href={b.quelle_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {b.quelle_name ?? 'Quelle'} ↗
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ToggleTrust id={b.id} value={b.aktiv} />
                    <Link href={`/admin/trust/${b.id}`} className="text-sm text-[#1a365d] hover:underline">
                      Bearbeiten
                    </Link>
                    <DeleteTrust id={b.id} titel={b.titel} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
