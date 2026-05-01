// Generates /sitemap.xml via Next.js MetadataRoute.Sitemap.
// Queries Supabase for published products and ratgeber content to build all public URL entries.
// Returns an empty array (with a console error) if NEXT_PUBLIC_BASE_URL is not configured.
import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { buildCanonicalUrl } from '@/lib/seo/metadata'
import { loadAnbieterForProdukt, slugifyAnbieter } from '@/lib/anbieter/load'

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
    // Anbieter-Landingpages
    const anbieter = await loadAnbieterForProdukt(produkt.id)
    for (const a of anbieter) {
      entries.push({
        url: buildCanonicalUrl(`/${produkt.slug}/anbieter/${slugifyAnbieter(a.anbieter_name)}`),
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
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

  // Wissensfundus — nur Einträge ≥800 Wörter (Spec §4 SEO-Strategie).
  const { data: wissen } = await supabase
    .from('wissensfundus')
    .select('slug, updated_at, wortzahl')
    .eq('published', true)
    .not('slug', 'is', null)
    .gte('wortzahl', 800)
  for (const w of wissen ?? []) {
    if (!w.slug) continue
    entries.push({
      url: buildCanonicalUrl(`/wissen/${w.slug}`),
      lastModified: w.updated_at ?? undefined,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  // /wissen-Übersicht
  entries.push({
    url: buildCanonicalUrl('/wissen'),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  })

  // Blog-Posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'publiziert')
  for (const p of posts ?? []) {
    entries.push({
      url: buildCanonicalUrl(`/blog/${p.slug}`),
      lastModified: p.updated_at ?? undefined,
      changeFrequency: 'monthly',
      priority: 0.55,
    })
  }
  if (posts && posts.length > 0) {
    entries.push({
      url: buildCanonicalUrl('/blog'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  // Redaktions-Profile (E-E-A-T)
  const { data: autoren } = await supabase
    .from('redaktion')
    .select('slug, updated_at')
    .eq('public', true)
  for (const a of autoren ?? []) {
    entries.push({
      url: buildCanonicalUrl(`/redaktion/${a.slug}`),
      lastModified: a.updated_at ?? undefined,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }
  if (autoren && autoren.length > 0) {
    entries.push({
      url: buildCanonicalUrl('/redaktion'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    })
  }

  return entries
}
