// Public product landing page — statically generated with ISR hourly revalidation.
// Renders JSONB content sections from generierter_content for SEO-optimised output.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { buildProduktMetadata } from '@/lib/seo/metadata'
import {
  buildInsuranceAgencySchema,
  buildProductSchema,
  buildBreadcrumbSchema,
  combineSchemas,
} from '@/lib/seo/schema'
import { Hero } from '@/components/sections/Hero'
import { FeatureGrid } from '@/components/sections/FeatureGrid'
import { TrustBar } from '@/components/sections/TrustBar'
import type {
  ContentSection,
  HeroSection,
  FeaturesSection,
  TrustSection,
} from '@/lib/types/content'

// Re-render at most once per hour; allow slugs not pre-built at build time.
export const revalidate = 3600
export const dynamicParams = true

// Pre-build all slugs that have a published hauptseite content row.
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('produkte')
      .select('slug, generierter_content!inner(status, page_type)')
      .eq('status', 'aktiv')
      .eq('generierter_content.page_type', 'hauptseite')
      .eq('generierter_content.status', 'publiziert')

    if (error || !data) {
      console.error('generateStaticParams: Supabase error', error)
      return []
    }

    return data.map(row => ({ produkt: row.slug }))
  } catch (err) {
    console.error('generateStaticParams: unexpected error', err)
    return []
  }
}

// Fetch SEO metadata for this product slug from generierter_content.
export async function generateMetadata({
  params,
}: {
  params: { produkt: string }
}): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('generierter_content')
    .select('meta_title, meta_desc, slug, produkte!inner(slug)')
    .eq('page_type', 'hauptseite')
    .eq('produkte.slug', params.produkt)
    .single()

  if (!data) {
    return { title: params.produkt }
  }

  return buildProduktMetadata({
    slug: params.produkt,
    meta_title: data.meta_title ?? params.produkt,
    meta_desc: data.meta_desc ?? '',
  })
}

// Map a section type to its component — unknown types return null (silently skipped).
function renderSection(section: ContentSection, index: number) {
  switch (section.type) {
    case 'hero':
      return <Hero key={index} {...(section as HeroSection)} />
    case 'features':
      return <FeatureGrid key={index} items={(section as FeaturesSection).items} />
    case 'trust':
      return <TrustBar key={index} items={(section as TrustSection).stat_items} />
    case 'faq':
      // FAQ component will be wired in a future spec
      return null
    case 'lead_form':
      // LeadForm component will be wired in a future spec
      return null
    default:
      return null
  }
}

export default async function ProduktPage({ params }: { params: { produkt: string } }) {
  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('generierter_content')
    .select('content, title, slug, status, produkte!inner(slug, name)')
    .eq('page_type', 'hauptseite')
    .eq('produkte.slug', params.produkt)
    .single()

  // 404 for missing rows or any non-published status
  if (!row || row.status !== 'publiziert') {
    notFound()
  }

  let sections: ContentSection[] = []
  try {
    const content = row.content as { sections?: unknown[] } | null
    sections = (content?.sections ?? []) as ContentSection[]
  } catch {
    notFound()
  }

  const baseUrl = `https://${process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'}`
  const canonical = `${baseUrl}/${params.produkt}`
  const produktName = (row.produkte as { name: string } | null)?.name ?? params.produkt

  const combinedSchema = combineSchemas(
    buildInsuranceAgencySchema({ name: produktName, url: canonical }),
    buildProductSchema({ name: produktName, description: row.title ?? '', brand: 'LeadMonster' }),
    buildBreadcrumbSchema([
      { name: 'Startseite', url: baseUrl },
      { name: produktName, url: canonical },
    ]),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: combinedSchema }}
      />
      <main>{sections.map((section, i) => renderSection(section, i))}</main>
    </>
  )
}
