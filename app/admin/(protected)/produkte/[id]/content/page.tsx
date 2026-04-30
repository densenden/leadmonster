// Content management page — Server Component.
// Fetches all generierter_content rows for the given produkt_id and groups them by page_type.
// Renders a collapsible accordion per page type, each containing a ContentPreview editor.
// Ratgeber section includes a GenerateRatgeberButton for creating additional guide articles.
// Auth guard is inherited from app/admin/(protected)/layout.tsx.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'

// Always re-fetch — content list must reflect live DB after generation/edit/delete.
export const dynamic = 'force-dynamic'
import { Badge } from '@/components/ui/Badge'
import { ContentPreview } from '@/components/admin/ContentPreview'
import { GenerateButton } from './_components/GenerateButton'
import { GenerateRatgeberButton } from './_components/generate-ratgeber-button'
import { GenerationLockProvider } from './_components/generation-lock'
import { ResetContentButton } from './_components/ResetContentButton'
import { formatGermanDateTime } from '@/lib/utils/date'
import type { GenerierterContent } from '@/lib/supabase/types'
import type { BadgeVariant } from '@/components/ui/Badge'

interface PageProps {
  params: { id: string }
}

// Canonical display order for page types.
const PAGE_TYPE_ORDER: GenerierterContent['page_type'][] = [
  'hauptseite',
  'faq',
  'vergleich',
  'tarif',
  'ratgeber',
  'impressum',
  'kontakt',
  'datenschutz',
  'agb',
]

// German display labels for page type keys.
const PAGE_TYPE_LABELS: Record<string, string> = {
  hauptseite: 'Hauptseite',
  faq: 'FAQ',
  vergleich: 'Vergleich',
  tarif: 'Tarife',
  ratgeber: 'Ratgeber',
  impressum: 'Impressum',
  kontakt: 'Kontakt',
  datenschutz: 'Datenschutz',
  agb: 'AGB',
}

// Maps content status values to Badge variant names.
const STATUS_BADGE: Record<GenerierterContent['status'], BadgeVariant> = {
  entwurf: 'neutral',
  review: 'info',
  publiziert: 'success',
}

// Status badge colour description for the ratgeber table.
// entwurf = yellow (bg-yellow-100 text-yellow-700)
// review  = blue  (bg-blue-100 text-blue-700)
// publiziert = green (bg-green-100 text-green-700)
const RATGEBER_STATUS_CLASSES: Record<GenerierterContent['status'], string> = {
  entwurf: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  publiziert: 'bg-green-100 text-green-700',
}

export default async function ContentManagementPage({ params }: PageProps) {
  const supabase = createAdminClient()

  // Verify the product exists before fetching its content.
  const { data: produktRow } = await supabase
    .from('produkte')
    .select('id, name')
    .eq('id', params.id)
    .maybeSingle()

  if (!produktRow) {
    notFound()
  }

  // Fetch all generierter_content rows for this product, most recent first.
  const { data: rows } = await supabase
    .from('generierter_content')
    .select('*')
    .eq('produkt_id', params.id)
    .order('generated_at', { ascending: false })

  const contentRows: GenerierterContent[] = rows ?? []

  // Group rows by page_type for accordion rendering.
  const grouped = new Map<GenerierterContent['page_type'], GenerierterContent[]>()
  for (const row of contentRows) {
    const existing = grouped.get(row.page_type) ?? []
    grouped.set(row.page_type, [...existing, row])
  }

  // Determine which page types have content, preserving canonical order.
  const orderedTypes = PAGE_TYPE_ORDER.filter((type) => grouped.has(type))

  // Separate ratgeber rows for the dedicated section below the accordion.
  const ratgeberRows = grouped.get('ratgeber') ?? []

  return (
    <GenerationLockProvider>
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333333]">
            Content: {produktRow.name}
          </h1>
          <p className="mt-1 text-sm text-[#666666]">
            Generierten Content prüfen, bearbeiten und veröffentlichen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/produkte/${params.id}`}
            className="text-sm text-[#666666] hover:underline"
          >
            Zurück zum Produkt
          </Link>
          <ResetContentButton produktId={params.id} />
          <GenerateButton produktId={params.id} />
        </div>
      </div>

      {/* Empty state */}
      {contentRows.length === 0 && (
        <div className="border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-[#666666]">Noch kein Content generiert.</p>
          <p className="mt-1 text-xs text-gray-400">
            Klicken Sie auf &quot;Content generieren&quot;, um alle Seitentypen zu erstellen.
          </p>
          <div className="mt-4 flex justify-center">
            <GenerateButton produktId={params.id} />
          </div>
        </div>
      )}

      {/* Accordion sections grouped by page_type */}
      {orderedTypes.length > 0 && (
        <div className="space-y-4">
          {orderedTypes.map((pageType) => {
            const typeRows = grouped.get(pageType)!
            // Use the most-recent row's status for the accordion summary badge.
            const latestRow = typeRows[0]

            return (
              <details
                key={pageType}
                className="border border-gray-200 bg-white"
              >
                <summary className="flex cursor-pointer items-center gap-3 bg-[#1a365d]/5 px-4 py-3 text-sm font-medium text-[#333333] hover:bg-[#1a365d]/10">
                  <span className="font-heading font-semibold">
                    {PAGE_TYPE_LABELS[pageType]}
                  </span>
                  <Badge variant={STATUS_BADGE[latestRow.status]}>
                    {latestRow.status}
                  </Badge>
                  <span className="ml-auto text-xs text-gray-400">
                    {typeRows.length} {typeRows.length === 1 ? 'Seite' : 'Seiten'}
                  </span>
                </summary>

                <div className="p-4">
                  {typeRows.map((row) => (
                    <div key={row.id} className="mb-6 last:mb-0">
                      {/* Timestamps row */}
                      <div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>
                          Generiert am:{' '}
                          <span className="text-[#666666]">
                            {row.generated_at ? formatGermanDateTime(row.generated_at) : '—'}
                          </span>
                        </span>
                        <span>
                          {row.published_at
                            ? `Veröffentlicht am: ${formatGermanDateTime(row.published_at)}`
                            : 'Noch nicht veröffentlicht'}
                        </span>
                      </div>

                      {/* Interactive editor panel */}
                      <ContentPreview row={row} produktId={params.id} />
                    </div>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}

      {/* ================================================================
          Ratgeber section — dedicated area below the accordion
          Shows all ratgeber rows with status badges and a generate button.
          ================================================================ */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-[#333333]">
            Ratgeber-Artikel
          </h2>
          <span className="text-xs text-gray-400">
            {ratgeberRows.length} {ratgeberRows.length === 1 ? 'Artikel' : 'Artikel'}
          </span>
        </div>

        {/* Ratgeber table — slug, title, status badge, generated_at */}
        {ratgeberRows.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#1a365d]/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#333333] uppercase tracking-wide">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#333333] uppercase tracking-wide">
                    Titel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#333333] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#333333] uppercase tracking-wide">
                    Generiert am
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ratgeberRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-[#666666]">
                      {row.slug ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#333333]">
                      {row.title ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${RATGEBER_STATUS_CLASSES[row.status]}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {row.generated_at ? formatGermanDateTime(row.generated_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 py-10 text-center">
            <p className="text-sm text-[#666666]">Noch keine Ratgeber generiert.</p>
            <p className="mt-1 text-xs text-gray-400">
              Klicken Sie auf &quot;Content generieren&quot; oben oder nutzen Sie den Button unten.
            </p>
          </div>
        )}

        {/* Generate additional ratgeber button */}
        <GenerateRatgeberButton produktId={params.id} />
      </section>
    </div>
    </GenerationLockProvider>
  )
}
