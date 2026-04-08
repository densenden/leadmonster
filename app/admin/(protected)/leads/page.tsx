// Admin leads overview — Server Component.
// Auth guard is handled by the parent layout; no additional auth check required here.
// Fetches paginated leads with product join, applies URL-driven filters, and passes
// Confluence config from the einstellungen table to the LeadTable presentational layer.
import { createAdminClient } from '@/lib/supabase/server'
import { LeadTable } from '@/components/admin/LeadTable'

const PAGE_SIZE = 25

interface SearchParams {
  produkt?: string
  confluence_synced?: string
  intent_tag?: string
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

  // Fetch distinct products for the filter select in parallel with the settings query.
  const [{ data: produkte }, { data: einstellungen }] = await Promise.all([
    supabase.from('produkte').select('id,name').order('name', { ascending: true }),
    supabase
      .from('einstellungen')
      .select('schluessel,wert')
      .in('schluessel', ['confluence_base_url', 'confluence_space_key']),
  ])

  // Build Confluence config — DB value takes precedence, env var is fallback.
  const settingsMap = Object.fromEntries(
    (einstellungen ?? []).map((r) => [r.schluessel, r.wert]),
  )
  const confluenceBaseUrl: string | null =
    (settingsMap['confluence_base_url'] ?? process.env.CONFLUENCE_BASE_URL) || null
  const confluenceSpaceKey: string | null =
    (settingsMap['confluence_space_key'] ?? process.env.CONFLUENCE_SPACE_KEY) || null

  // Build the main leads query with optional filters, JOIN to produkte, and exact count.
  let query = supabase
    .from('leads')
    .select(
      'id, vorname, nachname, email, intent_tag, confluence_synced, confluence_page_id, resend_sent, created_at, produkte(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  // Apply filters only when the param is present and non-empty.
  if (searchParams.produkt) {
    query = query.eq('produkt_id', searchParams.produkt)
  }
  if (searchParams.confluence_synced === 'true') {
    query = query.eq('confluence_synced', true)
  } else if (searchParams.confluence_synced === 'false') {
    query = query.eq('confluence_synced', false)
  }
  if (searchParams.intent_tag) {
    query = query.eq('intent_tag', searchParams.intent_tag)
  }

  const { data: leads, count } = await query.range(offset, offset + PAGE_SIZE - 1)

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const currentFilters = {
    produkt: searchParams.produkt,
    confluence_synced: searchParams.confluence_synced,
    intent_tag: searchParams.intent_tag,
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
        confluenceBaseUrl={confluenceBaseUrl}
        confluenceSpaceKey={confluenceSpaceKey}
      />
    </div>
  )
}
