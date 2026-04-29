// Public Blog index — listet alle publizierten Beiträge.
// Server Component, ISR 1h.
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog — finanzteam26',
  description:
    'Wissenswertes rund um Versicherungen: Sterbegeld, Pflege, Berufsunfähigkeit, Risikoleben und Unfall. Verständlich erklärt vom finanzteam26.',
}

interface BlogRow {
  slug: string
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
  const { data } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, cover_image_url, cover_image_alt, published_at, reading_time, kategorien')
    .eq('status', 'publiziert')
    .order('published_at', { ascending: false })

  const posts = (data ?? []) as BlogRow[]

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-[#1a365d] mb-2">Blog</h1>
      <p className="text-lg text-gray-600 mb-10">
        Wissenswertes rund um Versicherungen — verständlich erklärt.
      </p>

      {posts.length === 0 ? (
        <p className="text-gray-500">Aktuell sind keine Artikel veröffentlicht.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
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
