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
import { AuthorByline } from '@/components/sections/AuthorByline'
import { TrustBarSticky } from '@/components/sections/trust/TrustBarSticky'
import { TrustBlock } from '@/components/sections/trust/TrustBlock'
import type {
  ContentSection,
  HeroSection,
  FeaturesSection,
  TrustSection,
  FaqSection,
  LeadFormSection,
  VergleichsrechnerSection,
} from '@/lib/types/content'

// Re-render at most once per minute so freshly published content appears
// without admin needing to wait for a manual revalidation.
export const revalidate = 60
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
  ctx: {
    produktId: string
    produktTyp: string
    produktName: string
    zielgruppeTag: string
    intentTag: string
  },
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
          produktTyp={ctx.produktTyp}
          produktName={ctx.produktName}
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
      .select('content, title, slug, status, produkt_id, autor_id, reviewed_by, reviewed_at, updated_at, produkte!inner(id, slug, name, typ)')
      .eq('page_type', 'hauptseite')
      .eq('status', 'publiziert')
      .eq('produkte.slug', params.produkt)
      .maybeSingle(),
    supabase
      .from('produkte')
      .select('id, name, typ, hero_image_url, hero_image_alt, short_pitch, produkt_config(zielgruppe, fokus)')
      .eq('slug', params.produkt)
      .single(),
  ])

  // Hard 404 only when the product itself doesn't exist.
  if (!produkt) {
    notFound()
  }

  // Product exists but no published hauptseite content yet → render Hero from
  // the produkte row (Name + short_pitch + hero_image_url) plus a placeholder
  // for the body. Admins can finish content under /admin/produkte/[id]/content.
  if (!row || row.status !== 'publiziert') {
    const p = produkt as {
      name?: string | null
      hero_image_url?: string | null
      hero_image_alt?: string | null
      short_pitch?: string | null
    }
    return (
      <main>
        <Hero
          headline={p.name ?? params.produkt}
          subline={
            p.short_pitch ??
            'Diese Produktseite wird gerade erstellt — Inhalte folgen in Kürze.'
          }
          cta_text="Mehr erfahren"
          cta_anchor="#platzhalter"
          image_url={p.hero_image_url ?? null}
          image_alt={p.hero_image_alt ?? null}
        />
        <section
          id="platzhalter"
          className="max-w-[800px] mx-auto px-6 py-16 text-center"
        >
          <p className="text-lg text-[#4a5568] mb-2">
            Diese Seite wird gerade erstellt.
          </p>
          <p className="text-sm text-[#718096]">Inhalte folgen in Kürze.</p>
        </section>
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

  const produktRel = row.produkte as { id: string; name: string; typ?: string } | null
  const produktId = produktRel?.id ?? row.produkt_id ?? ''
  const produktName = produktRel?.name ?? params.produkt
  const produktTyp = produktRel?.typ ?? (produkt as { typ?: string } | null)?.typ ?? 'sterbegeld'
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

  const ctx = { produktId, produktTyp, produktName, zielgruppeTag, intentTag }

  // Hero ist immer Section[0]; AuthorByline + TrustBar kommen direkt danach.
  // Trust-Block wird vor dem ersten lead_form (oder am Ende) eingeschoben.
  const heroSection = sections[0]
  const restSections = sections.slice(1)
  const leadFormIndex = restSections.findIndex(s => s.type === 'lead_form')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: combinedSchema }}
      />
      <main>
        {heroSection && renderSection(heroSection, 0, ctx)}
        {/* Sticky Trust-Bar: max. 6 Logos / Kacheln */}
        <TrustBarSticky produktId={produktId} />
        <div className="max-w-4xl mx-auto px-6 mt-6">
          <AuthorByline
            autorId={(row as { autor_id?: string | null }).autor_id ?? null}
            reviewerId={(row as { reviewed_by?: string | null }).reviewed_by ?? null}
            reviewedAt={(row as { reviewed_at?: string | null }).reviewed_at ?? null}
            produktId={produktId}
            standDate={(row as { updated_at?: string | null }).updated_at ?? null}
            variant="card"
          />
        </div>
        {restSections.map((section, i) => {
          // Trust-Block VOR lead_form einschieben
          if (leadFormIndex >= 0 && i === leadFormIndex) {
            return (
              <div key={`trust-${i}`}>
                <TrustBlock produktId={produktId} produktName={produktName} />
                {renderSection(section, i + 1, ctx)}
              </div>
            )
          }
          return renderSection(section, i + 1, ctx)
        })}
        {/* Wenn keine lead_form-Section vorhanden ist, Trust-Block am Ende */}
        {leadFormIndex < 0 && <TrustBlock produktId={produktId} produktName={produktName} />}
      </main>
    </>
  )
}
