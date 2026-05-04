/**
 * Tarife-Editor — Produktliste.
 * Pro aktivem Produkt: Link zum Inline-Editor + Anzahl Anbietertarife.
 */
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function TarifeListePage() {
  const supabase = createAdminClient()

  const [{ data: produkteRows }, { data: tarifeRows }] = await Promise.all([
    supabase
      .from('produkte')
      .select('id, slug, name, typ, status')
      .neq('status', 'archiviert')
      .order('name', { ascending: true }),
    supabase
      .from('tarife')
      .select('produkt_id, anbieter_name')
      .not('anbieter_name', 'is', null),
  ])

  const produkte = produkteRows ?? []
  const tarife = tarifeRows ?? []

  const tarifeByProdukt = tarife.reduce<Record<string, { count: number; anbieter: Set<string> }>>(
    (acc, row) => {
      const r = row as { produkt_id: string; anbieter_name: string }
      if (!acc[r.produkt_id]) acc[r.produkt_id] = { count: 0, anbieter: new Set() }
      acc[r.produkt_id].count++
      acc[r.produkt_id].anbieter.add(r.anbieter_name)
      return acc
    },
    {},
  )

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-[#333]">Vergleichsrechner-Tarife</h1>
        <p className="mt-1 text-sm text-[#666]">
          Pro Produkt eine Tabelle mit Anbietertarifen. Inline-Edit (Doppelklick auf
          Zelle), Anlegen, Löschen. Strukturachsen werden aus der Versicherungsart-Konfig
          gelesen (Wartezeit / Berufsklasse).
        </p>
      </div>

      <div className="overflow-hidden border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-[#666]">
            <tr>
              <th className="px-4 py-3">Produkt</th>
              <th className="px-4 py-3">Versicherungsart</th>
              <th className="px-4 py-3">Anbieter</th>
              <th className="px-4 py-3">Tarif-Rows</th>
              <th className="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {produkte.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#999]">
                  Keine aktiven Produkte vorhanden.
                </td>
              </tr>
            ) : (
              produkte.map(p => {
                const stats = tarifeByProdukt[(p as { id: string }).id]
                return (
                  <tr key={(p as { id: string }).id} className="border-t border-gray-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#333]">{(p as { name: string }).name}</div>
                      <div className="font-mono text-xs text-[#999]">{(p as { slug: string }).slug}</div>
                    </td>
                    <td className="px-4 py-3 text-[#666]">{(p as { typ: string }).typ}</td>
                    <td className="px-4 py-3 text-[#666]">{stats?.anbieter.size ?? 0}</td>
                    <td className="px-4 py-3 text-[#666]">{stats?.count ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/tarife/${(p as { slug: string }).slug}`}
                        className="text-sm text-[#1a365d] hover:underline"
                      >
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
