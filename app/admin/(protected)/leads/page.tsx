// Admin leads overview — Server Component.
// Auth guard is handled by the parent layout; no additional auth check required here.
// Fetches paginated leads with product join and applies URL-driven filters.
import { createAdminClient } from '@/lib/supabase/server'
import { LeadTable } from '@/components/admin/LeadTable'

// Always re-fetch — admin views must show fresh data regardless of Vercel cache.
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

interface SearchParams {
  produkt?: string
  convexa_synced?: string
  intent_tag?: string
  von?: string
  bis?: string
  page?: string
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createAdminClient()

  // Resolve current page — default to 1 when absent or non-numeric.
  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  // Fetch distinct products for the filter select.
  const { data: produkte } = await supabase
    .from('produkte')
    .select('id,name')
    .order('name', { ascending: true })

  // Build the main leads query with optional filters, JOIN to produkte, and exact count.
  let query = supabase
    .from('leads')
    .select(
      'id, vorname, nachname, email, intent_tag, convexa_synced, convexa_lead_id, convexa_error, resend_sent, created_at, produkte(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  // Apply filters only when the param is present and non-empty.
  if (searchParams.produkt) {
    query = query.eq('produkt_id', searchParams.produkt)
  }
  if (searchParams.convexa_synced === 'true') {
    query = query.eq('convexa_synced', true)
  } else if (searchParams.convexa_synced === 'false') {
    query = query.eq('convexa_synced', false)
  }
  if (searchParams.intent_tag) {
    query = query.eq('intent_tag', searchParams.intent_tag)
  }
  if (searchParams.von) {
    query = query.gte('created_at', `${searchParams.von}T00:00:00.000Z`)
  }
  if (searchParams.bis) {
    query = query.lte('created_at', `${searchParams.bis}T23:59:59.999Z`)
  }

  const { data: leads, count, error: leadsError } = await query.range(
    offset,
    offset + PAGE_SIZE - 1,
  )

  if (leadsError) {
    console.error('[admin/leads] Query failed:', leadsError)
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="font-heading text-3xl text-[#333333]">Leads</h1>
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-medium">Leads konnten nicht geladen werden.</p>
          <p className="mt-1">
            {leadsError.message || 'Unbekannter Datenbankfehler.'} Prüfen Sie{' '}
            <code className="text-xs">SUPABASE_SECRET_KEY</code> in den Vercel-Umgebungsvariablen.
          </p>
        </div>
      </div>
    )
  }

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const currentFilters = {
    produkt: searchParams.produkt,
    convexa_synced: searchParams.convexa_synced,
    intent_tag: searchParams.intent_tag,
    von: searchParams.von,
    bis: searchParams.bis,
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="font-heading text-3xl text-[#333333]">Leads</h1>
        <p className="mt-1 text-sm text-[#666666]">{totalCount} Leads gesamt</p>
      </div>

      <LeadTable
        leads={(leads ?? []) as Parameters<typeof LeadTable>[0]['leads']}
        produkte={produkte ?? []}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        currentFilters={currentFilters}
      />
    </div>
  )
}
