// Section-type renderer for Ratgeber guide articles.
// Accepts a typed sections array and maps each variant to its visual component.
// Unknown section types return null — no crash, no render.
// This is a Server Component — no 'use client' directive needed.
import { LeadForm } from '@/components/sections/LeadForm'
import type { RatgeberSection } from '@/lib/types/ratgeber'

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
      {section.text}
    </p>
  )
}

function renderBody(section: Extract<RatgeberSection, { type: 'body' }>, key: number) {
  return (
    <section key={key} className="mb-10">
      <h2 className="text-2xl font-semibold text-[#1a365d] mb-4 font-heading">
        {section.heading}
      </h2>
      <div className="space-y-4">
        {section.paragraphs.map((paragraph, i) => (
          <p key={i} className="text-base font-light leading-relaxed text-[#333333]">
            {paragraph}
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
        {section.heading}
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
              <p className="font-semibold text-[#1a365d] mb-1">{item.title}</p>
              <p className="text-base font-light leading-relaxed text-[#333333]">
                {item.description}
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
) {
  const intentTag = deriveIntentTag(articleSlug)

  return (
    <section key={key} className="mb-10">
      {section.headline && (
        <h2 className="text-2xl font-semibold text-[#1a365d] mb-6 font-heading">
          {section.headline}
        </h2>
      )}
      <LeadForm
        produktId={produktId}
        zielgruppeTag={zielgruppeTag}
        intentTag={intentTag}
      />
    </section>
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
            <p className="font-semibold text-[#1a365d] text-sm leading-snug">{article.title}</p>
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
            return renderCta(section, index, articleSlug, produktId, zielgruppeTag)
          case 'related':
            return renderRelated(section, index, produktSlug)
          default:
            // TypeScript exhaustiveness — unknown variants return null
            return null
        }
      })}
    </div>
  )
}
