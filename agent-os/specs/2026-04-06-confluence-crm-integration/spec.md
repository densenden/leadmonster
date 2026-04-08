# Specification: Confluence CRM Integration

## Goal
After a lead is saved to Supabase, automatically create a labeled Confluence page containing all lead data formatted as a table, then update the lead row with the resulting page ID and sync status.

## User Stories
- As a sales team member, I want every submitted lead to appear automatically as a Confluence page so that I can track and follow up leads without manual data entry.
- As an admin, I want to manually re-sync failed Confluence pages from the admin area so that no lead is permanently lost due to a transient API error.

## Specific Requirements

**Credential resolution in `lib/confluence/client.ts`**
- On every call, fetch credentials from the `einstellungen` table using the Supabase server client (service role) before falling back to `process.env.CONFLUENCE_*`
- Read the five keys: `confluence_base_url`, `confluence_email`, `confluence_api_token`, `confluence_space_key`, `confluence_parent_page_id`
- If a key exists in `einstellungen` (non-null `wert`), use it; otherwise fall back to the matching `process.env` variable
- If any required credential is missing after both checks, throw a descriptive error and do not attempt the API call
- Credential resolution is a private async helper inside `client.ts`, not exported

**`createLeadPage(lead, produktName)` function**
- Exported async function, accepts a fully typed `Lead` row (from `lib/supabase/types.ts`) and a `produktName` string
- Returns `{ pageId: string }` on success; throws on unrecoverable errors
- Calls the Confluence REST API v2 endpoint: `POST {base_url}/wiki/api/v2/pages`
- Uses HTTP Basic Auth: `base64(email:api_token)` in the `Authorization` header
- Request body includes: `spaceId` resolved from `confluence_space_key`, `parentId` from `confluence_parent_page_id`, `title`, and `body` in Confluence storage format

**Page title format**
- Title must follow the pattern: `Lead: {vorname} {nachname} — {produktName} — {date}`
- Date formatted as `DD.MM.YYYY` in German locale (e.g. `02.04.2026`)
- If `vorname` or `nachname` is null, substitute an empty string with no extra whitespace

**Page body: Confluence storage format**
- Body must be valid Confluence XHTML storage format (not Markdown, not HTML)
- Open with a summary paragraph: `Neuer Lead: {vorname} {nachname}`, `Produkt: {produktName}`, `Interesse: {interesse}`, `Zielgruppe: {zielgruppe_tag}`, `Intent: {intent_tag}` — each on its own line using `<p>` tags
- Follow with a `<table>` containing two columns (Feld / Wert) and one row per field: Vorname, Nachname, E-Mail, Telefon, Nachricht (interesse), Zeitstempel (ISO timestamp from `created_at`)
- Null fields must render as an empty table cell, never as the string "null"

**Labels on the Confluence page**
- After page creation, apply labels via `POST {base_url}/wiki/api/v2/pages/{pageId}/labels`
- Labels to apply: the product slug (from lead's `produkt_id` resolved to slug, passed as parameter), `zielgruppe_tag`, and `intent_tag`
- Skip null tags — only attach labels that have a non-null, non-empty value
- Label API failure must be logged but must not cause `createLeadPage` to throw or mark the sync as failed

**Error handling and non-blocking behavior**
- `createLeadPage` must never throw in a way that blocks the lead save in `/api/leads`
- The caller in `/api/leads` wraps the call in try/catch; on catch, it logs the error, sets `confluence_synced = false`, and leaves `confluence_page_id` null
- On success, the caller updates the lead row: `confluence_page_id = pageId`, `confluence_synced = true`
- Log all Confluence errors with `console.error` including the lead ID and HTTP status where available
- Do not retry automatically in the happy path; retries happen via the manual re-sync route

**`testConnection()` utility function**
- Exported async function, no parameters
- Calls `GET {base_url}/wiki/api/v2/spaces` with the resolved credentials to verify the connection
- Returns `{ success: true }` on 2xx, or `{ success: false, message: string }` on any error
- Used by the admin settings page (`app/admin/einstellungen/page.tsx`) to allow admins to verify credentials before saving
- Must not throw — all errors caught and returned as `{ success: false, message }`

**`/api/confluence` route — manual re-sync**
- `POST /api/confluence` accepts a JSON body `{ leadId: string }` validated with zod
- Protected: only callable from authenticated admin sessions (check Supabase Auth session in the route handler)
- Fetches the lead row from Supabase by ID; if `confluence_synced = true` already, return 200 with a message indicating no action taken
- Calls `createLeadPage` and on success updates `confluence_page_id` and `confluence_synced = true`
- Response shape follows the project API standard: `{ data, error }` JSON

**Input validation in `/api/confluence`**
- Validate `leadId` is a valid UUID using zod (`z.string().uuid()`)
- Return 400 with structured error if validation fails
- Return 404 if the lead row does not exist in Supabase
- Return 401 if no valid admin session is present

## Visual Design
No visual mockups provided for this spec. The feature is entirely backend / API layer with no new UI beyond the test connection button on the existing admin settings page.

## Existing Code to Leverage

**`lib/supabase/server.ts` (to be created in supabase-schema spec)**
- Server-side Supabase client using the service role key
- Used in `client.ts` to read the `einstellungen` table for credential resolution
- Used in `/api/confluence` route to fetch lead rows and update `confluence_synced` and `confluence_page_id`

**`leads` table schema (defined in supabase-schema spec)**
- Columns `confluence_page_id`, `confluence_synced`, `produkt_id`, `vorname`, `nachname`, `email`, `telefon`, `interesse`, `zielgruppe_tag`, `intent_tag`, `created_at` are all consumed by `createLeadPage`
- TypeScript types from `lib/supabase/types.ts` must be used for the `Lead` parameter type — no manual type definitions

**`einstellungen` table schema (defined in supabase-schema spec)**
- Five Confluence credential keys stored with `schluessel` / `wert` column pairs
- Credential resolution helper reads all five keys in a single `SELECT ... WHERE schluessel IN (...)` query, not five separate queries
- The `wert` column is plain text in the current phase (encryption deferred per supabase-schema spec decision)

**`/api/leads` route (lead-form-capture-api spec)**
- The `createLeadPage` call is made inside `/api/leads` after the Supabase insert succeeds
- The try/catch wrapper pattern for non-blocking Confluence sync is defined at the call site in that route, not inside `client.ts`

## Out of Scope
- Confluence space creation or parent page creation — the space and parent page must already exist
- Encryption of `einstellungen.wert` — deferred per supabase-schema spec decision
- Updating or deleting existing Confluence pages when a lead is edited
- Webhook or real-time sync from Confluence back to Supabase
- Resend email integration — handled in a separate spec
- Automatic retry with exponential backoff — re-sync is manual via the `/api/confluence` route
- Confluence page versioning or conflict resolution
- Bulk re-sync of multiple failed leads in a single request
- Any admin UI beyond the test connection button on the settings page
