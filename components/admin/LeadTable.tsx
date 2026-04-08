// Admin Lead overview table — Server Component.
// Renders the filter form, paginated leads table, and empty state.
// All interactions (filter, pagination, re-sync) work without client-side JavaScript:
//   - Filter form uses GET navigation.
//   - Pagination uses plain <a> links.
//   - Re-sync uses native HTML form POST.
import { Badge } from '@/components/ui/Badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadRow {
  id: string
  vorname: string | null
  nachname: string | null
  email: string
  intent_tag: string | null
  confluence_synced: boolean
  confluence_page_id: string | null
  resend_sent: boolean
  created_at: string
  produkte: { name: string } | null
}

interface LeadTableProps {
  leads: LeadRow[]
  produkte: Array<{ id: string; name: string }>
  currentPage: number
  totalPages: number
  totalCount: number
  currentFilters: {
    produkt?: string
    confluence_synced?: string
    intent_tag?: string
  }
  confluenceBaseUrl: string | null
  confluenceSpaceKey: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Formats an ISO timestamp as "DD.MM.YYYY HH:mm" using the German locale.
// Uses Intl.DateTimeFormat — no date library required.
function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

// Builds a URL query string from an object, omitting empty/undefined values.
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '',
  ) as Array<[string, string | number]>
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadTable({
  leads,
  produkte,
  currentPage,
  totalPages,
  currentFilters,
  confluenceBaseUrl,
  confluenceSpaceKey,
}: LeadTableProps) {
  // Build query string for pagination — preserves active filters.
  const filterParams = {
    produkt: currentFilters.produkt,
    confluence_synced: currentFilters.confluence_synced,
    intent_tag: currentFilters.intent_tag,
  }

  const prevQuery = buildQueryString({ ...filterParams, page: currentPage - 1 })
  const nextQuery = buildQueryString({ ...filterParams, page: currentPage + 1 })

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Filter Form                                                          */}
      {/* ------------------------------------------------------------------ */}
      <form method="get" action="/admin/leads" className="flex flex-wrap items-end gap-3">
        {/* Product filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-produkt" className="text-xs font-medium text-[#666666]">
            Produkt
          </label>
          <select
            id="filter-produkt"
            name="produkt"
            defaultValue={currentFilters.produkt ?? ''}
            className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#abd5f4]"
          >
            <option value="">Alle Produkte</option>
            {produkte.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Confluence sync filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-sync" className="text-xs font-medium text-[#666666]">
            Confluence Sync
          </label>
          <select
            id="filter-sync"
            name="confluence_synced"
            defaultValue={currentFilters.confluence_synced ?? ''}
            className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#abd5f4]"
          >
            <option value="">Alle</option>
            <option value="true">Ja</option>
            <option value="false">Nein</option>
          </select>
        </div>

        {/* Intent tag filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-intent" className="text-xs font-medium text-[#666666]">
            Intent
          </label>
          <select
            id="filter-intent"
            name="intent_tag"
            defaultValue={currentFilters.intent_tag ?? ''}
            className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white text-[#333333] focus:outline-none focus:ring-1 focus:ring-[#abd5f4]"
          >
            <option value="">Alle</option>
            <option value="sicherheit">Sicherheit</option>
            <option value="preis">Preis</option>
            <option value="sofortschutz">Sofortschutz</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-1.5 rounded-md bg-[#1a365d] text-white text-sm font-medium hover:bg-[#1a365d]/90 transition-colors"
        >
          Filtern
        </button>

        <a
          href="/admin/leads"
          className="px-4 py-1.5 rounded-md border border-gray-200 text-sm text-[#666666] hover:bg-gray-50 transition-colors"
        >
          Zurücksetzen
        </a>
      </form>

      {/* ------------------------------------------------------------------ */}
      {/* Empty State                                                          */}
      {/* ------------------------------------------------------------------ */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-[#666666]">Keine Leads gefunden.</p>
          <a
            href="/admin/leads"
            className="mt-4 text-sm text-blue-500 hover:text-blue-700 underline underline-offset-2"
          >
            Filter zurücksetzen
          </a>
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------------- */}
          {/* Leads Table                                                      */}
          {/* -------------------------------------------------------------- */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Name',
                    'E-Mail',
                    'Produkt',
                    'Intent',
                    'Confluence Sync',
                    'Resend',
                    'Zeitstempel',
                    'Confluence Link',
                    'Aktion',
                  ].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-[#333333] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-blue-50 transition-colors duration-150"
                  >
                    {/* Name */}
                    <td className="px-4 py-3 whitespace-nowrap text-[#333333]">
                      {[lead.vorname, lead.nachname].filter(Boolean).join(' ') || '—'}
                    </td>

                    {/* E-Mail */}
                    <td className="px-4 py-3 text-[#333333]">{lead.email}</td>

                    {/* Produkt */}
                    <td className="px-4 py-3 whitespace-nowrap text-[#666666]">
                      {lead.produkte?.name ?? '—'}
                    </td>

                    {/* Intent Tag */}
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{lead.intent_tag ?? '—'}</Badge>
                    </td>

                    {/* Confluence Sync */}
                    <td className="px-4 py-3">
                      <Badge variant={lead.confluence_synced ? 'success' : 'danger'}>
                        {lead.confluence_synced ? 'Ja' : 'Nein'}
                      </Badge>
                    </td>

                    {/* Resend Sent */}
                    <td className="px-4 py-3">
                      <Badge variant={lead.resend_sent ? 'success' : 'neutral'}>
                        {lead.resend_sent ? 'Ja' : 'Nein'}
                      </Badge>
                    </td>

                    {/* Zeitstempel */}
                    <td className="px-4 py-3 whitespace-nowrap text-[#666666]">
                      {formatTimestamp(lead.created_at)}
                    </td>

                    {/* Confluence Link */}
                    <td className="px-4 py-3">
                      {lead.confluence_page_id !== null && confluenceBaseUrl !== null ? (
                        <a
                          href={`${confluenceBaseUrl}/wiki/spaces/${confluenceSpaceKey}/pages/${lead.confluence_page_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs"
                          aria-label="In Confluence öffnen"
                        >
                          {/* External link icon — inline SVG, no additional dependencies */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          Öffnen
                        </a>
                      ) : null}
                    </td>

                    {/* Aktion — re-sync form, only for unsynced leads */}
                    <td className="px-4 py-3">
                      {lead.confluence_synced === false ? (
                        <form action="/api/confluence" method="POST">
                          <input type="hidden" name="leadId" value={lead.id} />
                          <input type="hidden" name="action" value="resync" />
                          <button
                            type="submit"
                            className="px-2 py-1 rounded border border-gray-200 text-xs text-[#666666] hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          >
                            Re-sync
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Pagination                                                       */}
          {/* -------------------------------------------------------------- */}
          {totalPages > 1 && (
            <nav
              aria-label="Seitennavigation"
              className="flex items-center justify-between border-t border-gray-200 pt-4"
            >
              <div>
                {currentPage > 1 ? (
                  <a
                    href={`/admin/leads${prevQuery}`}
                    className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-[#333333] hover:bg-[#abd5f4]/20 transition-colors"
                  >
                    Zurück
                  </a>
                ) : null}
              </div>

              <span className="text-sm text-[#666666]">
                Seite {currentPage} von {totalPages}
              </span>

              <div>
                {currentPage < totalPages ? (
                  <a
                    href={`/admin/leads${nextQuery}`}
                    className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-[#333333] hover:bg-[#abd5f4]/20 transition-colors"
                  >
                    Weiter
                  </a>
                ) : null}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
