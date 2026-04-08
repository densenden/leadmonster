// Ratgeber article page — statically generated with ISR hourly revalidation.
// Renders a single guide article with Article + BreadcrumbList + conditional HowTo schema.
// This is a Server Component — no 'use client' directive.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import {
  fetchRatgeberBySlug,
  fetchAllPublishedRatgeberParams,
} from '@/lib/supabase/ratgeber'
import { buildProduktMetadata } from '@/lib/seo/metadata'
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildHowToSchema,
  combineSchemas,
} from '@/lib/seo/schema'
import { calculateReadingTime } from '@/lib/utils/reading-time'
import { RatgeberRenderer } from './_components/ratgeber-renderer'
import type { StepsSection } from '@/lib/types/ratgeber'

// Re-render at most once per hour; allow slugs not pre-built at build time.
export const revalidate = 3600
export const dynamicParams = true

interface PageProps {
  params: {
    produkt: string
    thema: string
  }
}

// ---------------------------------------------------------------------------
// Static params — pre-build all published article pages at build time
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    return await fetchAllPublishedRatgeberParams()
  } catch (err) {
    console.error('generateStaticParams (ratgeber/thema): unexpected error', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const row = await fetchRatgeberBySlug(params.produkt, params.thema)

  if (!row) {
    return { title: params.thema, robots: { index: false, follow: false } }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'
  const canonicalSlug = `${params.produkt}/ratgeber/${params.thema}`

  return buildProduktMetadata({
    slug: canonicalSlug,
    meta_title: row.meta_title ?? row.title ?? params.thema,
    meta_desc: row.meta_desc ?? '',
  })
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function RatgeberArticlePage({ params }: PageProps) {
  const row = await fetchRatgeberBySlug(params.produkt, params.thema)

  if (!row) {
    notFound()
  }

  const sections = row.content?.sections ?? []
  const readingTime = calculateReadingTime(sections)

  // Fetch the product row to get the name and produkt_id for the breadcrumb + lead form
  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, name, slug, domain')
    .eq('slug', params.produkt)
    .single()

  const produktName = produkt?.name ?? params.produkt
  const produktId = produkt?.id ?? row.produkt_id
  const baseUrl = produkt?.domain ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  // Compose breadcrumb (4 levels): Home > Produkt > Ratgeber > Article title
  const articleTitle = row.title ?? params.thema
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Startseite', url: origin },
    { name: produktName, url: `${origin}/${params.produkt}` },
    { name: 'Ratgeber', url: `${origin}/${params.produkt}/ratgeber` },
    { name: articleTitle, url: `${origin}/${params.produkt}/ratgeber/${params.thema}` },
  ])

  // Article schema — always present
  const articleSchema = buildArticleSchema({
    headline: articleTitle,
    description: row.meta_desc ?? '',
    datePublished: row.published_at ?? row.generated_at,
    dateModified: row.generated_at,
    produktSlug: params.produkt,
    thema: params.thema,
  })

  // HowTo schema — only when at least one steps section exists
  const stepsSections = sections.filter(
    (s): s is StepsSection => s.type === 'steps',
  )
  const hasSteps = stepsSections.length > 0

  // Gather all steps items for the HowTo schema
  const allStepItems = stepsSections.flatMap(s => s.items)

  const schemasToEmit = hasSteps
    ? [articleSchema, breadcrumbSchema, buildHowToSchema({ name: articleTitle, steps: allStepItems })]
    : [articleSchema, breadcrumbSchema]

  const combinedSchema = combineSchemas(...schemasToEmit)

  return (
    <>
      {/* Structured data — Article + BreadcrumbList + optional HowTo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: combinedSchema }}
      />

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumb navigation — 4 levels */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-[#666666]">
            <li>
              <a href={origin} className="hover:text-[#1a365d]">
                Startseite
              </a>
            </li>
            <li aria-hidden="true" className="text-[#999999]">/</li>
            <li>
              <a href={`/${params.produkt}`} className="hover:text-[#1a365d]">
                {produktName}
              </a>
            </li>
            <li aria-hidden="true" className="text-[#999999]">/</li>
            <li>
              <a href={`/${params.produkt}/ratgeber`} className="hover:text-[#1a365d]">
                Ratgeber
              </a>
            </li>
            <li aria-hidden="true" className="text-[#999999]">/</li>
            <li>
              <span aria-current="page" className="text-[#333333]">
                {articleTitle}
              </span>
            </li>
          </ol>
        </nav>

        {/* Article header */}
        <header className="mb-8">
          <h1 className="font-heading font-bold text-[#1a365d] text-3xl leading-tight mb-2">
            {articleTitle}
          </h1>
          {/* Reading time estimate — displayed directly below title */}
          <p className="text-sm text-[#666666] mt-1">
            Lesezeit: ca. {readingTime} Minuten
          </p>
        </header>

        {/* Section content */}
        <RatgeberRenderer
          sections={sections}
          articleSlug={params.thema}
          produktSlug={params.produkt}
          produktId={produktId}
          zielgruppeTag="allgemein"
        />

        {/* Back link to ratgeber index */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <a
            href={`/${params.produkt}/ratgeber`}
            className="text-sm text-[#1a365d] hover:underline"
          >
            ← Alle Ratgeber zu {produktName}
          </a>
        </div>
      </main>
    </>
  )
}
