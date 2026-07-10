// Product list page — Server Component.
// Card-Layout mit Hero-Thumbnail, Inline-Status-Toggle und Quick-Stats
// (Anzahl Anbieter-Tarife, Anzahl Ratgeber, Style-Reference, Hero-Bild).
// Auth guard is inherited from app/admin/(protected)/layout.tsx.
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

// Always re-fetch — admin product list must reflect live DB after CRUD ops.
export const dynamic = 'force-dynamic'

import { ProduktArchiveActions } from './_components/ProduktArchiveActions'
import { ProduktStatusToggle } from './_components/ProduktStatusToggle'
import type { Produkt, ProduktStatus } from '@/lib/supabase/types'

// German display labels for product types.
const TYP_LABELS: Record<string, string> = {
  sterbegeld: 'Sterbegeld',
  pflege: 'Pflege',
  leben: 'Leben',
  unfall: 'Unfall',
  bu: 'Berufsunfähigkeit',
}

// Colored top-bar accent per produkttyp (fallback grey).
const TYP_ACCENT: Record<string, string> = {
  sterbegeld: '#1a3252',
  pflege: '#f59e0b',
  leben: '#d4af37',
  unfall: '#02a9e6',
  bu: '#1a365d',
}

interface ProduktWithStats extends Produkt {
  anbieterCount: number
  ratgeberCount: number
  publishedRatgeberCount: number
  hasStyleReference: boolean
  hasHeroImage: boolean
  /** Anzahl Leads in der DB für dieses Produkt (über alle Zeit). */
  leadsCount: number
  /** ISO-Timestamp des jüngsten Leads, oder null wenn keine Leads. */
  leadsLatestAt: string | null
}

async function loadProdukteWithStats(): Promise<ProduktWithStats[]> {
  const supabase = createAdminClient()

  // Produkte mit allen relevanten Feldern laden.
  const { data: rows, error: produkteErr } = await supabase
    .from('produkte')
    .select(
      'id, slug, name, typ, status, accent_color, hero_image_url, hero_image_alt, style_reference_url, style_description, created_at, updated_at',
    )
    .order('created_at', { ascending: false })

  if (produkteErr) {
    console.error('[admin/produkte] DB-Fehler beim Laden:', produkteErr.message)
    return []
  }

  const produkte = (rows ?? []) as Produkt[]
  if (produkte.length === 0) return []

  const ids = produkte.map(p => p.id)

  // Aggregations parallel — distinkte Anbieter pro Produkt + Ratgeber-Counts
  // + Lead-Counts. Kein separater Endpoint, kein Index nötig (`leads.produkt_id`
  // hat schon einen FK).
  const [tarifeResult, ratgeberResult, leadsResult] = await Promise.all([
    supabase
      .from('tarife')
      .select('produkt_id, anbieter_name')
      .in('produkt_id', ids)
      .not('anbieter_name', 'is', null),
    supabase
      .from('generierter_content')
      .select('produkt_id, status')
      .in('produkt_id', ids)
      .eq('page_type', 'ratgeber'),
    supabase
      .from('leads')
      .select('produkt_id, created_at')
      .in('produkt_id', ids)
      .order('created_at', { ascending: false }),
  ])

  const anbieterByProdukt = new Map<string, Set<string>>()
  for (const row of tarifeResult.data ?? []) {
    const r = row as { produkt_id: string; anbieter_name: string | null }
    if (!r.anbieter_name) continue
    const set = anbieterByProdukt.get(r.produkt_id) ?? new Set<string>()
    set.add(r.anbieter_name)
    anbieterByProdukt.set(r.produkt_id, set)
  }

  const ratgeberByProdukt = new Map<string, { total: number; published: number }>()
  for (const row of ratgeberResult.data ?? []) {
    const r = row as { produkt_id: string; status: string }
    const cur = ratgeberByProdukt.get(r.produkt_id) ?? { total: 0, published: 0 }
    cur.total++
    if (r.status === 'publiziert') cur.published++
    ratgeberByProdukt.set(r.produkt_id, cur)
  }

  // Leads — durch das DESC-Order-Statement oben ist der erste Treffer pro
  // Produkt bereits der jüngste; danach nur noch zählen.
  const leadsByProdukt = new Map<string, { count: number; latestAt: string | null }>()
  for (const row of leadsResult.data ?? []) {
    const r = row as { produkt_id: string | null; created_at: string }
    if (!r.produkt_id) continue
    const cur = leadsByProdukt.get(r.produkt_id) ?? { count: 0, latestAt: null }
    cur.count++
    if (cur.latestAt === null) cur.latestAt = r.created_at
    leadsByProdukt.set(r.produkt_id, cur)
  }

  return produkte.map(p => ({
    ...p,
    anbieterCount: anbieterByProdukt.get(p.id)?.size ?? 0,
    ratgeberCount: ratgeberByProdukt.get(p.id)?.total ?? 0,
    publishedRatgeberCount: ratgeberByProdukt.get(p.id)?.published ?? 0,
    hasStyleReference: Boolean((p as { style_reference_url?: string | null }).style_reference_url),
    hasHeroImage: Boolean(p.hero_image_url),
    leadsCount: leadsByProdukt.get(p.id)?.count ?? 0,
    leadsLatestAt: leadsByProdukt.get(p.id)?.latestAt ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Kompakte deutsche Relativ-Zeit ("vor 3 Std.", "gestern", "vor 5 Tagen"). */
function relativeTimeDe(iso: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const deltaSec = Math.max(0, (Date.now() - then) / 1000)
  if (deltaSec < 60) return 'gerade eben'
  if (deltaSec < 3600) return `vor ${Math.floor(deltaSec / 60)} Min.`
  if (deltaSec < 86400) return `vor ${Math.floor(deltaSec / 3600)} Std.`
  if (deltaSec < 86400 * 2) return 'gestern'
  if (deltaSec < 86400 * 30) return `vor ${Math.floor(deltaSec / 86400)} Tagen`
  if (deltaSec < 86400 * 365) return `vor ${Math.floor(deltaSec / (86400 * 30))} Monaten`
  return `vor ${Math.floor(deltaSec / (86400 * 365))} Jahren`
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export default async function ProdukteListPage() {
  const produkte = await loadProdukteWithStats()

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Page header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333333]">Produkte</h1>
          <p className="mt-1 text-sm text-[#666666]">
            Versicherungsprodukte verwalten — Status, Content und Bilder.
          </p>
        </div>
        <Link
          href="/admin/produkte/neu"
          className="bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-md inline-flex items-center gap-2"
        >
          <span aria-hidden="true">＋</span>
          Neues Produkt
        </Link>
      </div>

      {/* Empty state */}
      {produkte.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-md py-16 text-center">
          <p className="text-sm text-[#666666]">
            Noch keine Produkte angelegt. Erstellen Sie Ihr erstes Produkt.
          </p>
          <Link
            href="/admin/produkte/neu"
            className="mt-3 inline-block text-sm text-[#1a365d] hover:underline"
          >
            Jetzt erstes Produkt anlegen
          </Link>
        </div>
      )}

      {/* Card grid */}
      {produkte.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {produkte.map(p => (
            <ProduktCard key={p.id} produkt={p} />
          ))}

          {/* Add-new card to keep entry-point inline */}
          <Link
            href="/admin/produkte/neu"
            className="group flex flex-col items-center justify-center bg-white border-[1.5px] border-dashed border-[#cbd5e0] rounded-lg hover:border-[#02a9e6] hover:bg-[#e1f0fb] transition-all duration-200 p-6 min-h-[280px]"
          >
            <div className="w-10 h-10 rounded-full border-[1.5px] border-[#cbd5e0] group-hover:border-[#02a9e6] flex items-center justify-center mb-3 transition-colors">
              <span className="text-xl text-[#a0aec0] group-hover:text-[#02a9e6] leading-none transition-colors">
                +
              </span>
            </div>
            <span className="text-sm font-semibold text-[#718096] group-hover:text-[#02a9e6] transition-colors">
              Neues Produkt
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function ProduktCard({ produkt }: { produkt: ProduktWithStats }) {
  const accent =
    produkt.accent_color ?? TYP_ACCENT[produkt.typ] ?? '#666666'
  const isArchived = produkt.status === 'archiviert'

  return (
    <article
      className={[
        'group bg-white border border-[#e2e8f0] rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-all',
        isArchived ? 'opacity-60 grayscale-[40%] hover:opacity-90 hover:grayscale-0' : '',
      ].join(' ')}
    >
      {/* Hero-Thumbnail oder Accent-Streifen als Fallback */}
      {produkt.hero_image_url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={produkt.hero_image_url}
            alt={produkt.hero_image_alt ?? produkt.name}
            className="w-full h-32 object-cover"
          />
          {isArchived && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="text-white text-xs font-bold uppercase tracking-widest bg-black/50 px-3 py-1 rounded">
                Archiviert
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full h-2"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Typ-Eyebrow + Name + Slug */}
        <div className="mb-3">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent }}>
            {TYP_LABELS[produkt.typ] ?? produkt.typ}
          </span>
          <h2 className="font-bold text-[#1a3252] text-lg leading-tight mt-1 break-words">
            {produkt.name}
          </h2>
          <p className="text-xs text-[#718096] font-mono mt-0.5 truncate">
            /{produkt.slug}
          </p>
        </div>

        {/* Inline-Status-Toggle */}
        <div className="mb-4">
          <ProduktStatusToggle
            produktId={produkt.id}
            produktName={produkt.name}
            initialStatus={produkt.status as ProduktStatus}
          />
        </div>

        {/* Quick-Stats — Leads zuerst (Conversion-Metrik), dann Setup-Pillen. */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <StatPill
            label="Leads"
            value={produkt.leadsCount}
            ok={produkt.leadsCount > 0}
            okLabel={
              produkt.leadsLatestAt
                ? `Letzter: ${relativeTimeDe(produkt.leadsLatestAt)}`
                : 'Letzter: —'
            }
            tone="conversion"
          />
          <StatPill
            label="Anbieter"
            value={produkt.anbieterCount}
            ok={produkt.anbieterCount >= 2}
            okLabel="≥ 2"
          />
          <StatPill
            label="Ratgeber"
            value={`${produkt.publishedRatgeberCount}/${produkt.ratgeberCount}`}
            ok={produkt.publishedRatgeberCount > 0}
            okLabel="publiziert"
          />
          <StatPill
            label="Hero-Bild"
            value={produkt.hasHeroImage ? '✓' : '—'}
            ok={produkt.hasHeroImage}
            okLabel="gesetzt"
          />
          <StatPill
            label="Stil-Referenz"
            value={produkt.hasStyleReference ? '✓' : '—'}
            ok={produkt.hasStyleReference}
            okLabel="gesetzt"
          />
        </div>

        {/* Aktionen */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/produkte/${produkt.id}`}
            className="text-xs font-semibold text-[#1a3252] hover:text-[#02a9e6] hover:underline"
            title="Stammdaten + Hero-Bild + Stil-Referenz"
          >
            Bearbeiten
          </Link>
          <span className="text-gray-300">·</span>
          <Link
            href={`/admin/produkte/${produkt.id}/content`}
            className="text-xs font-semibold text-[#1a3252] hover:text-[#02a9e6] hover:underline"
            title="Hauptseite, FAQ, Vergleich, Tarife, Ratgeber-Artikel"
          >
            Content
          </Link>
          {produkt.slug && produkt.status === 'aktiv' && (
            <>
              <span className="text-gray-300">·</span>
              <Link
                href={`/${produkt.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#02a9e6] hover:underline"
                title={`Live: /${produkt.slug}`}
              >
                Live ↗
              </Link>
            </>
          )}
          <span className="ml-auto">
            <ProduktArchiveActions
              id={produkt.id}
              name={produkt.name}
              status={produkt.status as ProduktStatus}
            />
          </span>
        </div>
      </div>
    </article>
  )
}

function StatPill({
  label,
  value,
  ok,
  okLabel,
  tone = 'setup',
}: {
  label: string
  value: string | number
  ok: boolean
  okLabel: string
  /** "setup" = grün/grau (Häkchen-Pillen), "conversion" = blau (Leads o. ä.) */
  tone?: 'setup' | 'conversion'
}) {
  const okClasses =
    tone === 'conversion'
      ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'bg-green-50 border-green-200 text-green-800'
  return (
    <div
      className={[
        'flex items-center justify-between px-2.5 py-1.5 rounded border',
        ok ? okClasses : 'bg-gray-50 border-gray-200 text-gray-500',
      ].join(' ')}
      title={ok ? okLabel : `${label}: noch nicht gesetzt`}
    >
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
