// Schema.org JSON-LD helper for the content generation pipeline.
// Composes the appropriate structured data object for each page type,
// validates required fields, and injects the canonical URL before saving.
import type { PageType } from '@/lib/anthropic/types'
import type { StepsSection } from '@/lib/types/ratgeber'

// Thrown when required Schema.org fields are missing — the generator
// catches this and marks the affected page type as failed.
export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaValidationError'
  }
}

export interface SchemaInput {
  canonicalUrl: string
  produktName?: string
  faqItems?: { frage: string; antwort: string }[]
  anbieter?: { name: string; preis_ab: string }[]
  artikel?: { titel: string; intro: string }
  tarifMin?: number
}

// Build a Schema.org JSON-LD object for the given page type.
// Throws SchemaValidationError if canonicalUrl is missing.
export function buildSchemaMarkup(
  pageType: PageType,
  data: SchemaInput,
): Record<string, unknown> {
  if (!data.canonicalUrl) {
    throw new SchemaValidationError('canonicalUrl is required for Schema.org markup')
  }

  const base = { '@context': 'https://schema.org' }

  switch (pageType) {
    case 'hauptseite':
      return {
        ...base,
        '@type': 'InsuranceAgency',
        name: data.produktName ?? '',
        url: data.canonicalUrl,
        mainEntity: { '@type': 'Product', name: data.produktName ?? '' },
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [] },
      }

    case 'faq':
      return {
        ...base,
        '@type': 'FAQPage',
        url: data.canonicalUrl,
        mainEntity: (data.faqItems ?? []).map(item => ({
          '@type': 'Question',
          name: item.frage,
          acceptedAnswer: { '@type': 'Answer', text: item.antwort },
        })),
      }

    case 'vergleich':
      return {
        ...base,
        '@type': 'ItemList',
        url: data.canonicalUrl,
        itemListElement: (data.anbieter ?? []).map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Product',
            name: a.name,
            offers: { '@type': 'Offer', price: a.preis_ab },
          },
        })),
      }

    case 'ratgeber':
      return {
        ...base,
        '@type': 'Article',
        url: data.canonicalUrl,
        headline: data.artikel?.titel ?? '',
        description: data.artikel?.intro ?? '',
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [] },
      }

    case 'tarif':
      return {
        ...base,
        '@type': 'Product',
        url: data.canonicalUrl,
        name: data.produktName ?? '',
        offers: {
          '@type': 'Offer',
          price: data.tarifMin ?? 0,
          priceCurrency: 'EUR',
        },
      }

    default: {
      // TypeScript exhaustiveness guard — should never be reached if PageType union is complete.
      const unreachable: never = pageType
      throw new SchemaValidationError(`Unknown page type: ${unreachable}`)
    }
  }
}

// ===== Public page schema builders =====

/** Schema.org InsuranceAgency */
export interface InsuranceAgencyInput {
  name: string
  url: string
  logo?: string
  sameAs?: string[]
}

/** Builds an InsuranceAgency schema object for the public landing page. */
export function buildInsuranceAgencySchema(input: InsuranceAgencyInput): Record<string, unknown> {
  return {
    '@type': 'InsuranceAgency',
    name: input.name,
    url: input.url,
    ...(input.logo ? { logo: input.logo } : {}),
    ...(input.sameAs ? { sameAs: input.sameAs } : {}),
  }
}

/** Schema.org Product */
export interface ProductSchemaInput {
  name: string
  description: string
  brand: string
  offersDescription?: string
}

/** Builds a Product schema object with a placeholder offers field. */
export function buildProductSchema(input: ProductSchemaInput): Record<string, unknown> {
  return {
    '@type': 'Product',
    name: input.name,
    description: input.description,
    brand: { '@type': 'Brand', name: input.brand },
    offers: { '@type': 'Offer', description: input.offersDescription ?? '' },
  }
}

/** Builds a BreadcrumbList schema object from an array of name/url pairs.
 *  NOTE: This version does NOT include @context — it is intended for use inside
 *  combineSchemas() where @context is applied at the @graph level.
 *  For standalone use with @context, use generateBreadcrumbSchema(). */
export function buildBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** Combine multiple schema objects into a single @graph JSON-LD string for injection. */
export function combineSchemas(...schemas: Record<string, unknown>[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': schemas,
  })
}

// ===== FAQ public page schema helpers =====

/** Input shape for a single FAQ question/answer pair. */
export interface FAQItem {
  frage: string
  antwort: string
}

/** Builds a standalone Schema.org FAQPage object with @context for direct injection. */
export function generateFAQPageSchema(items: FAQItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.frage,
      acceptedAnswer: { '@type': 'Answer', text: item.antwort },
    })),
  }
}

/** Builds a standalone BreadcrumbList schema object with @context for direct injection.
 *  Unlike buildBreadcrumbSchema, this version includes @context so it can stand alone. */
export function generateBreadcrumbSchema(crumbs: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }
}

// ===== Vergleich (insurer comparison) schema helpers =====

/** Input shape for a single comparison criterion row. */
export interface VergleichCriterion {
  label: string
  values: Record<string, string | boolean>
}

/** Input shape for the full vergleich page schema generator. */
export interface VergleichSchemaInput {
  anbieter: string[]
  produktName: string
  produktTyp: string
  produktSlug: string
  criteria: VergleichCriterion[]
}

/** Schema.org ItemList + Product for insurer comparison.
 *  Returns a @graph containing a BreadcrumbList (3 entries) and an ItemList of Products.
 *  Stored in generierter_content.schema_markup and served verbatim from the page. */
export function generateVergleichSchema(input: VergleichSchemaInput): object {
  const { anbieter, produktName, produktTyp, produktSlug, criteria } = input
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://leadmonster.de'

  // Ensure baseUrl has https:// prefix for schema item URLs
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Startseite', item: origin },
      { '@type': 'ListItem', position: 2, name: produktName, item: `${origin}/${produktSlug}` },
      { '@type': 'ListItem', position: 3, name: 'Vergleich', item: `${origin}/${produktSlug}/vergleich` },
    ],
  }

  const itemList = {
    '@type': 'ItemList',
    itemListElement: anbieter.map((name, index) => {
      // Build description from criteria where this insurer has a truthy boolean value
      const trueCriteria = criteria
        .filter(c => c.values[name] === true)
        .map(c => c.label)
        .join(', ')
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name,
          description: trueCriteria,
          offers: { '@type': 'Offer', category: produktTyp },
        },
      }
    }),
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumb, itemList],
  }
}

// ===== Ratgeber (guide article) schema helpers =====

/** Input shape for buildArticleSchema. */
export interface ArticleSchemaInput {
  headline: string
  description: string
  datePublished: string
  dateModified?: string
  produktSlug: string
  thema: string
}

/** Builds a Schema.org Article object for a ratgeber guide page.
 *  Uses InsuranceAgency as the author entity.
 *  Intended for use inside combineSchemas() — no @context included. */
export function buildArticleSchema(input: ArticleSchemaInput): Record<string, unknown> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
  const canonicalUrl = `${origin}/${input.produktSlug}/ratgeber/${input.thema}`

  const author = {
    '@type': 'InsuranceAgency',
    name: 'LeadMonster',
    url: origin,
  }

  return {
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: canonicalUrl,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author,
    publisher: author,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  }
}

/** Input shape for buildHowToSchema. */
export interface HowToSchemaInput {
  name: string
  steps: StepsSection['items']
}

/** Builds a Schema.org HowTo object from a steps section.
 *  Should only be called when at least one steps section is present.
 *  Intended for use inside combineSchemas() — no @context included. */
export function buildHowToSchema(input: HowToSchemaInput): Record<string, unknown> {
  return {
    '@type': 'HowTo',
    name: input.name,
    step: input.steps.map(item => ({
      '@type': 'HowToStep',
      position: item.number,
      name: item.title,
      text: item.description,
    })),
  }
}

// ===== Tariff calculator HowTo schema =====

/** Input shape for generateHowToSchema (tariff calculator specific). */
export interface HowToSchemaParams {
  produktName: string
  produktSlug: string
}

/**
 * Generates a standalone Schema.org HowTo object describing the three-step
 * tariff calculator flow. Includes @context for direct page injection.
 * Distinct from buildHowToSchema which is used for dynamic ratgeber steps.
 */
export function generateHowToSchema(params: HowToSchemaParams): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `${params.produktName} Beitrag berechnen`,
    step: [
      {
        '@type': 'HowToStep',
        name: 'Alter eingeben',
        text: 'Geben Sie Ihr Alter zwischen 40 und 85 Jahren an.',
      },
      {
        '@type': 'HowToStep',
        name: 'Wunschsumme wählen',
        text: 'Wählen Sie Ihre gewünschte Versicherungssumme zwischen 5.000 \u20ac und 15.000 \u20ac.',
      },
      {
        '@type': 'HowToStep',
        name: 'Beispielbeitrag ansehen und Angebot anfordern',
        text: 'Sehen Sie Ihren unverbindlichen Beispielbeitrag und fordern Sie Ihr persönliches Angebot an.',
      },
    ],
    tool: [
      {
        '@type': 'HowToTool',
        name: params.produktName,
      },
    ],
  }
}
