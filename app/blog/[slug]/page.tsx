// Public Blog Detail — rendert Markdown aus blog_posts.content_md.
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { renderMarkdown } from '@/lib/markdown/render'
import { loadLinker } from '@/lib/linker/auto-link'

export const revalidate = 3600
export const dynamicParams = true

interface PageProps {
  params: { slug: string }
}

export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('status', 'publiziert')
  return (data ?? []).map(r => ({ slug: r.slug as string }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('title, meta_title, meta_desc, cover_image_url')
    .eq('slug', params.slug)
    .eq('status', 'publiziert')
    .single()

  if (!data) return { title: 'Artikel nicht gefunden', robots: { index: false } }

  return {
    title: data.meta_title ?? data.title,
    description: data.meta_desc ?? undefined,
    openGraph: {
      title: data.meta_title ?? data.title,
      images: data.cover_image_url ? [{ url: data.cover_image_url }] : undefined,
    },
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'publiziert')
    .single()

  if (!post) notFound()

  // Auto-Cross-Linking auf Wissensfundus-Slugs
  const linker = await loadLinker()
  const linkedMd = linker.linkify(post.content_md as string)

  // Schema.org Article
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image_url ?? undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: post.author ?? 'finanzteam26' },
    publisher: {
      '@type': 'Organization',
      name: 'finanzteam26',
      logo: { '@type': 'ImageObject', url: '/logo.png' },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/blog" className="text-sm text-[#02a9e6] hover:underline">&larr; Zurück zum Blog</Link>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            className="w-full h-72 object-cover rounded-lg my-6"
          />
        )}

        <h1 className="text-4xl font-bold text-[#1a365d] mb-3">{post.title}</h1>

        {post.excerpt && <p className="text-lg text-gray-600 mb-6">{post.excerpt}</p>}

        <div className="text-sm text-gray-400 mb-8">
          {post.author && <span>{post.author}</span>}
          {post.published_at && (
            <>
              <span className="mx-2">·</span>
              <span>{new Date(post.published_at).toLocaleDateString('de-DE')}</span>
            </>
          )}
          {post.reading_time && (
            <>
              <span className="mx-2">·</span>
              <span>{post.reading_time} Min. Lesezeit</span>
            </>
          )}
        </div>

        <article className="prose prose-lg max-w-none text-gray-800">
          {renderMarkdown(linkedMd)}
        </article>
      </main>
    </>
  )
}
