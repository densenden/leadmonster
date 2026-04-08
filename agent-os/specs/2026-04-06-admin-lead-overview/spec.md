# Specification: Admin Lead Overview

## Goal
Provide admins with a paginated, filterable, server-rendered table at `/admin/leads` that displays all leads across all products, with quick access to each lead's Confluence page and a per-row re-sync action for failed Confluence syncs.

## User Stories
- As an admin, I want to see all leads in a sortable, filterable table so that I can monitor incoming interest and follow-up status at a glance.
- As an admin, I want to open the Confluence page for any lead and trigger a re-sync for failed syncs so that I can manage CRM data without leaving the admin area.

## Specific Requirements

**Server-rendered page at `app/admin/leads/page.tsx`**
- Pure React Server Component; no `"use client"` at page level
- Uses `lib/supabase/server.ts` (Service Role client) to fetch data server-side
- Reads filter and pagination params from `searchParams` (`?page`, `?produkt`, `?confluence_synced`, `?intent_tag`)
- Performs a single JOIN query: `leads` LEFT JOIN `produkte` on `leads.produkt_id = produkte.id` to get `produkte.name`
- Selects only required columns: `id`, `vorname`, `nachname`, `email`, `intent_tag`, `confluence_synced`, `confluence_page_id`, `resend_sent`, `created_at`, `produkte.name`
- Sorts by `created_at DESC` by default
- Applies `.range()` for pagination (25 rows per page) and `.eq()` filters when query params are present
- Auth guard is inherited from `app/admin/layout.tsx`; no additional session check needed in this page

**Pagination (URL-based, 25 per page)**
- Page number read from `searchParams.page`, defaults to `1`
- Total count fetched via Supabase `count: 'exact'` option on the same query
- Previous/Next navigation rendered as `<a>` tags with updated `?page=N` href (no client-side JS required)
- Total lead count displayed above the table (e.g., "127 Leads gesamt")
- Current page and total pages shown in pagination controls

**Filter controls in `components/admin/LeadTable.tsx`**
- Three filter controls rendered as a `<form method="get">` so filters work without JS and update the URL naturally
- Product filter: `<select>` populated with all distinct products from a server-fetched `produkte` list
- Confluence sync filter: `<select>` with options: Alle / Ja / Nein (maps to `&confluence_synced=true/false`)
- Intent tag filter: `<select>` with fixed options matching schema values: sicherheit | preis | sofortschutz | Alle
- A "Zurücksetzen" link clears all filters by linking to `/admin/leads`
- Active filter selections preserved as `defaultValue` on each `<select>`

**Table columns in `components/admin/LeadTable.tsx`**
- Name: `vorname + ' ' + nachname` in a single cell
- E-Mail: plain text
- Produkt: `produkte.name` (joined value); fallback to "—" if null
- Intent Tag: displayed as a small pill/badge using `components/ui/Badge.tsx`
- Confluence Sync: boolean badge — green "Ja" / red "Nein" using `components/ui/Badge.tsx`
- Resend Sent: boolean badge — green "Ja" / grey "Nein" using `components/ui/Badge.tsx`
- Zeitstempel: `created_at` formatted as `dd.MM.yyyy HH:mm` (German locale)
- Confluence Link: external link icon shown only when `confluence_page_id` is not null; href constructed as `{CONFLUENCE_BASE_URL}/wiki/spaces/{spaceKey}/pages/{confluence_page_id}`; opens in new tab with `rel="noopener noreferrer"`
- Re-sync action: shown only when `confluence_synced === false`; rendered as a `<form action="/api/confluence" method="POST">` with a hidden `leadId` field and a submit button labelled "Re-sync"

**Re-sync API call via `/api/confluence` route**
- Accepts POST with body `{ leadId: string, action: "resync" }`
- Validates input with zod: `leadId` must be a valid UUID, `action` must equal `"resync"`
- Fetches the lead from Supabase, calls `lib/confluence/client.ts` to re-create/update the page
- On success: sets `confluence_synced = true` in `leads` table and returns `200`
- On failure: returns `500` with structured error body; does not update `confluence_synced`
- Protected: verifies Supabase session via `lib/supabase/server.ts` before processing

**Confluence link construction**
- Base URL read from `einstellungen` table (key `confluence_base_url`) with fallback to `process.env.CONFLUENCE_BASE_URL`
- Link format: `{baseUrl}/wiki/spaces/{spaceKey}/pages/{confluence_page_id}`
- `spaceKey` read from `einstellungen` or `process.env.CONFLUENCE_SPACE_KEY`
- If base URL is not configured, the external link icon is hidden rather than showing a broken link

**Admin access control**
- `app/admin/layout.tsx` handles the Supabase Auth session check and redirects unauthenticated users to `/admin/login`
- `/api/confluence` route independently verifies session using the server Supabase client before any data access

**Empty states**
- When no leads match the current filters, render a centred message: "Keine Leads gefunden."
- "Zurücksetzen" link is prominently shown alongside the empty state message

## Existing Code to Leverage

**`lib/supabase/server.ts` — Supabase server client**
- Already defined as the Service Role client for server-side data access
- Use for all data fetching in `app/admin/leads/page.tsx` and inside `/api/confluence` route
- Do not use the browser client (`lib/supabase/client.ts`) in Server Components or API routes

**`lib/confluence/client.ts` — Confluence page creation**
- Already contains credential lookup logic from `einstellungen` table with `.env` fallback
- The re-sync action calls this same client; no duplicate credential handling needed
- Reuse the existing page creation/update function and pass all required lead fields as arguments

**`components/ui/Badge.tsx` — atomic badge component**
- Planned in the file structure for boolean status display and tag labelling
- Use for `confluence_synced`, `resend_sent` (colour-coded), and `intent_tag` (neutral pill)
- Accept a `variant` prop: `success`, `danger`, `neutral` to drive colour without per-instance Tailwind overrides

**`components/admin/LeadTable.tsx` — admin table component**
- Planned in the file structure as the table component for this view
- Receives pre-fetched lead rows and pagination metadata as props from the Server Component page
- Contains filter `<form>`, table markup, pagination controls, and per-row re-sync `<form>`

**`design-tokens/tokens.json` — design token source of truth**
- Primary `#abd5f4` (Brand Blue), secondary/accent `#ff9651` (Brand Orange), page background `#ffffff`, muted `#f8f8f8`, border divider `#e5e5e5`
- Font families: Nunito Sans (body), Roboto (headings) — applied via Tailwind config extension
- Use token-derived Tailwind classes for table row hover, badge colours, and border styling

## Out of Scope
- Editing or deleting leads from this view
- Bulk re-sync for multiple leads at once
- Sending new Resend emails from the lead table
- Exporting leads to CSV or other formats
- Real-time updates or polling for new leads
- Lead detail page or modal with full lead information
- Full-text search by name or email
- Column sorting by fields other than `created_at`
- Role-based access control beyond the Supabase Auth session check
- Skeleton loaders (Next.js `loading.tsx` can be added as a follow-up)
