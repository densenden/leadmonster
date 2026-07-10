// Public tariff comparison page — VergleichsRechner with Wartezeit filter + DB tarife.
// Replaces the old Marktkorridor-only TarifRechner on this URL so users see
// per-insurer rows (Allianz, DELA, …) including Wartezeit column.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { generateHowToSchema } from '@/lib/seo/schema'
import { VergleichsRechner } from '@/components/sections/VergleichsRechner'
import { resolveDatenschutzHref } from '@/lib/privacy/lead-consent'
import { lookupVergleichTarife } from '@/lib/tarife/lookup'
import { getProduktConfigFromDb } from '@/lib/tarife/produkt-config-db'
import { resolveFilterAxes } from '@/lib/tarife/resolve-filter-axes'

export const revalidate = 3600

interface PageProps {
  params: { produkt: string }
}

interface TarifePageData {
  produkt: {
    id: string
    slug: string
    name: string
    typ: string
    status: string
  }
  config: {
    zielgruppe: string[] | null
  } | null
  contentRow: {
    meta_title: string | null
    meta_desc: string | null
  } | null
}

async function fetchTarifePageData(slug: string): Promise<TarifePageData | null> {
  const supabase = createAdminClient()

  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug, name, typ, status')
    .eq('slug', slug)
    .single()

  if (!produkt) return null

  const { data: config } = await supabase
    .from('produkt_config')
    .select('zielgruppe')
    .eq('produkt_id', produkt.id)
    .single()

  const { data: contentRow } = await supabase
    .from('generierter_content')
    .select('meta_title, meta_desc')
    .eq('produkt_id', produkt.id)
    .eq('page_type', 'tarif')
    .eq('status', 'publiziert')
    .single()

  return {
    produkt,
    config: config ?? null,
    contentRow: contentRow ?? null,
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('produkte').select('slug').eq('status', 'aktiv')
    return (data ?? []).map(row => ({ produkt: row.slug }))
  } catch (err) {
    console.error('generateStaticParams (tarife): unexpected error', err)
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await fetchTarifePageData(params.produkt)

  if (!result) {
    return { title: 'Tarifrechner', robots: { index: false, follow: false } }
  }

  const { produkt, contentRow } = result

  const rawTitle = contentRow?.meta_title
    ? contentRow.meta_title
    : `${produkt.name} Tarife vergleichen`

  const title = rawTitle.slice(0, 60)
  const description = contentRow?.meta_desc ?? undefined

  return { title, description }
}

export default async function TarifePage({ params }: PageProps) {
  const result = await fetchTarifePageData(params.produkt)

  if (!result) {
    notFound()
  }

  const { produkt, config } = result
  const vergleichConfig = await getProduktConfigFromDb(produkt.typ)
  const filterAxes = resolveFilterAxes(produkt.typ, vergleichConfig.filter_axes)
  const initialData = await lookupVergleichTarife(
    produkt.id,
    vergleichConfig.default_age,
    vergleichConfig.default_summe,
  )

  const howToSchema = generateHowToSchema({
    produktName: produkt.name,
    produktSlug: produkt.slug,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <Link
          href={`/${produkt.slug}`}
          className="inline-block mb-4 mt-4 text-sm text-[#1a365d] hover:underline"
        >
          &larr; Zurück zur Produktseite
        </Link>

        <VergleichsRechner
          produktId={produkt.id}
          produktTyp={produkt.typ}
          produktName={produkt.name}
          zielgruppeTag={config?.zielgruppe?.[0] ?? 'senioren_50plus'}
          intentTag="preis"
          headline={`${produkt.name} — Tarife im Anbieter-Vergleich`}
          intro="Geben Sie Geburtsjahr und Wunschsumme ein. Filtern Sie optional nach akzeptabler Wartezeit — die Tabelle zeigt Beiträge je Anbieter aus unserer Tarifdatenbank."
          inputHint="Werte aus interner Marktbeobachtung. Verbindliches Angebot nach Anfrage."
          ctaLabel="Persönliches Angebot anfordern"
          initialData={initialData}
          filterAxes={filterAxes}
          datenschutzHref={resolveDatenschutzHref(params.produkt)}
        />

        <p className="mt-8 text-xs text-[#999999] text-center max-w-2xl mx-auto">
          Alle Beitragsbeispiele sind unverbindliche Musterkalkulationen ohne Rechtsverbindlichkeit.
          Bitte wenden Sie sich für ein verbindliches Angebot an einen unserer Versicherungsexperten.
        </p>
      </main>
    </>
  )
}
