/**
 * Versicherungsarten-Liste — Server Component.
 *
 * Zeigt alle Einträge aus produkt_typen (aktiv + archiviert). Jede Zeile linkt
 * auf den Editor unter /admin/produkt-typen/[slug]. Pro Typ werden zusätzlich
 * Quick-Stats angezeigt: Anzahl aktiver Produkte, Anzahl Anbietertarife,
 * konfigurierte Filter-Achsen.
 */
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { untyped } from '@/lib/supabase/untyped'
import type { FilterAxis } from '@/lib/tarife/filter-config-schema'

export const dynamic = 'force-dynamic'

interface TypRow {
  slug: string
  name: string
  einheit: string
  active: boolean
  filter_axes: FilterAxis[] | null
  updated_at: string
}

export default async function ProduktTypenListePage() {
  const supabase = createAdminClient()
  const sb = untyped(supabase)

  const [{ data: typenRows }, { data: produkteRows }, { data: tarifeRows }] = await Promise.all([
    sb
      .from('produkt_typen')
      .select('slug, name, einheit, active, filter_axes, updated_at')
      .order('active', { ascending: false })
      .order('name', { ascending: true }),
    supabase.from('produkte').select('typ').neq('status', 'archiviert'),
    supabase.from('tarife').select('produkt_id, anbieter_name'),
  ])

  const typen = (typenRows ?? []) as TypRow[]
  const produkte = produkteRows ?? []
  const tarife = tarifeRows ?? []

  const produkteByTyp = produkte.reduce<Record<string, number>>((acc, row) => {
    const t = (row as { typ: string }).typ
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})

  const anbieterTarifeCount = tarife.filter(
    r => (r as { anbieter_name: string | null }).anbieter_name,
  ).length

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333333]">
            Versicherungsarten
          </h1>
          <p className="mt-1 text-sm text-[#666666]">
            Pro Versicherungsart pflegt das System Summen-Optionen, Filter-Achsen
            und Brand-Look. Wird von Vergleichsrechner, Hero-Bildern und
            Wissensfundus-Kategorisierung gelesen.
          </p>
        </div>
        <Link
          href="/admin/produkt-typen/neu"
          className="bg-[#1a365d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 rounded-none"
        >
          + Neue Versicherungsart
        </Link>
      </div>

      <div className="overflow-hidden border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-[#666666]">
            <tr>
              <th className="px-4 py-3">Slug / Name</th>
              <th className="px-4 py-3">Einheit</th>
              <th className="px-4 py-3">Filter-Achsen</th>
              <th className="px-4 py-3">Produkte</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {typen.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#999]">
                  Keine Versicherungsarten konfiguriert.
                </td>
              </tr>
            ) : (
              typen.map(t => {
                const axes = Array.isArray(t.filter_axes) ? t.filter_axes : []
                return (
                  <tr key={t.slug} className="border-t border-gray-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#333]">{t.name}</div>
                      <div className="font-mono text-xs text-[#999]">{t.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-[#666]">{t.einheit}</td>
                    <td className="px-4 py-3">
                      {axes.length === 0 ? (
                        <span className="text-xs text-[#999]">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {axes.map(a => (
                            <span
                              key={a.key}
                              className="bg-gray-100 px-2 py-0.5 text-xs text-[#666]"
                            >
                              {a.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#666]">{produkteByTyp[t.slug] ?? 0}</td>
                    <td className="px-4 py-3">
                      {t.active ? (
                        <span className="bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          aktiv
                        </span>
                      ) : (
                        <span className="bg-gray-100 px-2 py-0.5 text-xs text-[#999]">
                          archiviert
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/produkt-typen/${t.slug}`}
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

      <p className="mt-6 text-xs text-[#999]">
        Anbietertarife in tarife (gesamt): {anbieterTarifeCount}.
      </p>
    </div>
  )
}
