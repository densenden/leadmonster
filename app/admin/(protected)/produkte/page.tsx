// Product list page — Server Component.
// Fetches all products from Supabase and renders them in an admin table.
// Auth guard is inherited from app/admin/(protected)/layout.tsx.
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { DeleteProduktButton } from './_components/DeleteProduktButton'
import type { Produkt, ProduktStatus } from '@/lib/supabase/types'
import type { BadgeVariant } from '@/components/ui/Badge'

// Maps product status values to Badge variant names.
const STATUS_BADGE: Record<ProduktStatus, BadgeVariant> = {
  entwurf: 'neutral',
  aktiv: 'success',
  archiviert: 'danger',
}

// German display labels for product types.
const TYP_LABELS: Record<string, string> = {
  sterbegeld: 'Sterbegeld',
  pflege: 'Pflege',
  leben: 'Leben',
  unfall: 'Unfall',
}

export default async function ProdukteListPage() {
  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('produkte')
    .select('*')
    .order('created_at', { ascending: false })

  const produkte: Produkt[] = (rows ?? []) as Produkt[]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333333]">Produkte</h1>
          <p className="mt-1 text-sm text-[#666666]">
            Versicherungsprodukte verwalten und Content generieren
          </p>
        </div>
        <Link
          href="/admin/produkte/neu"
          className="bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
        >
          Neues Produkt
        </Link>
      </div>

      {/* Empty state */}
      {produkte.length === 0 && (
        <div className="border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-[#666666]">
            Noch keine Produkte angelegt. Erstellen Sie Ihr erstes Produkt.
          </p>
          <Link
            href="/admin/produkte/neu"
            className="mt-3 inline-block text-sm text-[#1a365d] hover:underline"
          >
            Jetzt erstes Produkt anlegen
          </Link>
        </div>
      )}

      {/* Products table */}
      {produkte.length > 0 && (
        <div className="overflow-hidden border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-[#1a365d]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white">
                  Typ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white md:table-cell">
                  Erstellt am
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produkte.map((produkt) => (
                <tr key={produkt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#333333]">
                    {produkt.name}
                  </td>
                  <td className="px-4 py-3 text-[#666666]">
                    {TYP_LABELS[produkt.typ] ?? produkt.typ}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[produkt.status] ?? 'neutral'}>
                      {produkt.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-[#666666] md:table-cell">
                    {produkt.created_at
                      ? new Date(produkt.created_at).toLocaleDateString('de-DE')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {produkt.slug && (
                        <Link
                          href={`/${produkt.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#02a9e6] hover:underline"
                          title={`Live-Seite öffnen: /${produkt.slug}`}
                        >
                          Live ↗
                        </Link>
                      )}
                      <Link
                        href={`/admin/produkte/${produkt.id}`}
                        className="text-sm text-[#1a365d] hover:underline"
                      >
                        Bearbeiten
                      </Link>
                      <Link
                        href={`/admin/produkte/${produkt.id}/content`}
                        className="text-sm text-[#666666] hover:underline"
                      >
                        Content
                      </Link>
                      <DeleteProduktButton id={produkt.id} name={produkt.name} />
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
