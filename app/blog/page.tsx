// Public Blog index — listet alle publizierten Beiträge.
// Vereint zwei Quellen:
//   1. blog_posts (re-importierte / native Blog-Beiträge)
//   2. generierter_content mit page_type='ratgeber' (produkt-verlinkte Ratgeber)
// Server Component, ISR 1h.
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog — Sterbegeld24Plus',
  description:
    'Wissenswertes rund um Sterbegeld, Bestattungsvorsorge und Versicherungen — verständlich erklärt vom finanzteam26.',
}

interface BlogEntry {
  href: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  cover_image_alt: string | null
  published_at: string | null
  reading_time: number | null
  kategorien: string[] | null
}

export default async function BlogIndexPage() {
  const supabase = createAdminClient()

  // 1. blog_posts (native Posts)
  const blogPostsPromise = supabase
    .from('blog_posts')
    .select('slug, title, excerpt, cover_image_url, cover_image_alt, published_at, reading_time, kategorien')
    .eq('status', 'publiziert')
    .order('published_at', { ascending: false })

  // 2. Ratgeber-Artikel aus generierter_content + zugeordnetes Produkt
  const ratgeberPromise = supabase
    .from('generierter_content')
    .select('slug, title, meta_desc, content, generated_at, produkte:produkt_id(slug, hero_image_url, hero_image_alt)')
    .eq('page_type', 'ratgeber')
    .eq('status', 'publiziert')
    .order('generated_at', { ascending: false })

  const [{ data: blogPosts }, { data: ratgeberRows }] = await Promise.all([
    blogPostsPromise,
    ratgeberPromise,
  ])

  // Beiträge in einheitliches Shape konvertieren
  const entries: BlogEntry[] = []

  for (const p of (blogPosts ?? []) as Array<{
    slug: string
    title: string
    excerpt: string | null
    cover_image_url: string | null
    cover_image_alt: string | null
    published_at: string | null
    reading_time: number | null
    kategorien: string[] | null
  }>) {
    entries.push({
      href: `/blog/${p.slug}`,
      title: p.title,
      excerpt: p.excerpt,
      cover_image_url: p.cover_image_url,
      cover_image_alt: p.cover_image_alt,
      published_at: p.published_at,
      reading_time: p.reading_time,
      kategorien: p.kategorien,
    })
  }

  for (const r of (ratgeberRows ?? []) as Array<{
    slug: string | null
    title: string | null
    meta_desc: string | null
    content: {
      sections?: Array<{ headline?: string; subline?: string; intro?: string }>
      cover_image_url?: string
      cover_image_alt?: string
    } | null
    generated_at: string | null
    produkte: { slug: string; hero_image_url: string | null; hero_image_alt: string | null } | null
  }>) {
    if (!r.slug || !r.produkte) continue
    // Excerpt: lieber meta_desc, sonst erster Section-Subline/Intro
    const firstSection = r.content?.sections?.[0]
    const excerpt =
      r.meta_desc ?? firstSection?.subline ?? firstSection?.intro ?? null
    // Eigenes Cover-Bild des Ratgebers bevorzugt, sonst Produkt-Hero-Bild.
    const cover_image_url = r.content?.cover_image_url ?? r.produkte.hero_image_url
    const cover_image_alt = r.content?.cover_image_alt ?? r.produkte.hero_image_alt
    entries.push({
      href: `/${r.produkte.slug}/ratgeber/${r.slug}`,
      title: r.title ?? '(ohne Titel)',
      excerpt,
      cover_image_url,
      cover_image_alt,
      published_at: r.generated_at,
      reading_time: null,
      kategorien: null,
    })
  }

  // Sortierung: neueste zuerst (published_at oder generated_at)
  entries.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0
    const tb = b.published_at ? Date.parse(b.published_at) : 0
    return tb - ta
  })

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-[#1a365d] mb-2">Blog</h1>
      <p className="text-lg text-gray-600 mb-10">
        Wissenswertes rund um Sterbegeld und Bestattungsvorsorge — verständlich erklärt.
      </p>

      {entries.length === 0 ? (
        <p className="text-gray-500">Aktuell sind keine Artikel veröffentlicht.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {entries.map(post => (
            <Link
              key={post.href}
              href={post.href}
              className="group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            >
              {post.cover_image_url ? (
                <img
                  src={post.cover_image_url}
                  alt={post.cover_image_alt ?? post.title}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-[#1a365d] to-[#2c5282]" />
              )}
              <div className="p-6">
                {post.kategorien && post.kategorien.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {post.kategorien.slice(0, 2).map(k => (
                      <span key={k} className="text-xs uppercase tracking-wide text-[#02a9e6] font-semibold">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="text-xl font-bold text-[#1a365d] group-hover:text-[#02a9e6] transition-colors mb-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-gray-600 text-sm line-clamp-3">{post.excerpt}</p>
                )}
                {post.reading_time && (
                  <p className="text-xs text-gray-400 mt-3">{post.reading_time} Min. Lesezeit</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
