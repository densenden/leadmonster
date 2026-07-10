// Section-type renderer for Ratgeber guide articles.
// Accepts a typed sections array and maps each variant to its visual component.
// Unknown section types return null — no crash, no render.
// This is a Server Component — no 'use client' directive needed.
import { LeadForm } from '@/components/sections/LeadForm'
import { resolveDatenschutzHref } from '@/lib/privacy/lead-consent'
import { InlineMarkdown } from '@/components/util/InlineMarkdown'
import { InfoBox } from '@/components/sections/InfoBox'
import { renderMarkdown } from '@/lib/markdown/render'
import type { RatgeberSection } from '@/lib/types/ratgeber'

const LINK_CLS = 'text-[#02a9e6] hover:underline'

// ---------------------------------------------------------------------------
// Intent tag derivation
// ---------------------------------------------------------------------------

/**
 * Derive the lead form intent tag from the article slug.
 *
 * Slugs containing 'kosten' or 'preis' → 'preis'
 * Slugs containing 'schutz' or 'sicherheit' → 'sicherheit'
 * Default → 'sicherheit'
 */
export function deriveIntentTag(slug: string): 'preis' | 'sicherheit' | 'sofortschutz' {
  const lower = slug.toLowerCase()
  if (lower.includes('kosten') || lower.includes('preis')) return 'preis'
  if (lower.includes('schutz') || lower.includes('sicherheit')) return 'sicherheit'
  return 'sicherheit'
}

// ---------------------------------------------------------------------------
// Section renderer props
// ---------------------------------------------------------------------------

interface RatgeberRendererProps {
  sections: RatgeberSection[]
  /** Article slug (thema) — used to derive the lead form intent tag. */
  articleSlug: string
  /** Produkt slug — used for internal related article links. */
  produktSlug: string
  /** Supabase product UUID — passed to the lead form. */
  produktId: string
  /** Zielgruppe tag pre-set from product config. */
  zielgruppeTag: string
}

// ---------------------------------------------------------------------------
// Section component renderers
// ---------------------------------------------------------------------------

function renderIntro(section: Extract<RatgeberSection, { type: 'intro' }>, key: number) {
  return (
    <p
      key={key}
      className="text-lg font-light leading-relaxed text-[#333333] mb-8 max-w-3xl"
    >
      <InlineMarkdown linkClassName={LINK_CLS}>{section.text}</InlineMarkdown>
    </p>
  )
}

function renderBody(section: Extract<RatgeberSection, { type: 'body' }>, key: number) {
  return (
    <section key={key} className="mb-10">
      <h2 className="text-2xl font-semibold text-[#1a365d] mb-4 font-heading">
        <InlineMarkdown linkClassName={LINK_CLS}>{section.heading}</InlineMarkdown>
      </h2>
      <div className="space-y-4">
        {section.paragraphs.map((paragraph, i) => (
          <p key={i} className="text-base font-light leading-relaxed text-[#333333]">
            <InlineMarkdown linkClassName={LINK_CLS}>{paragraph}</InlineMarkdown>
          </p>
        ))}
      </div>
    </section>
  )
}

function renderSteps(section: Extract<RatgeberSection, { type: 'steps' }>, key: number) {
  return (
    <section key={key} className="mb-10">
      <h2 className="text-2xl font-semibold text-[#1a365d] mb-6 font-heading">
        <InlineMarkdown linkClassName={LINK_CLS}>{section.heading}</InlineMarkdown>
      </h2>
      <ol className="space-y-6">
        {section.items.map((item, i) => (
          <li key={i} className="flex gap-5">
            <span
              className="text-4xl font-bold text-[#abd5f4] leading-none flex-shrink-0 w-12 text-center"
              aria-hidden="true"
            >
              {item.number}
            </span>
            <div>
              <p className="font-semibold text-[#1a365d] mb-1">
                <InlineMarkdown linkClassName={LINK_CLS}>{item.title}</InlineMarkdown>
              </p>
              <p className="text-base font-light leading-relaxed text-[#333333]">
                <InlineMarkdown linkClassName={LINK_CLS}>{item.description}</InlineMarkdown>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function renderCta(
  section: Extract<RatgeberSection, { type: 'cta' }>,
  key: number,
  articleSlug: string,
  produktId: string,
  zielgruppeTag: string,
  datenschutzHref: string,
) {
  const intentTag = deriveIntentTag(articleSlug)

  return (
    <section key={key} className="mb-10">
      {section.headline && (
        <h2 className="text-2xl font-semibold text-[#1a365d] mb-6 font-heading">
          <InlineMarkdown linkClassName={LINK_CLS}>{section.headline}</InlineMarkdown>
        </h2>
      )}
      <LeadForm
        formId="lead-form-ratgeber"
        produktId={produktId}
        zielgruppeTag={zielgruppeTag}
        intentTag={intentTag}
        datenschutzHref={datenschutzHref}
      />
    </section>
  )
}

function renderImageText(
  section: Extract<RatgeberSection, { type: 'image_text' }>,
  key: number,
) {
  const imageOnRight = section.image_side === 'right'
  return (
    <section key={key} className="mb-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      <div className={`md:col-span-5 ${imageOnRight ? 'md:order-2' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={section.image_url}
          alt={section.image_alt}
          className="w-full aspect-[4/3] object-cover rounded-xl shadow-md"
          loading="lazy"
        />
      </div>
      <div className={`md:col-span-7 ${imageOnRight ? 'md:order-1' : ''}`}>
        {section.heading && (
          <h2 className="text-xl md:text-2xl font-semibold text-[#1a365d] mb-3 font-heading">
            <InlineMarkdown linkClassName={LINK_CLS}>{section.heading}</InlineMarkdown>
          </h2>
        )}
        <div className="prose max-w-none text-[#333333] font-light leading-relaxed">
          {renderMarkdown(section.body)}
        </div>
      </div>
    </section>
  )
}

function renderQuote(
  section: Extract<RatgeberSection, { type: 'quote' }>,
  key: number,
) {
  return (
    <figure
      key={key}
      className="mb-10 border-l-4 border-[#d4af37] bg-[#f8f8f8] pl-6 pr-4 py-5 rounded-r-lg"
    >
      <blockquote className="text-lg font-heading text-[#1a365d] leading-snug italic">
        <InlineMarkdown linkClassName={LINK_CLS}>{`„${section.quote}"`}</InlineMarkdown>
      </blockquote>
      {(section.author || section.author_role) && (
        <figcaption className="mt-3 text-sm text-[#666]">
          {section.author && <span className="font-semibold text-[#1a365d]">{section.author}</span>}
          {section.author && section.author_role && <span className="mx-1.5">·</span>}
          {section.author_role && <span>{section.author_role}</span>}
        </figcaption>
      )}
    </figure>
  )
}

function renderInfoBox(
  section: Extract<RatgeberSection, { type: 'info_box' }>,
  key: number,
) {
  return (
    <div key={key} className="mb-10">
      <InfoBox
        variant={section.variant}
        headline={section.heading}
        body={section.body}
        cta_label={section.cta_label}
        cta_href={section.cta_href}
        asSection={false}
      />
    </div>
  )
}

function renderRelated(
  section: Extract<RatgeberSection, { type: 'related' }>,
  key: number,
  produktSlug: string,
) {
  if (section.articles.length === 0) return null

  return (
    <section key={key} className="mb-10">
      <h2 className="text-2xl font-semibold text-[#1a365d] mb-6 font-heading">
        Weitere Ratgeber
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {section.articles.map((article, i) => (
          <a
            key={i}
            href={`/${produktSlug}/ratgeber/${article.slug}`}
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <p className="font-semibold text-[#1a365d] text-sm leading-snug">
              {article.title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
            </p>
            <span className="mt-2 inline-block text-xs text-[#abd5f4] font-medium">
              Ratgeber lesen →
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main renderer export
// ---------------------------------------------------------------------------

/** Map each section variant to its visual representation.
 *  Unknown types return null so future section variants cannot crash the page. */
export function RatgeberRenderer({
  sections,
  articleSlug,
  produktSlug,
  produktId,
  zielgruppeTag,
}: RatgeberRendererProps) {
  const datenschutzHref = resolveDatenschutzHref(produktSlug)

  return (
    <div>
      {sections.map((section, index) => {
        switch (section.type) {
          case 'intro':
            return renderIntro(section, index)
          case 'body':
            return renderBody(section, index)
          case 'steps':
            return renderSteps(section, index)
          case 'cta':
            return renderCta(
              section,
              index,
              articleSlug,
              produktId,
              zielgruppeTag,
              datenschutzHref,
            )
          case 'related':
            return renderRelated(section, index, produktSlug)
          case 'image_text':
            return renderImageText(section, index)
          case 'quote':
            return renderQuote(section, index)
          case 'info_box':
            return renderInfoBox(section, index)
          default:
            // TypeScript exhaustiveness — unknown variants return null
            return null
        }
      })}
    </div>
  )
}
