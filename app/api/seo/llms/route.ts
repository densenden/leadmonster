// POST /api/seo/llms — regenerates public/llms.txt from current published product data.
// Protected by an x-internal-secret header validated against INTERNAL_SECRET env var.
//
// NOTE: On Vercel production, the file system is ephemeral and read-only outside /tmp.
// This route is intended to be called during post-deploy hooks or build steps.
// The committed static public/llms.txt is the permanent fallback for production deployments.
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildCanonicalUrl } from '@/lib/seo/metadata'

// Shape of a published product row returned from Supabase.
interface ProduktRow {
  id: string
  slug: string
  name: string
}

// Shape of a published generierter_content row for a given product.
interface ContentRow {
  slug: string | null
  page_type: string
  meta_desc: string | null
}

// Build the full llms.txt content string from published products.
function buildLlmsContent(
  produkte: ProduktRow[],
  contentByProdukt: Map<string, ContentRow[]>,
): string {
  const lines: string[] = [
    '# LeadMonster',
    '',
    'LeadMonster ist ein KI-gestütztes Vertriebs-Content-System für Versicherungsprodukte. Das System generiert automatisch SEO- und AEO-optimierte Produktwebsites mit Landingpages, FAQs und Leadformularen.',
    '',
    '## Produkte',
    '',
  ]

  for (const produkt of produkte) {
    const canonicalUrl = buildCanonicalUrl(`/${produkt.slug}`)
    const contentRows = contentByProdukt.get(produkt.id) ?? []
    const hauptseitenContent = contentRows.find((c) => c.page_type === 'hauptseite')
    const description =
      hauptseitenContent?.meta_desc ??
      `${produkt.name} — Jetzt Angebot anfordern.`

    const ratgeberRows = contentRows.filter((c) => c.page_type === 'ratgeber' && c.slug)

    lines.push(`### ${produkt.name}`)
    lines.push('')
    lines.push(`- URL: ${canonicalUrl}`)
    lines.push(`- Beschreibung: ${description}`)
    lines.push('- Verfügbare Seiten:')
    lines.push(`  - Hauptseite: /${produkt.slug}`)
    lines.push(`  - FAQ: /${produkt.slug}/faq`)
    lines.push(`  - Vergleich: /${produkt.slug}/vergleich`)
    lines.push(`  - Tarife: /${produkt.slug}/tarife`)
    lines.push(`  - Ratgeber: /${produkt.slug}/ratgeber`)

    for (const r of ratgeberRows) {
      lines.push(`    - /${produkt.slug}/ratgeber/${r.slug}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

export async function POST(request: Request) {
  // Validate the shared internal secret before doing any work.
  const secret = request.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ updated: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Fetch all published products.
  const { data: produkte, error: produktError } = await supabase
    .from('produkte')
    .select('id, slug, name')
    .eq('status', 'publiziert')

  if (produktError) {
    console.error('llms.txt update: failed to fetch produkte:', produktError.message)
    return NextResponse.json(
      { updated: false, error: produktError.message },
      { status: 500 },
    )
  }

  const produktList = (produkte ?? []) as ProduktRow[]

  // Fetch published content for all products in a single query.
  const contentByProdukt = new Map<string, ContentRow[]>()

  if (produktList.length > 0) {
    const produktIds = produktList.map((p) => p.id)
    const { data: contentRows, error: contentError } = await supabase
      .from('generierter_content')
      .select('slug, page_type, meta_desc, produkt_id')
      .in('produkt_id', produktIds)
      .eq('status', 'publiziert')

    if (contentError) {
      // Non-fatal — proceed with products only.
      console.warn('llms.txt update: failed to fetch content rows:', contentError.message)
    }

    for (const row of contentRows ?? []) {
      const r = row as ContentRow & { produkt_id: string }
      const existing = contentByProdukt.get(r.produkt_id) ?? []
      existing.push(row as ContentRow)
      contentByProdukt.set(r.produkt_id, existing)
    }
  }

  const content = buildLlmsContent(produktList, contentByProdukt)

  // Write to public/llms.txt from the project root.
  const outputPath = join(process.cwd(), 'public', 'llms.txt')
  try {
    await writeFile(outputPath, content, 'utf8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('llms.txt update: file write failed:', message)
    return NextResponse.json({ updated: false, error: message }, { status: 500 })
  }

  return NextResponse.json({ updated: true, productCount: produktList.length })
}
