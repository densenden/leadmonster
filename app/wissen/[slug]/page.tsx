// Public Wissen-Detail — rendert einen Wissensfundus-Eintrag als Markdown.
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

const KATEGORIE_LABEL: Record<string, string> = {
  allgemein: 'Allgemein',
  sterbegeld: 'Sterbegeld',
  pflege: 'Pflege',
  leben: 'Risikoleben',
  bu: 'Berufsunfähigkeit',
  unfall: 'Unfallversicherung',
}

function readingMinutes(text: string): number {
  const words = text.replace(/[#*`>\-|]/g, '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('wissensfundus')
    .select('slug')
    .eq('published', true)
    .not('slug', 'is', null)
  return (data ?? []).map(r => ({ slug: r.slug as string }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('wissensfundus')
    .select('thema, inhalt')
    .eq('slug', params.slug)
    .eq('published', true)
    .single()

  if (!data) return { title: 'Eintrag nicht gefunden', robots: { index: false } }

  const desc = (data.inhalt as string)
    .split('\n')
    .find(l => l.trim() && !l.trim().startsWith('#'))
    ?.replace(/[#*`]/g, '')
    .slice(0, 158)

  return {
    title: `${data.thema} — finanzteam26`,
    description: desc,
  }
}

export default async function WissenDetailPage({ params }: PageProps) {
  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('wissensfundus')
    .select('*')
    .eq('slug', params.slug)
    .eq('published', true)
    .single()

  if (!row) notFound()

  const linker = await loadLinker({ kategorie: row.kategorie as string })
  const linked = linker.linkify(row.inhalt as string)
  const minutes = readingMinutes(row.inhalt as string)
  const katLabel = KATEGORIE_LABEL[row.kategorie as string] ?? row.kategorie

  // Verwandte Themen aus gleicher Kategorie
  const { data: related } = await supabase
    .from('wissensfundus')
    .select('slug, thema')
    .eq('kategorie', row.kategorie)
    .eq('published', true)
    .neq('slug', params.slug)
    .limit(6)

  // Author + Reviewer auflösen (Wissens-Einträge haben keine Produkt-FK,
  // also greift der explizite autor_id-Wert oder gar nichts).
  const resolved = await resolveAuthor({
    autorId: row.autor_id,
    reviewerId: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    produktId: null,
  })

  // Schema.org Article — mit Person-Author + reviewedBy
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://finanzteam26.de'
  const canonical = `${baseUrl}/wissen/${row.slug}`
  const articleSchema = combineSchemas(
    {
      ...buildArticleSchema({
        headline: row.thema as string,
        description: '',
        datePublished: row.reviewed_at ?? row.updated_at ?? row.created_at,
        dateModified: row.reviewed_at ?? row.updated_at ?? row.created_at,
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
      articleSection: katLabel,
      inLanguage: 'de-DE',
    },
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: articleSchema }}
      />

      {/* ── Hero-Band ─────────────────────────────────────────────────── */}
      <section className="bg-[#1a3252] text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <nav className="text-sm text-white/60 mb-4 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors">Start</Link>
            <span>›</span>
            <Link href="/wissen" className="hover:text-white transition-colors">Wissensbasis</Link>
            <span>›</span>
            <span className="text-white/80">{katLabel}</span>
          </nav>

          <span className="inline-block px-3 py-1 rounded-full bg-[#02a9e6]/20 text-[#7fd0f0] text-xs font-semibold uppercase tracking-wider mb-4">
            {katLabel}
          </span>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
            {row.thema}
          </h1>

          <div className="text-sm text-white/60 flex items-center gap-3">
            <span>{minutes} Min. Lesezeit</span>
            {row.tags && (row.tags as string[]).length > 0 && (
              <>
                <span>·</span>
                <span>{(row.tags as string[]).slice(0, 3).join(', ')}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Inhalt ────────────────────────────────────────────────────── */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        <AuthorByline
          autorId={row.autor_id}
          reviewerId={row.reviewed_by}
          reviewedAt={row.reviewed_at}
          standDate={row.reviewed_at ?? row.updated_at}
          variant="card"
        />
        <div className="prose prose-lg max-w-none text-gray-800">
          {renderMarkdown(linked)}
        </div>

        {row.tags && (row.tags as string[]).length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Tags:</p>
            <div className="flex gap-2 flex-wrap">
              {(row.tags as string[]).map(t => (
                <span key={t} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* ── Verwandte Themen ──────────────────────────────────────────── */}
      {related && related.length > 0 && (
        <section className="bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold text-[#1a3252] mb-6">
              Weitere Themen aus {katLabel}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(r => (
                <li key={r.slug}>
                  <Link
                    href={`/wissen/${r.slug}`}
                    className="block bg-[#f7fafc] border border-gray-200 rounded-md p-4 hover:border-[#02a9e6] hover:shadow-sm transition-all"
                  >
                    <span className="font-semibold text-[#1a3252]">{r.thema}</span>
                    <span className="text-[#02a9e6] ml-2">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}
