// Public FAQ page — statically generated with ISR hourly revalidation.
// Renders FAQ accordion from generierter_content.content.sections[faq]
// with FAQPage + BreadcrumbList Schema.org JSON-LD for AEO/SEO.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { buildFAQMetadata } from '@/lib/seo/metadata'
import { generateFAQPageSchema, generateBreadcrumbSchema } from '@/lib/seo/schema'
import { FAQ } from '@/components/sections/FAQ'
import type { FAQItem } from '@/components/sections/FAQ'

// Re-render at most once per hour — consistent with main product page ISR interval.
export const revalidate = 3600

interface PageProps {
  params: { produkt: string }
}

// ===== Shared data fetcher — used by both generateMetadata and the page component =====

interface FAQPageData {
  produkt: {
    id: string
    slug: string
    name: string
    domain: string | null
    status: string
  }
  faqRecord: {
    title: string | null
    meta_title: string | null
    meta_desc: string | null
    content: unknown
    schema_markup: unknown
    status: string
  } | null
}

// Fetches the product row and its published FAQ content row.
// Returns null for the faqRecord when no published FAQ exists.
async function fetchFAQPageData(slug: string): Promise<FAQPageData | null> {
  const supabase = createAdminClient()

  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug, name, domain, status')
    .eq('slug', slug)
    .single()

  if (!produkt) return null

  const { data: faqRecord } = await supabase
    .from('generierter_content')
    .select('title, meta_title, meta_desc, content, schema_markup, status')
    .eq('produkt_id', produkt.id)
    .eq('page_type', 'faq')
    .eq('status', 'publiziert')
    .single()

  return { produkt, faqRecord: faqRecord ?? null }
}

// ===== Static params =====

// Pre-build one FAQ page per active product slug.
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('produkte').select('slug').eq('status', 'aktiv')
    return (data ?? []).map(row => ({ produkt: row.slug }))
  } catch (err) {
    console.error('generateStaticParams (faq): unexpected error', err)
    return []
  }
}

// ===== Metadata =====

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await fetchFAQPageData(params.produkt)

  // No product found — return noindex fallback
  if (!result) {
    return { title: 'FAQ', robots: { index: false, follow: false } }
  }

  // No published FAQ — return noindex fallback
  if (!result.faqRecord) {
    return { title: 'FAQ', robots: { index: false, follow: false } }
  }

  const items = extractFAQItems(result.faqRecord.content)

  return buildFAQMetadata({
    produkt: result.produkt,
    faqRecord: result.faqRecord,
    itemCount: items.length,
  })
}

// ===== FAQ item extraction =====

// Extracts the FAQ items array from the JSONB content field.
// Finds the section with type === 'faq' and returns its items.
function extractFAQItems(content: unknown): FAQItem[] {
  const c = content as { sections?: Array<{ type: string; items?: FAQItem[] }> } | null
  return c?.sections?.find(s => s.type === 'faq')?.items ?? []
}

// ===== Page component =====

export default async function FAQPage({ params }: PageProps) {
  const result = await fetchFAQPageData(params.produkt)

  if (!result || !result.faqRecord) {
    notFound()
  }

  const { produkt, faqRecord } = result
  const items = extractFAQItems(faqRecord.content)

  // Log a server-side warning if fewer than 10 items are present.
  if (items.length < 10) {
    console.warn(
      `FAQ page for "${params.produkt}" has only ${items.length} items — expected at least 10.`,
    )
  }

  const baseUrl = produkt.domain ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'

  // Prefer stored schema_markup from DB; fall back to runtime generation.
  const faqSchema =
    faqRecord.schema_markup != null
      ? faqRecord.schema_markup
      : generateFAQPageSchema(items)

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Startseite', url: `https://${baseUrl}` },
    { name: produkt.name, url: `https://${baseUrl}/${produkt.slug}` },
    { name: 'FAQ', url: `https://${baseUrl}/${produkt.slug}/faq` },
  ])

  // Combine both schema blocks into a single @graph for injection.
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [faqSchema, breadcrumbSchema],
  })

  return (
    <>
      {/* Structured data — FAQPage + BreadcrumbList combined in @graph */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <main className="max-w-[1200px] mx-auto px-6">
        {/* Breadcrumb navigation */}
        <nav aria-label="Breadcrumb" className="py-4">
          <ol className="flex items-center gap-2 text-sm text-[#666666]">
            <li>
              <a href={`https://${baseUrl}`} className="hover:text-[#1a365d]">
                Startseite
              </a>
            </li>
            <li aria-hidden="true" className="text-[#999999]">/</li>
            <li>
              <a href={`/${produkt.slug}`} className="hover:text-[#1a365d]">
                {produkt.name}
              </a>
            </li>
            <li aria-hidden="true" className="text-[#999999]">/</li>
            <li>
              <span aria-current="page">FAQ</span>
            </li>
          </ol>
        </nav>

        {/* Back link to main product page */}
        <a
          href={`/${produkt.slug}`}
          className="inline-block mb-4 text-sm text-[#1a365d] hover:underline"
        >
          ← Zurück zur Produktseite
        </a>

        {/* Page-level heading — h3 headings inside FAQ nest beneath this h1 */}
        <h1 className="font-heading font-bold text-[#1a365d] text-3xl mb-8">
          Häufige Fragen zu {produkt.name}
        </h1>

        {/* FAQ accordion — all items verbatim, no marketing copy added */}
        <FAQ items={items} />

        {/* CTA section below FAQ accordion */}
        <div className="mt-12 bg-[#1a365d] text-center py-10 px-6">
          <p className="text-white font-body text-lg mb-4">Noch Fragen?</p>
          <a
            href={`/${produkt.slug}#formular`}
            className="inline-block bg-[#d4af37] hover:bg-[#b8860b] text-white font-body font-semibold px-8 py-3 transition-colors duration-150"
          >
            Noch Fragen? Jetzt unverbindlich anfragen
          </a>
        </div>
      </main>
    </>
  )
}
