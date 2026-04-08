# Task Breakdown: Admin Lead Overview

## Overview
Total Tasks: 4 task groups, 26 sub-tasks

## Task List

---

### Shared UI Primitives

#### Task Group 1: Badge Component
**Dependencies:** None

- [x] 1.0 Build and verify `components/ui/Badge.tsx`
  - [x] 1.1 Write 2-4 focused tests for the Badge component
    - Test that `variant="success"` renders with a green colour class
    - Test that `variant="danger"` renders with a red colour class
    - Test that `variant="neutral"` renders with a grey/muted colour class
    - Test that the `children` content appears in the rendered output
    - Use Vitest + React Testing Library; mock nothing (pure render test)
  - [x] 1.2 Create `components/ui/Badge.tsx`
    - Props interface: `{ children: React.ReactNode; variant: 'success' | 'danger' | 'neutral' }`
    - `success` variant: green background using design-token-derived Tailwind class (e.g., `bg-green-100 text-green-800`)
    - `danger` variant: red background (e.g., `bg-red-100 text-red-800`)
    - `neutral` variant: muted background matching `#f8f8f8` token (e.g., `bg-gray-100 text-gray-700`)
    - Render as a `<span>` with `rounded-full px-2 py-0.5 text-xs font-medium`
    - Add a JSDoc comment explaining the `variant` prop and its colour mapping
    - No `"use client"` directive — pure presentational, works in Server and Client Components
  - [x] 1.3 Ensure Badge tests pass
    - Run only the 2-4 tests written in 1.1
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- All Badge variant tests pass
- Component renders correctly in all three variants with no Tailwind class collisions
- Props are fully typed with TypeScript strict mode; no `any` types

---

### API Layer

#### Task Group 2: Re-sync API Route
**Dependencies:** Task Group 1 (Badge is independent, but this establishes the data contract used by the table in Task Group 3)

- [x] 2.0 Build and verify `/api/confluence` POST route
  - [x] 2.1 Write 3-5 focused tests for the re-sync route
    - Test that a valid POST body `{ leadId: "<valid-uuid>", action: "resync" }` returns `200` on successful sync
    - Test that a body with an invalid UUID returns `400` with a structured error response
    - Test that a body with `action` set to anything other than `"resync"` returns `400`
    - Test that an unauthenticated request (no Supabase session) returns `401`
    - Test that a Confluence client failure returns `500` without setting `confluence_synced = true`
    - Mock: Supabase server client, `lib/confluence/client.ts`
  - [x] 2.2 Create `app/api/confluence/route.ts`
    - Export only a `POST` handler; reject other methods with `405`
    - Verify Supabase Auth session at the top using `lib/supabase/server.ts` — return `401` immediately if no session
    - Parse and validate the request body with a zod schema:
      ```ts
      z.object({ leadId: z.string().uuid(), action: z.literal('resync') })
      ```
    - On validation failure, return `400` with the structured error format from `agent-os/standards/backend/api.md`:
      ```json
      { "data": null, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
      ```
    - Fetch the full lead row from `leads` table via `lib/supabase/server.ts` using `leadId`
    - Call `lib/confluence/client.ts` with the lead fields; the client already handles credential lookup from `einstellungen` with `.env` fallback — do not duplicate that logic
    - On Confluence success: `UPDATE leads SET confluence_synced = true WHERE id = leadId`; return `200` with `{ "data": { "synced": true }, "error": null }`
    - On Confluence failure: do not update `confluence_synced`; return `500` with structured error body; log the error server-side without exposing internal details in the response
  - [x] 2.3 Ensure re-sync route tests pass
    - Run only the 3-5 tests written in 2.1
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- Route rejects unauthenticated requests with `401`
- Invalid input returns `400` with zod-derived error details
- Successful re-sync sets `confluence_synced = true` and returns `200`
- Confluence failures return `500` without corrupting the `confluence_synced` flag
- No secrets or internal stack traces exposed in error responses

---

### Server Component Page

#### Task Group 3: `app/admin/leads/page.tsx`
**Dependencies:** Task Group 2 (route must exist before the page submits re-sync forms to it)

- [x] 3.0 Build and verify the leads page Server Component
  - [x] 3.1 Write 3-5 focused tests for the page data-fetching and query logic
    - Test that the Supabase query selects only the required columns: `id`, `vorname`, `nachname`, `email`, `intent_tag`, `confluence_synced`, `confluence_page_id`, `resend_sent`, `created_at`, and the joined `produkte.name`
    - Test that `searchParams.page` defaults to `1` when absent and calculates the correct `.range()` offset (e.g., page 2 → offset 25–49)
    - Test that `searchParams.produkt` is applied as `.eq('produkt_id', value)` only when present
    - Test that `searchParams.confluence_synced` maps `"true"` → `.eq('confluence_synced', true)` and `"false"` → `.eq('confluence_synced', false)`
    - Test that total count from Supabase `count: 'exact'` is passed through correctly to the component tree
    - Mock: `lib/supabase/server.ts` Supabase client
  - [x] 3.2 Create `app/admin/leads/page.tsx` as a pure Server Component
    - No `"use client"` directive; rely on `app/admin/layout.tsx` for auth guard — no additional session check here
    - Import `lib/supabase/server.ts` for all data fetching
    - Fetch distinct products list for the filter `<select>`: `SELECT id, name FROM produkte ORDER BY name ASC`
    - Build the main leads query:
      - JOIN: `leads` LEFT JOIN `produkte` via `.select('id, vorname, nachname, email, intent_tag, confluence_synced, confluence_page_id, resend_sent, created_at, produkte(name)')`
      - Sort: `.order('created_at', { ascending: false })`
      - Count: add `{ count: 'exact' }` to the query options
      - Apply `.eq()` filters from `searchParams` only when each param is present and non-empty
      - Apply `.range(offset, offset + 24)` where `offset = (page - 1) * 25`
    - Derive `totalPages = Math.ceil(count / 25)` and pass to `LeadTable`
    - Read Confluence config from `einstellungen` table (keys `confluence_base_url`, `confluence_space_key`) with fallback to `process.env.CONFLUENCE_BASE_URL` and `process.env.CONFLUENCE_SPACE_KEY`; pass both values as props to `LeadTable` so link construction stays in the presentational layer
    - Render `<LeadTable>` with props: `leads`, `produkte`, `currentPage`, `totalPages`, `totalCount`, `currentFilters`, `confluenceBaseUrl`, `confluenceSpaceKey`
    - Render the total count string above the table: `"{count} Leads gesamt"`
  - [x] 3.3 Ensure page data-fetching tests pass
    - Run only the 3-5 tests written in 3.1
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- Page is a pure Server Component; no client-side JS required for rendering or filtering
- Single JOIN query fetches all required columns; no N+1 queries
- All `searchParams` filters are applied correctly and safely (parameterised via Supabase client, never interpolated)
- Pagination range is calculated correctly for all page numbers
- Confluence config is read from `einstellungen` with env fallback and passed down as props

---

### Frontend Components

#### Task Group 4: `components/admin/LeadTable.tsx`
**Dependencies:** Task Groups 1, 2, and 3 (requires Badge, re-sync route, and page props contract)

- [x] 4.0 Build and verify `LeadTable.tsx`
  - [x] 4.1 Write 3-6 focused tests for the LeadTable component
    - Test that the filter `<form>` has `method="get"` and renders all three `<select>` controls with correct `name` attributes (`produkt`, `confluence_synced`, `intent_tag`)
    - Test that each `<select>` reflects the active filter value via `defaultValue` when `currentFilters` props are passed
    - Test that the "Zurücksetzen" link href is `/admin/leads` (no query params)
    - Test that the Confluence external link is rendered for a lead with a non-null `confluence_page_id` and hidden for a lead with a null `confluence_page_id`
    - Test that the re-sync `<form>` is shown for a lead with `confluence_synced === false` and hidden for a lead with `confluence_synced === true`
    - Test that the empty state message "Keine Leads gefunden." is rendered when the `leads` array is empty
    - Mock nothing — use static prop fixtures; this is a pure render test
  - [x] 4.2 Define the TypeScript props interface for `LeadTable`
    - `leads`: array of lead row objects matching the selected columns from the page query
    - `produkte`: array of `{ id: string; name: string }` for the product filter `<select>`
    - `currentPage`: `number`
    - `totalPages`: `number`
    - `totalCount`: `number`
    - `currentFilters`: `{ produkt?: string; confluence_synced?: string; intent_tag?: string }`
    - `confluenceBaseUrl`: `string | null`
    - `confluenceSpaceKey`: `string | null`
  - [x] 4.3 Build the filter form section
    - Render as `<form method="get" action="/admin/leads">` so submission navigates via GET with no JavaScript
    - Product `<select name="produkt">`: first option "Alle Produkte" with empty value; remaining options from `produkte` prop; `defaultValue={currentFilters.produkt ?? ''}`
    - Confluence sync `<select name="confluence_synced">`: options Alle (`""`), Ja (`"true"`), Nein (`"false"`); `defaultValue={currentFilters.confluence_synced ?? ''}`
    - Intent tag `<select name="intent_tag">`: options Alle (`""`), Sicherheit (`"sicherheit"`), Preis (`"preis"`), Sofortschutz (`"sofortschutz"`); `defaultValue={currentFilters.intent_tag ?? ''}`
    - Submit button labelled "Filtern"
    - "Zurücksetzen" as an `<a href="/admin/leads">` link, not a button, so it always clears all params
  - [x] 4.4 Build the leads table markup
    - Render a `<table>` with columns: Name, E-Mail, Produkt, Intent, Confluence Sync, Resend, Zeitstempel, Confluence Link, Aktion
    - Name cell: `{lead.vorname} {lead.nachname}` in a single `<td>`
    - E-Mail cell: plain `<td>` with the email string
    - Produkt cell: `lead.produkte?.name ?? '—'` — always render the fallback dash when the join returns null
    - Intent Tag cell: `<Badge variant="neutral">{lead.intent_tag ?? '—'}</Badge>`
    - Confluence Sync cell: `<Badge variant={lead.confluence_synced ? 'success' : 'danger'}>{lead.confluence_synced ? 'Ja' : 'Nein'}</Badge>`
    - Resend Sent cell: `<Badge variant={lead.resend_sent ? 'success' : 'neutral'}>{lead.resend_sent ? 'Ja' : 'Nein'}</Badge>`
    - Zeitstempel cell: format `lead.created_at` as `dd.MM.yyyy HH:mm` using `Intl.DateTimeFormat` with locale `de-DE`; do not import a date library just for this
    - Confluence Link cell: render an `<a>` with an external link icon only when `lead.confluence_page_id !== null` AND `confluenceBaseUrl` is not null; construct href as `{confluenceBaseUrl}/wiki/spaces/{confluenceSpaceKey}/pages/{lead.confluence_page_id}`; add `target="_blank" rel="noopener noreferrer"`; when either value is null, render nothing in this cell
    - Aktion cell: when `lead.confluence_synced === false`, render `<form action="/api/confluence" method="POST">` with `<input type="hidden" name="leadId" value={lead.id} />` and `<input type="hidden" name="action" value="resync" />`; submit button labelled "Re-sync"; when `confluence_synced === true`, render nothing in this cell
  - [x] 4.5 Build the empty state
    - Conditionally render when `leads.length === 0`
    - Centred container with message: "Keine Leads gefunden."
    - Prominent `<a href="/admin/leads">` link below the message: "Filter zurücksetzen"
    - Do not render the `<table>` element at all in the empty state
  - [x] 4.6 Build the pagination controls
    - Render below the table
    - "Zurück" link: `<a href="?page={currentPage - 1}&{preservedFilters}">` — disabled/not rendered when `currentPage === 1`
    - Page indicator: "Seite {currentPage} von {totalPages}"
    - "Weiter" link: `<a href="?page={currentPage + 1}&{preservedFilters}">` — disabled/not rendered when `currentPage >= totalPages`
    - `preservedFilters` must include currently active `produkt`, `confluence_synced`, and `intent_tag` params so filters survive page navigation
    - Build filter query string from `currentFilters` object, skipping empty values
    - Render as plain `<a>` tags with no client-side JavaScript — full page navigation
  - [x] 4.7 Apply Tailwind styling aligned with design tokens
    - Table header row: background `bg-gray-50` (maps to `#f8f8f8` muted token), font-medium
    - Table row hover: `hover:bg-blue-50` (derived from primary `#abd5f4` token) with a smooth transition
    - Border colours: `border-gray-200` (maps to `#e5e5e5` divider token)
    - Filter form inputs: `border border-gray-200 rounded-md px-2 py-1 text-sm`
    - Pagination links: styled as pill buttons using brand blue for active-state affordance
    - Re-sync button: small secondary style, visually distinct from navigation elements
    - Confluence link icon: `text-blue-500 hover:text-blue-700`; use an SVG inline icon or a Heroicons `ArrowTopRightOnSquareIcon` — no additional icon library install if Heroicons is not already a dependency
  - [x] 4.8 Ensure LeadTable tests pass
    - Run only the 3-6 tests written in 4.1
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- Filter form submits via GET and updates URL without JavaScript
- All three `<select>` controls preserve active filter state on page load via `defaultValue`
- Every table column renders with the correct data, fallback, and Badge variant
- Confluence link only renders when both `confluence_page_id` and `confluenceBaseUrl` are non-null
- Re-sync form only renders for rows where `confluence_synced === false`
- Empty state renders "Keine Leads gefunden." with a reset link; no `<table>` is rendered
- Pagination links carry forward active filter params
- No TypeScript `any` types; strict mode compliant

---

### Testing

#### Task Group 5: Test Review and Gap Analysis
**Dependencies:** Task Groups 1–4

- [x] 5.0 Review all feature tests and fill critical gaps
  - [x] 5.1 Review the tests written in Task Groups 1–4
    - Badge tests (Task 1.1): 2-4 tests
    - Re-sync route tests (Task 2.1): 3-5 tests
    - Page data-fetching tests (Task 3.1): 3-5 tests
    - LeadTable render tests (Task 4.1): 3-6 tests
    - Total existing tests: approximately 11-20 tests
  - [x] 5.2 Identify critical gaps in this feature's coverage only
    - Focus exclusively on the admin lead overview feature; do not assess the rest of the application
    - Priority gaps to check:
      - End-to-end: does the re-sync form POST reach the API route and update `confluence_synced`?
      - Integration: does the page correctly pass Confluence config from `einstellungen` to `LeadTable` when the DB row exists?
      - Edge case: does pagination render "Zurück" as absent on page 1 and "Weiter" as absent on the last page?
  - [x] 5.3 Write up to 8 additional tests to fill confirmed critical gaps
    - Add only tests for gaps identified in 5.2; do not add tests for coverage completeness
    - Do not write tests for: column sorting (out of scope), CSV export (out of scope), real-time updates (out of scope)
    - Do not exceed 8 additional tests
  - [x] 5.4 Run all feature-specific tests
    - Run only tests from Task Groups 1–4 plus any new tests from 5.3
    - Expected total: approximately 19-28 tests
    - Do NOT run the full application test suite
    - All tests must pass before marking this task group complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 19-28 tests total)
- No more than 8 additional tests added in Task 5.3
- Critical end-to-end and integration gaps for this feature are covered
- No tests outside the scope of this spec are introduced

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1 — Badge Component**: No dependencies; unblocks Task Groups 3 and 4 which consume `Badge.tsx`
2. **Task Group 2 — Re-sync API Route**: Independent of UI; must exist before the table's re-sync `<form>` can POST to a real endpoint
3. **Task Group 3 — Server Component Page**: Depends on having the data contract and Confluence config logic settled; defines all props passed to `LeadTable`
4. **Task Group 4 — LeadTable Component**: Depends on Badge (Task Group 1), the re-sync route (Task Group 2), and the props contract from the page (Task Group 3)
5. **Task Group 5 — Test Review and Gap Analysis**: Depends on all prior groups being complete and passing their own focused tests
