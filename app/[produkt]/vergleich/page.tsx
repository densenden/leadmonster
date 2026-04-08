// Public insurer comparison page — statically generated with ISR hourly revalidation.
// Renders a structured insurer table from generierter_content (page_type = 'vergleich')
// with ItemList + Product Schema.org JSON-LD for SEO and AEO.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { Vergleich } from '@/components/sections/Vergleich'
import { LeadForm } from '@/components/sections/LeadForm'

// Re-render at most once per hour — consistent with other public product pages.
export const revalidate = 3600

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

  // No product or no content row — return noindex fallback with generic German defaults
  if (!result || !result.content) {
    return {
      title: 'Anbietervergleich',
      description: 'Vergleichen Sie die besten Anbieter.',
      alternates: { canonical },
    }
  }

  const year = new Date().getFullYear()
  const rawTitle =
    result.content.meta_title ??
    `${result.produkt.name} Anbieter im Vergleich ${year}`

  // Enforce 60-character maximum on meta title
  const title = rawTitle.slice(0, 60)
  const description = (
    result.content.meta_desc ?? 'Vergleichen Sie die besten Anbieter.'
  ).slice(0, 160)

  return {
    title,
    description,
    alternates: { canonical },
    // Only index published pages — protect drafts and review items from crawlers
    robots:
      result.content.status === 'publiziert'
        ? { index: true, follow: true }
        : { index: false, follow: false },
  }
}

// ===== Page component =====

export default async function VergleichPage({ params }: PageProps) {
  const result = await fetchVergleichData(params.produkt)

  // 404 for missing product or missing / unpublished vergleich content
  if (!result || !result.content || result.content.status !== 'publiziert') {
    notFound()
  }

  const { produkt, config, content } = result

  // Extract the vergleich section from the JSONB content field
  type VergleichSection = {
    type: string
    intro?: string
    criteria?: Array<{ label: string; values: Record<string, string | boolean> }>
  }
  const sections = (
    content.content as { sections?: VergleichSection[] } | null
  )?.sections ?? []
  const vergleichSection = sections.find(s => s.type === 'vergleich')

  // Insurer list from produkt_config — used as column headers
  const anbieter = (config?.anbieter as string[] | null) ?? []

  // Criteria rows from the vergleich content section — fall back to empty
  const criteria = vergleichSection?.criteria ?? []

  // Derive zielgruppe tag from config (first entry) for the lead form context.
  const zielgruppeTag = (config?.zielgruppe as string[] | null)?.[0] ?? 'allgemein'

  // Format generated_at timestamp to DD.MM.YYYY server-side before passing to component
  const generatedAt = content.generated_at
    ? new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(content.generated_at))
    : new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date())

  return (
    <>
      {/* Structured data — stored schema_markup served verbatim from DB */}
      {content.schema_markup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(content.schema_markup) }}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-0 py-12">
        {/* Breadcrumb navigation — three entries: Startseite / Produkt / Vergleich */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
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

        {/* Intro paragraph from vergleich content section — AEO entity naming */}
        {vergleichSection?.intro && (
          <p className="mt-4 mb-8 text-lg text-gray-700 font-body">{vergleichSection.intro}</p>
        )}

        {/* Comparison table — horizontal scroll on mobile */}
        <Vergleich
          anbieter={anbieter}
          criteria={criteria}
          produktName={produkt.name}
          generatedAt={generatedAt}
        />

        {/* Lead form CTA section — wrapped in brand background colour */}
        <section className="mt-16 bg-[#e1f0fb] rounded-2xl px-6 py-12">
          <h2 className="font-heading text-2xl font-bold text-[#1a365d] mb-6">
            Ihren persönlichen Tarif jetzt anfragen
          </h2>
          <LeadForm produktId={produkt.id} zielgruppeTag={zielgruppeTag} intentTag="preis" />
        </section>
      </main>
    </>
  )
}
