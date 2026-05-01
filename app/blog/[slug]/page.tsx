// Public Blog Detail — rendert Markdown aus blog_posts.content_md.
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { renderMarkdown } from '@/lib/markdown/render'
import { loadLinker } from '@/lib/linker/auto-link'
import { AuthorByline } from '@/components/sections/AuthorByline'
import { resolveAuthor } from '@/lib/redaktion/load'
import { buildArticleSchema, combineSchemas } from '@/lib/seo/schema'

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

  // Author + Reviewer (mit Fallback auf Produkt-Standard-Autor)
  const resolved = await resolveAuthor({
    autorId: post.autor_id,
    reviewerId: post.reviewed_by,
    reviewedAt: post.reviewed_at,
    produktId: post.produkt_id,
  })

  // Schema.org Article — mit Person-Author + reviewedBy + Bild
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://finanzteam26.de'
  const canonical = `${baseUrl}/blog/${post.slug}`
  const articleSchema = combineSchemas(
    {
      ...buildArticleSchema({
        headline: post.title,
        description: post.excerpt ?? '',
        datePublished: post.published_at ?? post.updated_at,
        dateModified: post.reviewed_at ?? post.updated_at,
        produktSlug: '',
        thema: '',
        url: canonical,
        author: resolved.autor
          ? { slug: resolved.autor.slug, name: `${resolved.autor.vorname} ${resolved.autor.nachname}` }
          : undefined,
        reviewedBy: resolved.reviewer
          ? { slug: resolved.reviewer.slug, name: `${resolved.reviewer.vorname} ${resolved.reviewer.nachname}` }
          : undefined,
      }),
      image: post.cover_image_url ?? undefined,
    },
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleSchema }}
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

        <AuthorByline
          autorId={post.autor_id}
          reviewerId={post.reviewed_by}
          reviewedAt={post.reviewed_at}
          produktId={post.produkt_id}
          standDate={post.reviewed_at ?? post.updated_at}
          variant="card"
        />

        <div className="text-sm text-gray-400 mb-8">
          {post.published_at && (
            <span>{new Date(post.published_at).toLocaleDateString('de-DE')}</span>
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
