// Howto-Markdown-Viewer im Admin. Liest docs/howto/<slug>.md vom Filesystem
// und rendert via renderMarkdown. Auf Server-Komponenten beschränkt — kein
// Filesystem-Access im Client. Whitelist gegen Directory-Traversal.
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { readFileSync } from 'fs'
import { join } from 'path'
import { renderMarkdown } from '@/lib/markdown/render'

export const dynamic = 'force-dynamic'

const ALLOWED_SLUGS = new Set([
  'neues-produkt-anlegen',
  'tarife-importieren-csv',
  'convexa-token-setzen',
  'content-generieren',
  'bildstil-konfigurieren',
  'leads-bearbeiten',
  'bu-vergleichsrechner-howto',
])

interface PageProps {
  params: { slug: string }
}

export default function HowtoPage({ params }: PageProps) {
  if (!ALLOWED_SLUGS.has(params.slug)) {
    notFound()
  }

  let content: string
  try {
    const path = join(process.cwd(), 'docs', 'howto', `${params.slug}.md`)
    content = readFileSync(path, 'utf-8')
  } catch {
    notFound()
  }

  return (
    <main className="max-w-3xl">
      <nav className="text-sm text-[#666] mb-6">
        <Link href="/admin/onboarding" className="hover:text-[#1a3252] hover:underline">
          ← Erste Schritte
        </Link>
      </nav>

      <article className="prose prose-sm max-w-none">
        {renderMarkdown(content)}
      </article>
    </main>
  )
}
