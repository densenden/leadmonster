// Public Wissen-Detail — rendert einen Wissensfundus-Eintrag als Markdown.
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

  // Erste Zeile aus dem Inhalt nach Heading als Description nehmen
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

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/wissen" className="text-sm text-[#02a9e6] hover:underline">&larr; Zurück zur Wissensbasis</Link>

      <div className="mt-6 mb-2">
        <span className="text-xs uppercase tracking-wider text-[#02a9e6] font-semibold">{row.kategorie}</span>
      </div>

      <h1 className="text-4xl font-bold text-[#1a365d] mb-6">{row.thema}</h1>

      <article className="prose prose-lg max-w-none text-gray-800">
        {renderMarkdown(linked)}
      </article>

      {row.tags && row.tags.length > 0 && (
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
    </main>
  )
}
