// Pure metadata builder for public product pages.
// Returns a fully typed Next.js Metadata object from known inputs — no Supabase calls.
//
// IMPORTANT: Uses `title.absolute` to bypass the root layout's
// `'%s | LeadMonster'` template — product subsites must NOT show LeadMonster
// branding. Same applies to openGraph.siteName (set to product name).
import type { Metadata } from 'next'
import { resolveBaseUrl } from './organization'

export interface ProduktMetadataInput {
  slug: string
  meta_title: string
  meta_desc: string
  /** Product name — used for openGraph.siteName so it does NOT show LeadMonster. */
  produktName?: string
  /** Optional custom domain — falls back to NEXT_PUBLIC_BASE_URL env var, then sterbegeld24plus.de. */
  domain?: string
  /**
   * Optionaler Title-Suffix (z. B. „Christian Wimmer Versicherungsmakler")
   * für Nicht-Sterbegeld-Produkte — vermeidet, dass die Sterbegeld-Domain
   * als verwirrender Kontext im Title-Tag erscheint. Siehe § 8 Mitigation.
   * Leer / undefined = kein Suffix.
   */
  titleSuffix?: string | null
}

// Build a Next.js Metadata object for a public product page.
// Caller is responsible for ensuring meta_title <= 60 chars and meta_desc <= 160 chars.
export function buildProduktMetadata({
  slug,
  meta_title,
  meta_desc,
  produktName,
  domain,
  titleSuffix,
}: ProduktMetadataInput): Metadata {
  const baseUrl = resolveBaseUrl(domain)
  const canonical = `${baseUrl}/${slug}`

  // Title-Suffix anhängen (max 60 chars-Limit beachten — Suffix wird notfalls
  // weggelassen, statt den Haupt-Title zu beschneiden).
  const title = titleSuffix && titleSuffix.trim().length > 0
    ? truncateWithSuffix(meta_title, titleSuffix.trim(), 60)
    : meta_title

  return {
    title: { absolute: title },
    description: meta_desc,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description: meta_desc,
      type: 'website',
      url: canonical,
      siteName: produktName,
    },
  }
}

/**
 * Hängt `<base> | <suffix>` an, solange das Ergebnis ≤ maxChars ist.
 * Wenn der base-Title selbst zu lang ist, wird er ohne Suffix zurückgegeben
 * (statt das Branding kaputt zu kürzen).
 */
function truncateWithSuffix(base: string, suffix: string, maxChars: number): string {
  const combined = `${base} | ${suffix}`
  if (combined.length <= maxChars) return combined
  if (base.length <= maxChars) return base
  return base.slice(0, maxChars)
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
  const baseUrl = resolveBaseUrl(produkt.domain)
  const canonical = `${baseUrl}/${produkt.slug}/faq`

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
