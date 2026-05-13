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
import { AuthorByline } from '@/components/sections/AuthorByline'
import { resolveAuthor } from '@/lib/redaktion/load'
import type { StepsSection, IntroSection, BodySection } from '@/lib/types/ratgeber'

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

  // Author + Reviewer auflösen — für Schema + Byline
  const resolved = await resolveAuthor({
    autorId: row.autor_id,
    reviewerId: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    produktId,
  })

  // Article schema — always present
  const articleSchema = buildArticleSchema({
    headline: articleTitle,
    description: row.meta_desc ?? '',
    datePublished: row.published_at ?? row.generated_at,
    dateModified: row.reviewed_at ?? row.generated_at,
    produktSlug: params.produkt,
    thema: params.thema,
    author: resolved.autor
      ? { slug: resolved.autor.slug, name: `${resolved.autor.vorname} ${resolved.autor.nachname}` }
      : undefined,
    reviewedBy: resolved.reviewer
      ? { slug: resolved.reviewer.slug, name: `${resolved.reviewer.vorname} ${resolved.reviewer.nachname}` }
      : undefined,
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

        {/* Hero — Cover-Bild bevorzugt aus content.cover_image_url (vom
            Image-Generator gesetzt), sonst aus der intro-Section. Wenn beide
            fehlen, rendert nur der Header-Block. */}
        {(() => {
          const intro = sections.find((s): s is IntroSection => s.type === 'intro')
          const contentObj = row.content as { cover_image_url?: string; cover_image_alt?: string } | null
          const cover = contentObj?.cover_image_url ?? intro?.image_url
          const coverAlt = contentObj?.cover_image_alt ?? intro?.image_alt ?? articleTitle
          if (cover) {
            return (
              <section className="mb-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-7 order-2 md:order-1">
                  <p className="text-xs uppercase tracking-widest text-[#02a9e6] font-semibold mb-3">
                    {produktName} · Ratgeber
                  </p>
                  <h1 className="font-heading font-bold text-[#1a365d] text-3xl md:text-4xl leading-tight mb-3">
                    {articleTitle}
                  </h1>
                  <p className="text-sm text-[#666666]">
                    Lesezeit: ca. {readingTime} Minuten
                  </p>
                </div>
                <div className="md:col-span-5 order-1 md:order-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover}
                    alt={coverAlt}
                    className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
                  />
                </div>
              </section>
            )
          }
          return (
            <header className="mb-8">
              <p className="text-xs uppercase tracking-widest text-[#02a9e6] font-semibold mb-2">
                {produktName} · Ratgeber
              </p>
              <h1 className="font-heading font-bold text-[#1a365d] text-3xl leading-tight mb-2">
                {articleTitle}
              </h1>
              <p className="text-sm text-[#666666] mt-1">
                Lesezeit: ca. {readingTime} Minuten
              </p>
            </header>
          )
        })()}

        {/* AuthorByline direkt unter H1 */}
        <div className="mb-6 max-w-3xl">
          <AuthorByline
            autorId={row.autor_id}
            reviewerId={row.reviewed_by}
            reviewedAt={row.reviewed_at}
            produktId={produktId}
            standDate={row.reviewed_at ?? row.generated_at}
            variant="card"
          />
        </div>

        {/* Two-column layout — content on the left, sticky ToC on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <article className="lg:col-span-8 prose-lg max-w-none">
            <RatgeberRenderer
              sections={sections}
              articleSlug={params.thema}
              produktSlug={params.produkt}
              produktId={produktId}
              zielgruppeTag="allgemein"
            />
          </article>

          {/* ToC — collected from body section headings, hidden on mobile */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-6 space-y-6">
              {(() => {
                // MD-Link-Syntax aus dem Heading entfernen — der Auto-Cross-
                // Linker injiziert [label](/wissen/…) in body.heading; im ToC
                // wollen wir nur das nackte Label sehen, ohne interne Links.
                const stripMd = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                const headings = sections
                  .filter((s): s is BodySection => s.type === 'body')
                  .map(s => s.heading)
                  .filter(Boolean)
                  .map(stripMd)
                if (headings.length < 2) return null
                return (
                  <nav aria-label="Inhaltsverzeichnis" className="border-l-2 border-[#abd5f4] pl-4">
                    <p className="text-xs uppercase tracking-widest text-[#02a9e6] font-semibold mb-2">
                      Inhalt
                    </p>
                    <ol className="space-y-1.5 text-sm text-[#1a365d]">
                      {headings.map((h, i) => (
                        <li key={i} className="leading-snug">
                          {h}
                        </li>
                      ))}
                    </ol>
                  </nav>
                )
              })()}

              {/* Quick CTA card */}
              <div className="bg-gradient-to-br from-[#1a365d] to-[#02a9e6] text-white p-5 rounded-xl shadow-md">
                <p className="text-sm font-semibold mb-1">
                  Persönliche Beratung gefällig?
                </p>
                <p className="text-xs text-white/85 mb-3 leading-relaxed">
                  Unser Team beantwortet Ihre Fragen zu {produktName} unverbindlich.
                </p>
                <a
                  href="#formular"
                  className="inline-block bg-white text-[#1a365d] text-xs font-bold px-3 py-2 rounded hover:bg-[#abd5f4] transition-colors"
                >
                  Jetzt Beratung anfordern →
                </a>
              </div>
            </div>
          </aside>
        </div>

        {/* Back link to ratgeber index */}
        <div className="mt-12 pt-6 border-t border-gray-200">
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
