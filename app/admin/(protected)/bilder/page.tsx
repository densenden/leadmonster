// Bilder-Bibliothek — Server Component.
// Lists all generated images grouped by produkt with thumbnails, prompt and metadata.
// Filter via URL params: ?produkt_id=…&slot=…&page_type=…
// Auth guard inherited from app/admin/(protected)/layout.tsx.
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/server'
import { formatGermanDateTime } from '@/lib/utils/date'
import { BildDeleteButton } from './_components/BildDeleteButton'
import { BildFilterBar } from './_components/BildFilterBar'

export const dynamic = 'force-dynamic'

interface BildRow {
  id: string
  produkt_id: string | null
  blog_post_id: string | null
  page_type: string | null
  slot: string | null
  url: string
  alt_text: string
  prompt_used: string | null
  provider: string
  width: number | null
  height: number | null
  created_at: string
  produkt_name?: string | null
  produkt_slug?: string | null
}

const SLOT_LABELS: Record<string, string> = {
  hero: 'Hero',
  feature: 'Feature',
  inline: 'Inline',
  og: 'Open Graph',
  blog_cover: 'Blog Cover',
}

interface PageProps {
  searchParams: { produkt_id?: string; slot?: string; page_type?: string }
}

export default async function BilderPage({ searchParams }: PageProps) {
  const supabase = createAdminClient()

  // Load all products for filter dropdown.
  const { data: produkteRows } = await supabase
    .from('produkte')
    .select('id, name, slug')
    .order('name', { ascending: true })

  let query = supabase
    .from('bilder')
    .select('id, produkt_id, blog_post_id, page_type, slot, url, alt_text, prompt_used, provider, width, height, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  if (searchParams.produkt_id) query = query.eq('produkt_id', searchParams.produkt_id)
  if (searchParams.slot) query = query.eq('slot', searchParams.slot)
  if (searchParams.page_type) query = query.eq('page_type', searchParams.page_type)

  const { data: bilderRaw } = await query

  // Resolve produkt names for display.
  const produkteIndex = new Map<string, { name: string; slug: string | null }>()
  for (const p of produkteRows ?? []) {
    produkteIndex.set(p.id, { name: p.name, slug: p.slug })
  }

  const bilder: BildRow[] = (bilderRaw ?? []).map(b => {
    const produkt = b.produkt_id ? produkteIndex.get(b.produkt_id) : null
    return {
      ...b,
      produkt_name: produkt?.name ?? null,
      produkt_slug: produkt?.slug ?? null,
    }
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-[#333333]">Bilder</h1>
        <p className="mt-1 text-sm text-[#666666]">
          KI-generierte Bilder (OpenAI gpt-image-1) für Produktseiten und Blog. {bilder.length} Bild
          {bilder.length === 1 ? '' : 'er'}.
        </p>
      </div>

      <BildFilterBar
        produkte={(produkteRows ?? []).map(p => ({ id: p.id, name: p.name }))}
        currentProduktId={searchParams.produkt_id}
        currentSlot={searchParams.slot}
        currentPageType={searchParams.page_type}
      />

      {bilder.length === 0 && (
        <div className="border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-[#666666]">
            Keine Bilder gefunden. Generiere welche im Content-Editor oder im Produkt-Bereich.
          </p>
        </div>
      )}

      {bilder.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bilder.map(b => (
            <article key={b.id} className="border border-gray-200 bg-white">
              <div className="relative aspect-video bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.url}
                  alt={b.alt_text}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  {b.slot && (
                    <span className="bg-[#1a3252]/10 text-[#1a3252] px-2 py-0.5 rounded">
                      {SLOT_LABELS[b.slot] ?? b.slot}
                    </span>
                  )}
                  {b.page_type && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {b.page_type}
                    </span>
                  )}
                  <span className="text-gray-400">{b.width}×{b.height}</span>
                </div>

                <p className="text-sm font-medium text-[#333333] line-clamp-2" title={b.alt_text}>
                  {b.alt_text}
                </p>

                {b.produkt_name && (
                  <p className="text-xs text-[#666666]">
                    Produkt:{' '}
                    {b.produkt_slug ? (
                      <Link href={`/admin/produkte`} className="text-[#1a3252] hover:underline">
                        {b.produkt_name}
                      </Link>
                    ) : (
                      b.produkt_name
                    )}
                  </p>
                )}

                {b.prompt_used && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-[#666666] hover:text-[#1a3252]">
                      Prompt anzeigen
                    </summary>
                    <p className="mt-1 text-[11px] text-gray-500 whitespace-pre-wrap">
                      {b.prompt_used}
                    </p>
                  </details>
                )}

                <p className="text-[11px] text-gray-400">
                  {formatGermanDateTime(b.created_at)} · {b.provider}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#02a9e6] hover:underline"
                  >
                    Original ↗
                  </a>
                  <BildDeleteButton id={b.id} altText={b.alt_text} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

// Placeholder reference to keep next/image import — used elsewhere if expanded.
void Image
