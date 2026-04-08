# Task Breakdown: Confluence CRM Integration

## Overview
Total Tasks: 4 task groups, 22 sub-tasks

This feature is entirely backend and API layer. There is no new UI beyond a test connection button wired into the existing admin settings page. Implementation must follow the dependency chain strictly: the Confluence client library must exist and be tested before the API routes that call it are written.

---

## Task List

### Library Layer

#### Task Group 1: Confluence Client Library (`lib/confluence/client.ts`)
**Dependencies:** None (assumes `lib/supabase/server.ts` and `lib/supabase/types.ts` exist from the supabase-schema spec)

- [x] 1.0 Build the complete Confluence client library
  - [x] 1.1 Write 2-8 focused tests for the Confluence client
    - Test that `createLeadPage` returns `{ pageId: string }` when the Confluence API responds with 200
    - Test that `createLeadPage` throws with a descriptive message when a required credential is missing after DB and env fallback checks
    - Test that null `vorname` / `nachname` fields render as empty strings in the page title (no extra whitespace, no "null" string)
    - Test that null fields in the lead row render as empty table cells in the page body (never as the string "null")
    - Test that `testConnection` returns `{ success: false, message: string }` when the Confluence API call fails, without throwing
    - Mock all Supabase and HTTP calls — no live network or DB calls in unit tests
  - [x] 1.2 Implement the private `resolveCredentials()` async helper
    - Uses the Supabase server client (service role) to query `einstellungen` in a single `SELECT ... WHERE schluessel IN (...)` — not five separate queries
    - Reads five keys: `confluence_base_url`, `confluence_email`, `confluence_api_token`, `confluence_space_key`, `confluence_parent_page_id`
    - For each key: use the DB `wert` if non-null, otherwise fall back to the matching `process.env.CONFLUENCE_*` variable
    - If any required credential is still missing after both checks, throw a descriptive `Error` with the missing key name included in the message
    - Function is not exported — private to `client.ts`
  - [x] 1.3 Implement the page title builder
    - Pattern: `Lead: {vorname} {nachname} — {produktName} — {date}`
    - Date formatted as `DD.MM.YYYY` using `toLocaleDateString('de-DE')` on `new Date(lead.created_at)`
    - Substitute empty string (not `null`, not `"null"`) for missing `vorname` or `nachname`; trim any extra whitespace from the resulting name segment
  - [x] 1.4 Implement the page body builder (Confluence storage format)
    - Output must be valid Confluence XHTML storage format — not Markdown, not plain HTML
    - Summary block: five `<p>` tags, one per line — `Neuer Lead: {vorname} {nachname}`, `Produkt: {produktName}`, `Interesse: {interesse}`, `Zielgruppe: {zielgruppe_tag}`, `Intent: {intent_tag}`
    - Table block: `<table>` with a header row (Feld / Wert) and one `<tr>` per field: Vorname, Nachname, E-Mail, Telefon, Nachricht (`interesse` column), Zeitstempel (ISO string from `created_at`)
    - Null field values must produce an empty `<td></td>`, never the string `"null"` or `"undefined"`
  - [x] 1.5 Implement the `createLeadPage(lead, produktName, produktSlug)` exported function
    - Accept a fully typed `Lead` row imported from `lib/supabase/types.ts` plus `produktName: string` and `produktSlug: string` parameters
    - Call `resolveCredentials()` at the start of every invocation
    - Build HTTP Basic Auth header: `'Basic ' + Buffer.from(\`\${email}:\${apiToken}\`).toString('base64')`
    - Call `POST {base_url}/wiki/api/v2/pages` with `Content-Type: application/json`, the auth header, and a body containing `spaceId` (from `confluence_space_key`), `parentId` (from `confluence_parent_page_id`), `title`, and `body` in storage format using the builders from 1.3 and 1.4
    - On non-2xx response: throw an `Error` that includes the HTTP status and the Confluence error response body
    - Extract `pageId` from the response JSON and return `{ pageId: string }`
  - [x] 1.6 Implement the post-creation label attachment
    - After a successful page creation, call `POST {base_url}/wiki/api/v2/pages/{pageId}/labels` with the resolved credentials
    - Labels array: include `produktSlug`, `lead.zielgruppe_tag`, and `lead.intent_tag` — skip any entry that is null or an empty string
    - Each label entry must follow the Confluence v2 label shape: `{ "prefix": "global", "name": "{value}" }`
    - If the label API call fails for any reason: log the error with `console.error` including the `pageId` and HTTP status; do not throw and do not affect the return value of `createLeadPage`
  - [x] 1.7 Implement the `testConnection()` exported utility
    - No parameters
    - Call `resolveCredentials()` inside a try/catch; if it throws, return `{ success: false, message: error.message }`
    - Call `GET {base_url}/wiki/api/v2/spaces` with the resolved auth header
    - Return `{ success: true }` on any 2xx response
    - Return `{ success: false, message: string }` on non-2xx or on any thrown exception — never throw out of `testConnection`
  - [x] 1.8 Ensure all client library tests pass
    - Run only the tests written in 1.1
    - Verify the mock responses produce the expected return shapes
    - Do not run the full test suite at this stage

**Acceptance Criteria:**
- All 2-8 tests written in 1.1 pass
- `resolveCredentials` issues exactly one Supabase query for all five credential keys
- `createLeadPage` returns `{ pageId: string }` when mocked Confluence API returns 200
- Page title and body handle null fields without emitting the string "null"
- Label failures do not cause `createLeadPage` to throw
- `testConnection` never throws — all errors are returned as `{ success: false, message }`

---

### API Layer

#### Task Group 2: `/api/confluence` Manual Re-sync Route
**Dependencies:** Task Group 1

- [x] 2.0 Build the `/api/confluence` POST route
  - [x] 2.1 Write 2-8 focused tests for the re-sync route
    - Test that a request without a valid Supabase Auth session returns 401
    - Test that a body with an invalid UUID `leadId` returns 400 with a structured error
    - Test that a `leadId` for a non-existent lead row returns 404
    - Test that a lead where `confluence_synced = true` returns 200 with a "no action taken" message without calling `createLeadPage`
    - Mock the Supabase client and `createLeadPage` — no live calls in tests
  - [x] 2.2 Implement Supabase Auth session check
    - Use the Supabase server client to verify the session at the start of the handler
    - Return `NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Admin session required' } }, { status: 401 })` immediately if no valid session is found
  - [x] 2.3 Implement Zod input validation
    - Schema: `z.object({ leadId: z.string().uuid() })`
    - Parse the request JSON body; on failure return `NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '...', details: zodError.errors } }, { status: 400 })`
  - [x] 2.4 Implement lead fetch and guard logic
    - Fetch the lead row from the `leads` table by `leadId` using the Supabase server client
    - If no row found: return `{ data: null, error: { code: 'NOT_FOUND', message: 'Lead not found' } }` with status 404
    - If `confluence_synced = true`: return `{ data: { message: 'Lead already synced to Confluence', confluencePageId: lead.confluence_page_id }, error: null }` with status 200 — do not call `createLeadPage`
  - [x] 2.5 Implement the re-sync execution and Supabase update
    - Resolve `produktName` and `produktSlug` from the `produkte` table using `lead.produkt_id`
    - Call `createLeadPage(lead, produktName, produktSlug)` inside a try/catch
    - On success: update the lead row — `confluence_page_id = pageId`, `confluence_synced = true`; return `{ data: { confluencePageId: pageId }, error: null }` with status 200
    - On error: log with `console.error` including `leadId` and error message; return `{ data: null, error: { code: 'CONFLUENCE_ERROR', message: error.message } }` with status 500
  - [x] 2.6 Ensure re-sync route tests pass
    - Run only the tests written in 2.1
    - Do not run the full test suite at this stage

**Acceptance Criteria:**
- All 2-8 tests written in 2.1 pass
- Route returns 401 without a valid session, 400 for invalid UUID, 404 for missing lead
- Already-synced leads return 200 immediately without calling `createLeadPage`
- Successful re-sync updates both `confluence_page_id` and `confluence_synced` in the `leads` table
- All responses use the `{ data, error }` JSON structure per the API standard

---

### Integration Layer

#### Task Group 3: Integrate `createLeadPage` into `/api/leads`
**Dependencies:** Task Group 1

- [x] 3.0 Wire Confluence sync into the lead capture route
  - [x] 3.1 Write 2-8 focused tests for the Confluence integration inside `/api/leads`
    - Test that a successful lead save followed by a successful `createLeadPage` call results in the lead row being updated with `confluence_page_id` and `confluence_synced = true`
    - Test that a successful lead save followed by a failing `createLeadPage` call still returns a success response to the client (non-blocking), with `confluence_synced = false` and `confluence_page_id` left null
    - Mock `createLeadPage` — do not make live Confluence calls in these tests
  - [x] 3.2 Add Confluence sync call after successful Supabase insert
    - After the lead row is inserted and the insert confirms success, resolve `produktName` and `produktSlug` from the `produkte` table using the `produkt_id` from the inserted lead
    - Call `createLeadPage(insertedLead, produktName, produktSlug)` inside a try/catch block
    - On success: run a Supabase update on the lead row setting `confluence_page_id = pageId` and `confluence_synced = true`; log success at `console.log` level
    - On catch: log with `console.error` including the lead ID and the error; set `confluence_synced = false` on the lead row (update); do not alter the HTTP response — the lead was saved successfully regardless
  - [x] 3.3 Ensure integration tests pass
    - Run only the tests written in 3.1
    - Verify the lead save response is never blocked or altered by a Confluence failure
    - Do not run the full test suite at this stage

**Acceptance Criteria:**
- All 2-8 tests written in 3.1 pass
- A Confluence API failure never causes the `/api/leads` route to return an error response to the client
- On success, the lead row in Supabase reflects `confluence_synced = true` and the correct `confluence_page_id`
- On failure, the lead row reflects `confluence_synced = false` and `confluence_page_id` remains null

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review all tests from Task Groups 1-3
    - Review the 2-8 tests from the Confluence client library (Task 1.1)
    - Review the 2-8 tests from the re-sync route (Task 2.1)
    - Review the 2-8 tests from the leads integration (Task 3.1)
    - Total existing tests: approximately 6-24 tests
  - [x] 4.2 Identify critical coverage gaps for this feature only
    - Focus exclusively on gaps in the Confluence integration workflows
    - Priority: the full end-to-end path of `POST /api/leads` → Supabase insert → `createLeadPage` → label attachment → Supabase update
    - Priority: the `POST /api/confluence` re-sync path for a previously failed lead
    - Do not assess or expand coverage for unrelated parts of the application
  - [x] 4.3 Write up to 10 additional strategic tests if critical gaps exist
    - Limit to 10 new tests maximum
    - Suggested candidates only if not already covered:
      - `resolveCredentials` falls back to env when the `einstellungen` row is missing
      - `resolveCredentials` throws with the correct missing key name when both DB and env are absent
      - Page body builder produces correct XHTML for a lead with all fields populated
      - Page body builder produces empty `<td></td>` (not "null") for a lead with all nullable fields set to null
      - `createLeadPage` logs a `console.error` and returns `{ pageId }` successfully when the label API call returns 4xx
    - Skip edge cases, performance tests, and accessibility tests — not applicable to this backend-only feature
  - [x] 4.4 Run only feature-specific tests
    - Run only the tests related to this spec: tests from 1.1, 2.1, 3.1, and 4.3
    - Expected total: approximately 16-34 tests maximum
    - Do not run the entire application test suite
    - All tests must pass before this task group is marked complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 16-34 tests total)
- The full lead-save-to-Confluence path is covered by at least one integration-style test
- The non-blocking failure path is explicitly covered
- No more than 10 additional tests added in 4.3
- Test coverage is scoped exclusively to the Confluence CRM integration feature

---

## Execution Order

Implement task groups in this sequence:

1. **Task Group 1 — Confluence Client Library** (`lib/confluence/client.ts`): No external dependencies within this feature. Must be complete before Groups 2 and 3.
2. **Task Group 2 — Re-sync API Route** (`/api/confluence`): Depends on Group 1. Can be developed in parallel with Group 3 once Group 1 is done.
3. **Task Group 3 — Lead Capture Integration** (`/api/leads`): Depends on Group 1. Can be developed in parallel with Group 2 once Group 1 is done.
4. **Task Group 4 — Test Review and Gap Analysis**: Depends on Groups 1, 2, and 3 all being complete.

Groups 2 and 3 have no dependency on each other and may be worked in parallel if two engineers are available.
