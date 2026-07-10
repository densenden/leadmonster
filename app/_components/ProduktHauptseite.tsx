// Render-Logik für Produkt-Hauptseiten.
// Wird sowohl von app/[produkt]/page.tsx als auch von app/page.tsx verwendet —
// letzteres rendert das Root-Produkt (sterbegeld24plus) unter `/`. Das Flag
// `isRoot` steuert, dass die canonical URL `/` statt `/<slug>` ist.
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { isRowNotFound } from '@/lib/supabase/errors'
import { resolveBaseUrl } from '@/lib/seo/organization'
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
import { BlogPreview } from '@/components/sections/BlogPreview'
import { ImageTextSplit } from '@/components/sections/ImageTextSplit'
import { QuoteCallout } from '@/components/sections/QuoteCallout'
import { StatsBlock } from '@/components/sections/StatsBlock'
import { ProcessSteps } from '@/components/sections/ProcessSteps'
import { InfoBox } from '@/components/sections/InfoBox'
import { TrustBarSticky } from '@/components/sections/trust/TrustBarSticky'
import { TrustBlock } from '@/components/sections/trust/TrustBlock'
import { enrichHeroSection } from '@/lib/design/hero-defaults'
import { resolveDatenschutzHref } from '@/lib/privacy/lead-consent'
import { getProduktConfig } from '@/lib/tarife/produkt-config'
import { getWartezeitFormOptions } from '@/lib/tarife/resolve-filter-axes'
import type {
  ContentSection,
  HeroSection,
  FeaturesSection,
  TrustSection,
  FaqSection,
  LeadFormSection,
  VergleichsrechnerSection,
  BlogPreviewSection,
  ImageTextSplitSection,
  QuoteCalloutSection,
  StatsBlockSection,
  ProcessStepsSection,
  InfoBoxSection,
} from '@/lib/types/content'

interface RenderCtx {
  produktId: string
  produktTyp: string
  produktName: string
  produktSlug: string
  zielgruppeTag: string
  intentTag: string
  heroImageUrl?: string | null
  heroImageAlt?: string | null
  datenschutzHref: string
}

function renderSection(section: ContentSection, index: number, ctx: RenderCtx) {
  switch (section.type) {
    case 'hero': {
      const heroProps = enrichHeroSection(
        section as HeroSection,
        ctx.produktTyp,
        ctx.produktSlug,
        { image_url: ctx.heroImageUrl, image_alt: ctx.heroImageAlt },
      )
      return <Hero key={index} {...heroProps} />
    }
    case 'features':
      return <FeatureGrid key={index} items={(section as FeaturesSection).items} />
    case 'trust':
      return <TrustBar key={index} items={(section as TrustSection).stat_items} />
    case 'faq':
      return (
        <section key={index} id="faq" className="py-10 md:py-16 bg-[#f8f8f8]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a365d] mb-6 md:mb-8">Häufige Fragen</h2>
            <FAQ items={(section as FaqSection).items} embedded />
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
              formId="lead-form-hauptseite"
              produktId={ctx.produktId}
              zielgruppeTag={ctx.zielgruppeTag}
              intentTag={ctx.intentTag}
              defaultSumme={getProduktConfig(ctx.produktTyp).default_summe}
              wartezeitOptions={getWartezeitFormOptions(ctx.produktTyp)}
              datenschutzHref={ctx.datenschutzHref}
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
          datenschutzHref={ctx.datenschutzHref}
        />
      )
    }
    case 'blog_preview': {
      const s = section as BlogPreviewSection
      return (
        <BlogPreview
          key={index}
          produktSlug={ctx.produktSlug}
          headline={s.headline}
          subline={s.subline}
          cta_href={s.cta_href}
          cta_label={s.cta_label}
          limit={s.limit ?? 3}
        />
      )
    }
    case 'image_text_split': {
      const s = section as ImageTextSplitSection
      return (
        <ImageTextSplit
          key={index}
          image_url={s.image_url}
          image_alt={s.image_alt}
          image_side={s.image_side}
          eyebrow={s.eyebrow}
          headline={s.headline}
          body={s.body}
          cta_label={s.cta_label}
          cta_href={s.cta_href}
          background={s.background}
        />
      )
    }
    case 'quote_callout': {
      const s = section as QuoteCalloutSection
      return (
        <QuoteCallout
          key={index}
          quote={s.quote}
          author={s.author}
          author_role={s.author_role}
          author_image_url={s.author_image_url}
        />
      )
    }
    case 'stats_block': {
      const s = section as StatsBlockSection
      return (
        <StatsBlock
          key={index}
          headline={s.headline}
          subline={s.subline}
          items={s.items}
        />
      )
    }
    case 'process_steps': {
      const s = section as ProcessStepsSection
      return (
        <ProcessSteps
          key={index}
          headline={s.headline}
          subline={s.subline}
          items={s.items}
        />
      )
    }
    case 'info_box': {
      const s = section as InfoBoxSection
      return (
        <InfoBox
          key={index}
          variant={s.variant}
          headline={s.headline}
          body={s.body}
          cta_label={s.cta_label}
          cta_href={s.cta_href}
          asSection
        />
      )
    }
    default:
      return null
  }
}

export interface ProduktHauptseiteProps {
  slug: string
  /** Wenn true: canonical = baseUrl, breadcrumb endet bei "Startseite". */
  isRoot?: boolean
}

function DbUnavailableMain({ slug }: { slug: string }) {
  return (
    <main>
      <section className="max-w-[800px] mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#1a365d] mb-3">Service temporarily unavailable</h1>
        <p className="text-lg text-[#4a5568] mb-2">
          The database for <span className="font-semibold">{slug}</span> is not reachable right now.
        </p>
        <p className="text-sm text-[#718096]">
          If this is a Supabase free-tier project, restore it in the Supabase dashboard (paused projects
          stop resolving DNS). After restore, redeploy or wait ~1 minute for cache refresh.
        </p>
      </section>
    </main>
  )
}

type HauptseiteContentRow = {
  content: unknown
  title: string | null
  slug: string | null
  status: string
  produkt_id: string
  autor_id?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  updated_at?: string | null
  produkte: { id: string; slug: string; name: string; typ?: string } | null
}

async function fetchHauptseiteContent(
  supabase: ReturnType<typeof createAdminClient>,
  slug: string,
  status: 'publiziert' | 'review' | 'entwurf',
): Promise<HauptseiteContentRow | null> {
  const { data } = await supabase
    .from('generierter_content')
    .select(
      'content, title, slug, status, produkt_id, autor_id, reviewed_by, reviewed_at, updated_at, produkte!inner(id, slug, name, typ)',
    )
    .eq('page_type', 'hauptseite')
    .eq('status', status)
    .eq('produkte.slug', slug)
    .maybeSingle()
  return (data as HauptseiteContentRow | null) ?? null
}

export async function ProduktHauptseite({ slug, isRoot = false }: ProduktHauptseiteProps) {
  const supabase = createAdminClient()

  const produktRes = await supabase
    .from('produkte')
    .select('id, name, typ, hero_image_url, hero_image_alt, short_pitch, produkt_config(zielgruppe, fokus)')
    .eq('slug', slug)
    .single()

  // Prefer publiziert, then review, then entwurf — avoids empty homepage when content not promoted yet.
  let row: Awaited<ReturnType<typeof fetchHauptseiteContent>> = null
  for (const status of ['publiziert', 'review', 'entwurf'] as const) {
    row = await fetchHauptseiteContent(supabase, slug, status)
    if (row) break
  }

  const produkt = produktRes.data

  if (produktRes.error) {
    if (isRowNotFound(produktRes.error)) {
      notFound()
    }
    console.error('produkt lookup failed', produktRes.error)
    return <DbUnavailableMain slug={slug} />
  }

  if (!produkt) {
    notFound()
  }

  if (!row) {
    const p = produkt as {
      name?: string | null
      typ?: string
      hero_image_url?: string | null
      hero_image_alt?: string | null
      short_pitch?: string | null
    }
    const earlyTyp = p.typ ?? 'sterbegeld'
    return (
      <main>
        <Hero
          {...enrichHeroSection(
            {
              type: 'hero',
              headline: p.name ?? slug,
              subline:
                p.short_pitch ??
                'Diese Produktseite wird gerade erstellt — Inhalte folgen in Kürze.',
              cta_text: 'Mehr erfahren',
              cta_anchor: '#platzhalter',
              image_url: p.hero_image_url ?? null,
              image_alt: p.hero_image_alt ?? null,
            },
            earlyTyp,
            slug,
            { image_url: p.hero_image_url, image_alt: p.hero_image_alt },
          )}
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
  const produktName = produktRel?.name ?? slug
  const produktTyp = produktRel?.typ ?? (produkt as { typ?: string } | null)?.typ ?? 'sterbegeld'
  const configs = produkt?.produkt_config
  const config = (Array.isArray(configs) ? configs[0] : configs) as { zielgruppe?: string[]; fokus?: string } | null
  const zielgruppeTag = config?.zielgruppe?.[0] ?? 'senioren_50plus'
  const intentTag = config?.fokus ?? 'sicherheit'

  const baseUrl = resolveBaseUrl()
  const canonical = isRoot ? `${baseUrl}/` : `${baseUrl}/${slug}`

  const breadcrumb = isRoot
    ? [{ name: 'Startseite', url: canonical }]
    : [
        { name: 'Startseite', url: `${baseUrl}/` },
        { name: produktName, url: canonical },
      ]

  const combinedSchema = combineSchemas(
    buildInsuranceAgencySchema({ name: produktName, url: canonical }),
    buildProductSchema({ name: produktName, description: row.title ?? '', brand: produktName }),
    buildBreadcrumbSchema(breadcrumb),
  )

  const ctx: RenderCtx = {
    produktId,
    produktTyp,
    produktName,
    produktSlug: slug,
    zielgruppeTag,
    intentTag,
    heroImageUrl: (produkt as { hero_image_url?: string | null }).hero_image_url ?? null,
    heroImageAlt: (produkt as { hero_image_alt?: string | null }).hero_image_alt ?? null,
    datenschutzHref: resolveDatenschutzHref(slug),
  }

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
        {leadFormIndex < 0 && <TrustBlock produktId={produktId} produktName={produktName} />}
      </main>
    </>
  )
}

// ===== Metadata helpers =====

/**
 * Lädt SEO-Metadaten für die Produkt-Hauptseite aus generierter_content.
 * Wird von generateMetadata() in app/[produkt]/page.tsx und app/page.tsx aufgerufen.
 */
export async function loadProduktMetadata(slug: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('generierter_content')
    .select('meta_title, meta_desc, slug, produkte!inner(slug, name)')
    .eq('page_type', 'hauptseite')
    .eq('produkte.slug', slug)
    .single()
  return data
}
