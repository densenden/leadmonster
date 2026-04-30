// Public tarif (tariff calculator) page — statically generated with ISR hourly revalidation.
// Renders the TarifRechner client component after fetching product + config from Supabase.
// Injects HowTo JSON-LD schema into the page for AEO/SEO.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { generateHowToSchema } from '@/lib/seo/schema'
import { TarifRechner } from '@/components/sections/TarifRechner'
import type { ProduktTyp } from '@/lib/tarif-data'

// Re-render at most once per hour — consistent with other [produkt] sub-route pages.
export const revalidate = 3600

interface PageProps {
  params: { produkt: string }
}

// ===== Shared data fetcher =====

interface TarifePageData {
  produkt: {
    id: string
    slug: string
    name: string
    typ: string
    status: string
  }
  config: {
    anbieter: string[] | null
    zielgruppe: string[] | null
  } | null
  contentRow: {
    meta_title: string | null
    meta_desc: string | null
  } | null
}

// Fetches the product row, its config, and any published tarif content row.
// Returns null when the product slug does not exist.
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
    .select('anbieter, zielgruppe')
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

// ===== Static params =====

// Pre-build one tarif page per active product slug.
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

// ===== Metadata =====

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await fetchTarifePageData(params.produkt)

  if (!result) {
    return { title: 'Tarifrechner', robots: { index: false, follow: false } }
  }

  const { produkt, contentRow } = result

  // Use meta_title from the published tarif content row when available; fall back to constructed string.
  const rawTitle = contentRow?.meta_title
    ? contentRow.meta_title
    : `${produkt.name} Tarifrechner — Beitragsbeispiele`

  const title = rawTitle.slice(0, 60)
  const description = contentRow?.meta_desc ?? undefined

  return { title, description }
}

// ===== Page component =====

export default async function TarifePage({ params }: PageProps) {
  const result = await fetchTarifePageData(params.produkt)

  // 404 for unknown slugs
  if (!result) {
    notFound()
  }

  const { produkt, config } = result

  // Build the HowTo JSON-LD schema for the tariff calculator steps
  const howToSchema = generateHowToSchema({
    produktName: produkt.name,
    produktSlug: produkt.slug,
  })

  return (
    <>
      {/* Structured data — HowTo schema for the calculator flow */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <main className="max-w-[1200px] mx-auto px-6">
        {/* Back link to main product page */}
        <a
          href={`/${produkt.slug}`}
          className="inline-block mb-4 mt-4 text-sm text-[#1a365d] hover:underline"
        >
          &larr; Zurück zur Produktseite
        </a>

        {/* Page heading */}
        <h1 className="font-heading font-bold text-[#333333] text-3xl mb-8">
          {produkt.name} Tarifrechner
        </h1>

        {/* Eigener Tarif-Kalkulator für alle Produkte (Covomo wurde 2026-04 abgeschaltet,
            wir behalten 100 % Lead- und Tracking-Hoheit). */}
        <TarifRechner
          produktTyp={produkt.typ as ProduktTyp}
          produktName={produkt.name}
          anbieter={config?.anbieter ?? []}
          produktId={produkt.id}
          zielgruppeTag={config?.zielgruppe?.[0] ?? 'allgemein'}
        />


        {/* Regulatory disclaimer below the calculator */}
        <p className="mt-8 text-xs text-[#999999] text-center max-w-2xl mx-auto">
          Alle Beitragsbeispiele sind unverbindliche Musterkalkulationen ohne Rechtsverbindlichkeit.
          Bitte wenden Sie sich für ein verbindliches Angebot an einen unserer Versicherungsexperten.
        </p>
      </main>
    </>
  )
}
