// Generates /sitemap.xml via Next.js MetadataRoute.Sitemap.
// Queries Supabase for published products and ratgeber content to build all public URL entries.
// Returns an empty array (with a console error) if NEXT_PUBLIC_BASE_URL is not configured.
import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { buildCanonicalUrl } from '@/lib/seo/metadata'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fail fast — sitemap cannot be built without a base URL.
  try {
    buildCanonicalUrl('/')
  } catch {
    console.error('NEXT_PUBLIC_BASE_URL not set — returning empty sitemap')
    return []
  }

  const supabase = createAdminClient()
  const entries: MetadataRoute.Sitemap = []

  // Homepage — always included as a static entry.
  entries.push({
    url: buildCanonicalUrl('/'),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  })

  // Published products — four fixed sub-routes per product.
  const { data: produkte } = await supabase
    .from('produkte')
    .select('id, slug, updated_at')
    .eq('status', 'publiziert')

  for (const produkt of produkte ?? []) {
    const lastModified = produkt.updated_at

    entries.push({
      url: buildCanonicalUrl(`/${produkt.slug}`),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    })
    entries.push({
      url: buildCanonicalUrl(`/${produkt.slug}/faq`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    })
    entries.push({
      url: buildCanonicalUrl(`/${produkt.slug}/vergleich`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    })
    entries.push({
      url: buildCanonicalUrl(`/${produkt.slug}/tarife`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
    entries.push({
      url: buildCanonicalUrl(`/${produkt.slug}/vergleichsrechner`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.85,
    })
  }

  // Published ratgeber content — joined with produkte to get the product slug.
  const { data: ratgeber } = await supabase
    .from('generierter_content')
    .select('slug, published_at, produkte(slug)')
    .eq('page_type', 'ratgeber')
    .eq('status', 'publiziert')

  for (const r of ratgeber ?? []) {
    const produktSlug = (r.produkte as { slug: string } | null)?.slug
    if (produktSlug && r.slug) {
      entries.push({
        url: buildCanonicalUrl(`/${produktSlug}/ratgeber/${r.slug}`),
        // published_at is string | null; convert null to undefined for the Sitemap type.
        lastModified: r.published_at ?? undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  }

  return entries
}
