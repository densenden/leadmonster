// Ratgeber index page — lists all published guide articles for a product.
// Server Component with ISR revalidation and BreadcrumbList schema (3 levels).
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAllRatgeberForProdukt } from '@/lib/supabase/ratgeber'
import { buildBreadcrumbSchema, combineSchemas } from '@/lib/seo/schema'
import { calculateReadingTime } from '@/lib/utils/reading-time'

export const revalidate = 3600

interface PageProps {
  params: { produkt: string }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('name, slug, domain')
    .eq('slug', params.produkt)
    .single()

  if (!produkt) {
    return { title: 'Ratgeber', robots: { index: false, follow: false } }
  }

  const baseUrl = produkt.domain ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
  const canonical = `${origin}/${params.produkt}/ratgeber`

  return {
    title: `Ratgeber zu ${produkt.name} — Alle Guides`,
    description: `Entscheidungsguides und Ratgeber zu ${produkt.name}. Informieren Sie sich jetzt über alle wichtigen Themen.`,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: `Ratgeber zu ${produkt.name} — Alle Guides`,
      description: `Entscheidungsguides und Ratgeber zu ${produkt.name}.`,
      type: 'website',
      url: canonical,
    },
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function RatgeberIndexPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, name, slug, domain')
    .eq('slug', params.produkt)
    .single()

  if (!produkt) {
    notFound()
  }

  const articles = await fetchAllRatgeberForProdukt(params.produkt)

  const baseUrl = produkt.domain ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  // BreadcrumbList schema — 3 levels: Home > Produkt > Ratgeber
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Startseite', url: origin },
    { name: produkt.name, url: `${origin}/${params.produkt}` },
    { name: 'Ratgeber', url: `${origin}/${params.produkt}/ratgeber` },
  ])

  const combinedSchema = combineSchemas(breadcrumbSchema)

  return (
    <>
      {/* Structured data — BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: combinedSchema }}
      />

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumb navigation */}
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
                {produkt.name}
              </a>
            </li>
            <li aria-hidden="true" className="text-[#999999]">/</li>
            <li>
              <span aria-current="page" className="text-[#333333]">
                Ratgeber
              </span>
            </li>
          </ol>
        </nav>

        {/* Page header */}
        <header className="mb-10">
          <h1 className="font-heading font-bold text-[#1a365d] text-3xl leading-tight mb-2">
            Ratgeber zu {produkt.name}
          </h1>
          <p className="text-base font-light text-[#666666]">
            Alle Entscheidungsguides auf einen Blick — informieren Sie sich jetzt.
          </p>
        </header>

        {/* Empty state */}
        {articles.length === 0 && (
          <div className="border border-dashed border-gray-300 py-16 text-center">
            <p className="text-sm text-[#666666]">
              Noch keine Ratgeber veröffentlicht.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Neue Artikel erscheinen hier sobald sie veröffentlicht werden.
            </p>
          </div>
        )}

        {/* Card grid — 1 col mobile, 2 tablet, 3 desktop */}
        {articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => {
              const sections = article.content?.sections ?? []
              const readingTime = calculateReadingTime(sections)
              const excerpt = article.meta_desc
                ? article.meta_desc.slice(0, 150) + (article.meta_desc.length > 150 ? '…' : '')
                : ''

              return (
                <a
                  key={article.id}
                  href={`/${params.produkt}/ratgeber/${article.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <h2 className="text-lg font-semibold text-[#1a365d] leading-snug mb-3 font-heading">
                    {article.title}
                  </h2>
                  {excerpt && (
                    <p className="text-sm font-light text-[#666666] leading-relaxed mb-4">
                      {excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="inline-block bg-[#abd5f4]/20 text-[#1a365d] text-xs font-medium px-2.5 py-1 rounded-full">
                      {readingTime} Min. Lesezeit
                    </span>
                    <span className="text-xs text-[#abd5f4] font-medium">
                      Lesen →
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
