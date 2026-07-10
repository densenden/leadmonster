// Public insurer comparison page — statically generated with ISR hourly revalidation.
// Renders a structured insurer table from generierter_content (page_type = 'vergleich')
// with ItemList + Product Schema.org JSON-LD for SEO and AEO.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Vergleich } from '@/components/sections/Vergleich'
import { LeadForm } from '@/components/sections/LeadForm'
import { resolveDatenschutzHref } from '@/lib/privacy/lead-consent'
import { InlineMarkdown } from '@/components/util/InlineMarkdown'
import { lookupVergleichTarife } from '@/lib/tarife/lookup'
import { getProduktConfig } from '@/lib/tarife/produkt-config'
import { mapTarifeToVergleichOffers } from '@/lib/tarife/vergleich-static'
import { generateVergleichSchema } from '@/lib/seo/schema'

// Re-render at most once per hour — consistent with other public product pages.
export const revalidate = 3600
export const dynamicParams = true

interface PageProps {
  params: { produkt: string }
}

// ===== Shared data fetcher — used by generateMetadata and the page component =====

interface VergleichPageData {
  produkt: {
    id: string
    slug: string
    name: string
    typ: string
    status: string
  }
  config: {
    anbieter: string[] | null
    argumente: unknown
    zielgruppe: string[] | null
  } | null
  content: {
    title: string | null
    meta_title: string | null
    meta_desc: string | null
    content: unknown
    schema_markup: unknown
    status: string
    generated_at: string | null
  } | null
}

// Fetches the product, its config, and the vergleich content row.
// Returns null for the entire result when the product slug is not found.
// Returns null for content when no vergleich row exists (page will call notFound).
async function fetchVergleichData(slug: string): Promise<VergleichPageData | null> {
  const supabase = createAdminClient()

  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug, name, typ, status')
    .eq('slug', slug)
    .single()

  if (!produkt) return null

  const { data: config } = await supabase
    .from('produkt_config')
    .select('anbieter, argumente, zielgruppe')
    .eq('produkt_id', produkt.id)
    .single()

  const { data: content } = await supabase
    .from('generierter_content')
    .select('title, meta_title, meta_desc, content, schema_markup, status, generated_at')
    .eq('produkt_id', produkt.id)
    .eq('page_type', 'vergleich')
    .single()

  return { produkt, config: config ?? null, content: content ?? null }
}

// ===== Static params =====

// Pre-build one vergleich page per active product slug.
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('produkte').select('slug').eq('status', 'aktiv')
    return (data ?? []).map(row => ({ produkt: row.slug }))
  } catch (err) {
    console.error('generateStaticParams (vergleich): unexpected error', err)
    return []
  }
}

// ===== Metadata =====

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await fetchVergleichData(params.produkt)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
  const canonical = `${origin}/${params.produkt}/vergleich`

  if (!result || result.produkt.status !== 'aktiv') {
    return {
      title: 'Anbietervergleich',
      description: 'Vergleichen Sie die besten Anbieter.',
      alternates: { canonical },
      robots: { index: false, follow: false },
    }
  }

  const publishedContent =
    result.content?.status === 'publiziert' ? result.content : null
  const year = new Date().getFullYear()
  const rawTitle =
    publishedContent?.meta_title ??
    `${result.produkt.name} Anbieter im Vergleich ${year}`

  // Enforce 60-character maximum on meta title
  const title = rawTitle.slice(0, 60)
  const description = (
    publishedContent?.meta_desc ??
    `Vergleichen Sie ${result.produkt.name} Anbieter und Tarife auf einen Blick.`
  ).slice(0, 160)

  return {
    title,
    description,
    alternates: { canonical },
    robots:
      publishedContent || result.content == null
        ? { index: true, follow: true }
        : { index: false, follow: false },
  }
}

// ===== Page component =====

export default async function VergleichPage({ params }: PageProps) {
  const result = await fetchVergleichData(params.produkt)

  if (!result || result.produkt.status !== 'aktiv') {
    notFound()
  }

  const { produkt, config: produktConfig } = result
  const publishedContent =
    result.content?.status === 'publiziert' ? result.content : null

  // Table rows come exclusively from `tarife` (Anbietertarife), not from LLM JSON.
  const tarifConfig = getProduktConfig(produkt.typ)
  const dbTarife = await lookupVergleichTarife(
    produkt.id,
    tarifConfig.default_age,
    tarifConfig.default_summe,
  )

  // Without CMS copy or tariff rows there is nothing meaningful to render.
  if (!publishedContent && dbTarife.length === 0) {
    notFound()
  }

  const content = publishedContent ?? {
    title: null,
    meta_title: null,
    meta_desc: null,
    content: null,
    schema_markup: null,
    status: 'publiziert',
    generated_at: null,
  }

  // Extract the vergleich section from the JSONB content field (intro text only)
  type VergleichSection = {
    type: string
    intro?: string
  }
  const sections = (
    content.content as { sections?: VergleichSection[] } | null
  )?.sections ?? []
  const vergleichSection = sections.find(s => s.type === 'vergleich')
  const anbieter = mapTarifeToVergleichOffers(dbTarife)
  const distinctAnbieter = Array.from(new Set(dbTarife.map(t => t.anbieter_name)))
  const schemaMarkup =
    content.schema_markup ??
    (distinctAnbieter.length > 0
      ? generateVergleichSchema({
          anbieter: distinctAnbieter,
          produktName: produkt.name,
          produktTyp: produkt.typ,
          produktSlug: produkt.slug,
          criteria: [],
        })
      : null)
  const introFallback = `${produkt.name} im direkten Anbietervergleich — Beiträge und Leistungen der führenden Versicherer auf einen Blick.`

  const standDatum = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  // Derive zielgruppe tag from config (first entry) for the lead form context.
  const zielgruppeTag = (produktConfig?.zielgruppe as string[] | null)?.[0] ?? 'allgemein'

  // Format generated_at timestamp to DD.MM.YYYY server-side before passing to component
  const generatedAt = standDatum

  return (
    <>
      {/* Structured data — stored schema_markup served verbatim from DB */}
      {schemaMarkup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-0 py-12">
        {/* Breadcrumb navigation — three entries: Startseite / Produkt / Vergleich */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-[#1a365d]">
                Startseite
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/${produkt.slug}`} className="hover:text-[#1a365d]">
                {produkt.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page">Vergleich</span>
            </li>
          </ol>
        </nav>

        {/* Page heading — Produktname + Anbieter im Vergleich */}
        <h1 className="font-heading text-3xl font-bold text-[#1a365d] mb-4">
          {produkt.name} — Anbieter im Vergleich
        </h1>

        {/* Intro paragraph from vergleich content section — AEO entity naming.
            The auto-cross-linker (lib/linker/auto-link.ts) injects markdown
            links to /wissen/<slug>; InlineMarkdown turns them into real <a>. */}
        {(vergleichSection?.intro ?? introFallback) && (
          <p className="mt-4 mb-4 text-lg text-gray-700 font-body">
            <InlineMarkdown linkClassName="text-[#02a9e6] hover:underline">
              {vergleichSection?.intro ?? introFallback}
            </InlineMarkdown>
          </p>
        )}

        <p className="mb-8 text-sm text-gray-600 font-body">
          Beispielrechnung: Alter {tarifConfig.default_age} Jahre, Wunschsumme{' '}
          {tarifConfig.default_summe.toLocaleString('de-DE')} {tarifConfig.summe_suffix}. Werte aus interner
          Marktbeobachtung — nur Anbieter mit Tarifen in unserer Datenbank.
        </p>

        {anbieter.length === 0 ? (
          <p className="mb-8 rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-700">
            Für dieses Produkt liegen aktuell keine Anbietertarife in der Datenbank vor. Nutzen Sie
            den{' '}
            <Link href={`/${produkt.slug}/vergleichsrechner`} className="text-[#02a9e6] hover:underline">
              interaktiven Vergleichsrechner
            </Link>{' '}
            oder fordern Sie unten ein persönliches Angebot an.
          </p>
        ) : (
          <Vergleich
            anbieter={anbieter}
            produktName={produkt.name}
            generatedAt={generatedAt}
          />
        )}

        {/* Lead form CTA section — wrapped in brand background colour */}
        <section className="mt-16 bg-[#e1f0fb] rounded-2xl px-6 py-12">
          <h2 className="font-heading text-2xl font-bold text-[#1a365d] mb-6">
            Ihren persönlichen Tarif jetzt anfragen
          </h2>
          <LeadForm
            formId="lead-form-vergleich-page"
            produktId={produkt.id}
            zielgruppeTag={zielgruppeTag}
            intentTag="preis"
            datenschutzHref={resolveDatenschutzHref(params.produkt)}
          />
        </section>
      </main>
    </>
  )
}
