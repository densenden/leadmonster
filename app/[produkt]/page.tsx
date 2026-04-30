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
import { FAQ } from '@/components/sections/FAQ'
import { LeadForm } from '@/components/sections/LeadForm'
import { VergleichsRechner } from '@/components/sections/VergleichsRechner'
import type {
  ContentSection,
  HeroSection,
  FeaturesSection,
  TrustSection,
  FaqSection,
  LeadFormSection,
  VergleichsrechnerSection,
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
function renderSection(
  section: ContentSection,
  index: number,
  ctx: { produktId: string; zielgruppeTag: string; intentTag: string }
) {
  switch (section.type) {
    case 'hero':
      return <Hero key={index} {...(section as HeroSection)} />
    case 'features':
      return <FeatureGrid key={index} items={(section as FeaturesSection).items} />
    case 'trust':
      return <TrustBar key={index} items={(section as TrustSection).stat_items} />
    case 'faq':
      return (
        <section key={index} id="faq" className="py-16 bg-[#f8f8f8]">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-[#1a365d] mb-8">Häufige Fragen</h2>
            <FAQ items={(section as FaqSection).items} />
          </div>
        </section>
      )
    case 'lead_form':
      return (
        <section key={index} id="formular" className="py-16 bg-white">
          <div className="max-w-xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-[#1a365d] mb-2">
              {(section as LeadFormSection).headline ?? 'Jetzt unverbindlich anfragen'}
            </h2>
            <p className="text-gray-500 mb-8">
              {(section as LeadFormSection).subline ?? ''}
            </p>
            <LeadForm
              produktId={ctx.produktId}
              zielgruppeTag={ctx.zielgruppeTag}
              intentTag={ctx.intentTag}
            />
          </div>
        </section>
      )
    case 'vergleichsrechner': {
      const s = section as VergleichsrechnerSection
      return (
        <VergleichsRechner
          key={index}
          produktId={ctx.produktId}
          zielgruppeTag={ctx.zielgruppeTag}
          intentTag="preis"
          headline={s.headline}
          intro={s.intro}
          inputHint={s.input_hint}
          ctaLabel={s.cta_label}
          anbieterCountHint={s.anbieter_count_hint}
        />
      )
    }
    default:
      return null
  }
}

export default async function ProduktPage({ params }: { params: { produkt: string } }) {
  const supabase = createAdminClient()

  const [{ data: row }, { data: produkt }] = await Promise.all([
    supabase
      .from('generierter_content')
      .select('content, title, slug, status, produkt_id, produkte!inner(id, slug, name)')
      .eq('page_type', 'hauptseite')
      .eq('produkte.slug', params.produkt)
      .single(),
    supabase
      .from('produkte')
      .select('id, produkt_config(zielgruppe, fokus)')
      .eq('slug', params.produkt)
      .single(),
  ])

  // Hard 404 only when the product itself doesn't exist.
  if (!produkt) {
    notFound()
  }

  // Product exists but no published hauptseite content yet → render placeholder
  // (admin can generate + publish content via /admin/produkte/[id]/content).
  if (!row || row.status !== 'publiziert') {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-[#1a3252] mb-4">
          {params.produkt}
        </h1>
        <p className="text-lg text-[#4a5568] mb-2">
          Diese Seite wird gerade erstellt.
        </p>
        <p className="text-sm text-[#718096]">
          Inhalte folgen in Kürze.
        </p>
      </main>
    )
  }

  let sections: ContentSection[] = []
  try {
    const content = row.content as { sections?: unknown[] } | null
    sections = (content?.sections ?? []) as ContentSection[]
  } catch {
    notFound()
  }

  const produktId = (row.produkte as { id: string } | null)?.id ?? row.produkt_id ?? ''
  const produktName = (row.produkte as { name: string } | null)?.name ?? params.produkt
  // produkt_config is returned as an array (one-to-many from produkte), take first entry.
  const configs = produkt?.produkt_config
  const config = (Array.isArray(configs) ? configs[0] : configs) as { zielgruppe?: string[]; fokus?: string } | null
  const zielgruppeTag = config?.zielgruppe?.[0] ?? 'senioren_50plus'
  const intentTag = config?.fokus ?? 'sicherheit'

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://leadmonster.de'
  const canonical = `${baseUrl}/${params.produkt}`

  const combinedSchema = combineSchemas(
    buildInsuranceAgencySchema({ name: produktName, url: canonical }),
    buildProductSchema({ name: produktName, description: row.title ?? '', brand: produktName }),
    buildBreadcrumbSchema([
      { name: 'Startseite', url: baseUrl },
      { name: produktName, url: canonical },
    ]),
  )

  const ctx = { produktId, zielgruppeTag, intentTag }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: combinedSchema }}
      />
      <main>{sections.map((section, i) => renderSection(section, i, ctx))}</main>
    </>
  )
}
