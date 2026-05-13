// "Neueste Beiträge"-Section für die Produkt-Hauptseite.
// Server-Component: lädt die 3 jüngsten publizierten Einträge aus
// generierter_content (page_type='ratgeber') + blog_posts und rendert sie
// als Cards mit Bild. Pflege deckungsgleich mit /blog (einheitliches Shape).
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

interface PreviewEntry {
  href: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  cover_image_alt: string | null
}

interface BlogPreviewProps {
  /** Aktueller Produkt-Slug — Ratgeber DIESES Produkts werden bevorzugt. */
  produktSlug: string
  /** Headline der Section, vom Generator/DB editierbar. */
  headline?: string
  /** Optionaler Subline-Untertitel. */
  subline?: string
  /** CTA-Link unter den Cards (z. B. „Alle Beiträge ansehen"). */
  cta_href?: string
  cta_label?: string
  /** Wie viele Karten anzeigen (Default 3). */
  limit?: number
}

export async function BlogPreview({
  produktSlug,
  headline = 'Neueste Beiträge',
  subline = 'Aktuelles aus dem Blog — verständlich erklärt vom finanzteam26.',
  cta_href = '/blog',
  cta_label = 'Alle Beiträge ansehen',
  limit = 3,
}: BlogPreviewProps) {
  const supabase = createAdminClient()

  // Ratgeber-Artikel des aktuellen Produkts (priorisiert) + Blog-Posts
  const [{ data: ratgeberRows }, { data: blogPosts }] = await Promise.all([
    supabase
      .from('generierter_content')
      .select('slug, title, meta_desc, content, generated_at, produkte:produkt_id(slug, hero_image_url, hero_image_alt)')
      .eq('page_type', 'ratgeber')
      .eq('status', 'publiziert')
      .order('generated_at', { ascending: false })
      .limit(10),
    supabase
      .from('blog_posts')
      .select('slug, title, excerpt, cover_image_url, cover_image_alt, published_at')
      .eq('status', 'publiziert')
      .order('published_at', { ascending: false })
      .limit(5),
  ])

  const entries: PreviewEntry[] = []

  // Ratgeber des aktuellen Produkts zuerst
  for (const r of (ratgeberRows ?? []) as Array<{
    slug: string | null
    title: string | null
    meta_desc: string | null
    content: {
      sections?: Array<{ subline?: string; intro?: string }>
      cover_image_url?: string
      cover_image_alt?: string
    } | null
    produkte: { slug: string; hero_image_url: string | null; hero_image_alt: string | null } | null
  }>) {
    if (!r.slug || !r.produkte) continue
    if (r.produkte.slug !== produktSlug) continue
    const firstSection = r.content?.sections?.[0]
    // Eigenes Cover-Bild des Ratgebers bevorzugt, sonst Produkt-Hero-Bild als Fallback.
    const cover_image_url = r.content?.cover_image_url ?? r.produkte.hero_image_url
    const cover_image_alt = r.content?.cover_image_alt ?? r.produkte.hero_image_alt
    entries.push({
      href: `/${r.produkte.slug}/ratgeber/${r.slug}`,
      title: r.title ?? '(ohne Titel)',
      excerpt: r.meta_desc ?? firstSection?.subline ?? firstSection?.intro ?? null,
      cover_image_url,
      cover_image_alt,
    })
  }

  // Falls noch Platz: Blog-Posts auffüllen
  for (const p of (blogPosts ?? []) as Array<{
    slug: string
    title: string
    excerpt: string | null
    cover_image_url: string | null
    cover_image_alt: string | null
  }>) {
    if (entries.length >= limit) break
    entries.push({
      href: `/blog/${p.slug}`,
      title: p.title,
      excerpt: p.excerpt,
      cover_image_url: p.cover_image_url,
      cover_image_alt: p.cover_image_alt,
    })
  }

  // Falls immer noch leer: Section ausblenden
  if (entries.length === 0) return null

  const shown = entries.slice(0, limit)

  return (
    <section className="py-16 bg-white" aria-label="Neueste Beiträge">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#1a365d] mb-2">
              {headline}
            </h2>
            {subline && <p className="text-gray-600">{subline}</p>}
          </div>
          {cta_href && (
            <Link
              href={cta_href}
              className="hidden md:inline-block text-sm text-[#02a9e6] hover:underline whitespace-nowrap"
            >
              {cta_label} →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shown.map(p => (
            <Link
              key={p.href}
              href={p.href}
              className="group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            >
              {p.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.cover_image_url}
                  alt={p.cover_image_alt ?? p.title}
                  className="w-full h-44 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-[#1a365d] to-[#2c5282]" />
              )}
              <div className="p-5">
                <h3 className="text-lg font-bold text-[#1a365d] group-hover:text-[#02a9e6] transition-colors mb-2 line-clamp-2">
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="text-gray-600 text-sm line-clamp-3">{p.excerpt}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {cta_href && (
          <div className="md:hidden mt-6 text-center">
            <Link href={cta_href} className="text-sm text-[#02a9e6] hover:underline">
              {cta_label} →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
