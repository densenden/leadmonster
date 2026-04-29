// Pure metadata builder for public product pages.
// Returns a fully typed Next.js Metadata object from known inputs — no Supabase calls.
//
// IMPORTANT: Uses `title.absolute` to bypass the root layout's
// `'%s | LeadMonster'` template — product subsites must NOT show LeadMonster
// branding. Same applies to openGraph.siteName (set to product name).
import type { Metadata } from 'next'

export interface ProduktMetadataInput {
  slug: string
  meta_title: string
  meta_desc: string
  /** Product name — used for openGraph.siteName so it does NOT show LeadMonster. */
  produktName?: string
  /** Optional custom domain — falls back to NEXT_PUBLIC_BASE_URL env var, then 'leadmonster.de'. */
  domain?: string
}

// Build a Next.js Metadata object for a public product page.
// Caller is responsible for ensuring meta_title <= 60 chars and meta_desc <= 160 chars.
export function buildProduktMetadata({
  slug,
  meta_title,
  meta_desc,
  produktName,
  domain,
}: ProduktMetadataInput): Metadata {
  const baseUrl = `https://${domain ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'}`
  const canonical = `${baseUrl}/${slug}`

  return {
    title: { absolute: meta_title },
    description: meta_desc,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: meta_title,
      description: meta_desc,
      type: 'website',
      url: canonical,
      siteName: produktName,
    },
  }
}

// ===== FAQ page metadata builder =====

interface FAQMetadataParams {
  produkt: { name: string; slug: string; domain?: string | null }
  faqRecord: { meta_title?: string | null; meta_desc?: string | null; status: string }
  itemCount: number
}

// Note on `title.absolute` + `openGraph.siteName`: same rationale as
// buildProduktMetadata — product subsites must NOT inherit "| LeadMonster".

// Build a Next.js Metadata object for the public FAQ page.
// Applies fallback title/description when DB fields are absent.
// Sets noindex for any status other than 'publiziert'.
export function buildFAQMetadata({ produkt, faqRecord, itemCount }: FAQMetadataParams): Metadata {
  const baseUrl = produkt.domain ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'leadmonster.de'
  const canonical = `https://${baseUrl}/${produkt.slug}/faq`

  const rawTitle =
    faqRecord.meta_title ?? `Häufige Fragen zu ${produkt.name} | ${itemCount} Antworten`
  const rawDesc =
    faqRecord.meta_desc ??
    `Hier finden Sie ${itemCount} häufige Fragen und Antworten rund um ${produkt.name}. Informieren Sie sich jetzt.`

  const title = rawTitle.slice(0, 60)
  const description = rawDesc.slice(0, 160)
  const isPublished = faqRecord.status === 'publiziert'

  return {
    title: { absolute: title },
    description,
    robots: isPublished ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical, siteName: produkt.name },
  }
}

// ===== Canonical URL builder =====

// Constructs an absolute canonical URL from a path using NEXT_PUBLIC_BASE_URL.
// Strips trailing slashes from the base and ensures the path starts with '/'.
// Throws a descriptive error if NEXT_PUBLIC_BASE_URL is not set.
export function buildCanonicalUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL
  if (!base) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set')
  }
  const normalizedBase = base.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}
