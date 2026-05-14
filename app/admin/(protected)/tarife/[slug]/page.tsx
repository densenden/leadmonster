/**
 * Tarife-Editor pro Produkt — lädt alle Anbietertarife und gibt sie an die
 * TarifTable-Client-Komponente. Dynamische Spalten je nach
 * `produkt_typen.filter_axes` (Wartezeit, Berufsklasse, …).
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { untyped } from '@/lib/supabase/untyped'
import { getProduktConfigFromDb } from '@/lib/tarife/produkt-config-db'
import { TarifTable } from '../_components/TarifTable'
import { CsvImport } from '../_components/CsvImport'
import type { FilterAxis } from '@/lib/tarife/filter-config-schema'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { slug: string }
}

interface RawTarifRow {
  id: string
  produkt_id: string
  anbieter_name: string
  tarif_name: string | null
  alter_von: number
  alter_bis: number
  summe: number
  beitrag_low: number
  beitrag_high: number
  einheit: 'eur_summe' | 'eur_monat'
  berufsklasse: string | null
  besonderheiten: Record<string, unknown> | null
}

export default async function TarifeEditorPage({ params }: PageProps) {
  const supabase = createAdminClient()

  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug, name, typ')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!produkt) {
    notFound()
  }

  const config = await getProduktConfigFromDb(produkt.typ as string)
  const filterAxes: FilterAxis[] = config.filter_axes ?? []

  const sb = untyped(supabase)
  const { data: rows } = await sb
    .from('tarife')
    .select(
      'id, produkt_id, anbieter_name, tarif_name, alter_von, alter_bis, summe, ' +
        'beitrag_low, beitrag_high, einheit, berufsklasse, besonderheiten',
    )
    .eq('produkt_id', produkt.id)
    .not('anbieter_name', 'is', null)
    .order('anbieter_name', { ascending: true })
    .order('alter_von', { ascending: true })
    .order('summe', { ascending: true })

  const tarife = (rows ?? []) as RawTarifRow[]

  const distinctAnbieter = Array.from(
    new Set(tarife.map(r => r.anbieter_name)),
  ).sort()

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <nav className="mb-6 text-sm text-[#999]">
        <Link href="/admin/tarife" className="hover:text-[#1a365d] hover:underline">
          Vergleichsrechner-Tarife
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#333]">{produkt.name as string}</span>
      </nav>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333]">
            Tarife: {produkt.name as string}
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            <span className="font-mono">{produkt.slug as string}</span> · Typ:{' '}
            <span className="font-mono">{produkt.typ as string}</span> · {tarife.length}{' '}
            Tarif-Zeilen
          </p>
        </div>
        <Link
          href={`/admin/produkt-typen/${produkt.typ}`}
          className="text-sm text-[#1a365d] hover:underline"
        >
          Achsen / Default-Config bearbeiten →
        </Link>
      </div>

      {filterAxes.length > 0 && (
        <div className="mb-6 border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-[#333]">
            Aktive Filter-Achsen für {produkt.typ}
          </h2>
          <ul className="text-xs text-[#666] space-y-1">
            {filterAxes.map(a => (
              <li key={a.key}>
                <span className="font-mono">{a.key}</span> ({a.source}, {a.type}) — &bdquo;{a.label}&ldquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      <TarifTable
        produktId={produkt.id as string}
        einheit={config.summe_suffix.includes('Monat') ? 'eur_monat' : 'eur_summe'}
        tarife={tarife}
        filterAxes={filterAxes}
        distinctAnbieter={distinctAnbieter}
      />

      <CsvImport produktId={produkt.id as string} produktSlug={produkt.slug as string} />
    </div>
  )
}
