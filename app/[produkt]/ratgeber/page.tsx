// Ratgeber index page — lists all published guide articles for a product.
// Server Component with ISR revalidation and BreadcrumbList schema (3 levels).
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchAllRatgeberForProdukt } from '@/lib/supabase/ratgeber'
import { buildBreadcrumbSchema, combineSchemas } from '@/lib/seo/schema'
import { calculateReadingTime } from '@/lib/utils/reading-time'
import { ProductBreadcrumb } from '@/components/layout/ProductBreadcrumb'
import { ROOT_PRODUKT_SLUG } from '@/lib/seo/organization'

export const revalidate = 3600

interface PageProps {
  params: { produkt: string }
}

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
  const homeHref = params.produkt === ROOT_PRODUKT_SLUG ? '/' : `/${params.produkt}`

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Startseite', url: origin },
    { name: produkt.name, url: `${origin}${homeHref === '/' ? '' : homeHref}` },
    { name: 'Ratgeber', url: `${origin}/${params.produkt}/ratgeber` },
  ])

  const combinedSchema = combineSchemas(breadcrumbSchema)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: combinedSchema }}
      />

      <main className="max-w-content mx-auto px-6 py-8">
        <ProductBreadcrumb
          items={[
            { label: 'Startseite', href: homeHref },
            { label: produkt.name, href: homeHref },
            { label: 'Ratgeber' },
          ]}
        />

        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-2 font-body">
            Ratgeber
          </p>
          <h1 className="font-heading font-bold text-navy text-3xl md:text-4xl leading-tight mb-2">
            Ratgeber zu {produkt.name}
          </h1>
          <p className="text-base font-body text-body">
            Alle Entscheidungsguides auf einen Blick — informieren Sie sich jetzt.
          </p>
        </header>

        {articles.length === 0 && (
          <div className="border border-dashed border-gray-300 rounded-xl py-16 text-center">
            <p className="text-sm text-body font-body">Noch keine Ratgeber veröffentlicht.</p>
            <p className="mt-1 text-xs text-muted font-body">
              Neue Artikel erscheinen hier sobald sie veröffentlicht werden.
            </p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => {
              const sections = article.content?.sections ?? []
              const readingTime = calculateReadingTime(sections)
              const excerpt = article.meta_desc
                ? article.meta_desc.slice(0, 150) + (article.meta_desc.length > 150 ? '…' : '')
                : ''

              return (
                <Link
                  key={article.id}
                  href={`/${params.produkt}/ratgeber/${article.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-accent/40 transition-all duration-200"
                >
                  <h2 className="text-lg font-semibold text-navy leading-snug mb-3 font-heading">
                    {article.title}
                  </h2>
                  {excerpt && (
                    <p className="text-sm font-body text-body leading-relaxed mb-4">{excerpt}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="inline-block bg-orange/10 text-orange text-xs font-semibold px-2.5 py-1 rounded-full font-body">
                      {readingTime} Min. Lesezeit
                    </span>
                    <span className="text-xs text-accent font-semibold font-body">Lesen →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
