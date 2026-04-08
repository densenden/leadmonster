# Task Breakdown: Admin Settings Page (Einstellungen)

## Overview
Total Tasks: 4 groups, 26 sub-tasks

## Task List

---

### Database & Server Infrastructure

#### Task Group 1: Supabase Foundation and Credential Resolution
**Dependencies:** None

- [x] 1.0 Complete the server infrastructure layer
  - [x] 1.1 Write 2-4 focused tests for the `einstellungen` table and credential resolution
    - Test that a row can be upserted and re-read by `schluessel`
    - Test that `lib/confluence/client.ts` returns DB values when a matching `einstellungen` row exists
    - Test that `lib/confluence/client.ts` falls back to `process.env.CONFLUENCE_*` when no DB row exists
    - Mock the Supabase client for all tests; do not hit a real database
  - [x] 1.2 Verify (or create) the `einstellungen` table migration is present and correct
    - Required columns: `id`, `schluessel`, `wert`, `beschreibung`, `updated_at`, `updated_by`
    - `schluessel` must have a `UNIQUE` constraint — required for `onConflict('schluessel')` upserts
    - Add index on `schluessel` if not present
    - `updated_by` must be a foreign key to `auth.users(id)`
    - Do not alter existing columns; add only what is missing
  - [x] 1.3 Confirm `lib/supabase/server.ts` exports a service role client
    - The service role client must be available for use in Server Components, Server Actions, and Route Handlers
    - If the file does not yet exist, create it following the existing `lib/supabase/client.ts` pattern but using the service role key (`SUPABASE_SERVICE_ROLE_KEY`)
  - [x] 1.4 Confirm or implement DB-first / env-fallback credential resolution in `lib/confluence/client.ts`
    - Function must query `einstellungen` by `schluessel` for each of the six keys first
    - Fall back to the matching `process.env.CONFLUENCE_*` or `process.env.SALES_*` value if no DB row exists
    - Fall back to an empty string if neither source has a value
    - This file is the single source of truth for credential resolution; do not duplicate this logic elsewhere
  - [x] 1.5 Run only the tests written in 1.1
    - Verify all 2-4 tests pass
    - Verify the upsert + read round-trip works correctly in the test environment
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 1.1 pass
- `einstellungen` table has a unique constraint on `schluessel`
- `lib/supabase/server.ts` exports a working service role client
- `lib/confluence/client.ts` resolves credentials from DB first, env second, empty string third

---

### Server Action

#### Task Group 2: `saveSettings` Server Action and Zod Validation
**Dependencies:** Task Group 1

- [x] 2.0 Complete the Server Action layer
  - [x] 2.1 Write 2-4 focused tests for `saveSettings`
    - Test that a valid FormData payload with all six fields returns `{ success: true }`
    - Test that an invalid `confluence_base_url` (not a URL) returns `{ success: false, error: "Bitte eine gültige URL eingeben." }`
    - Test that calling the action with no active session returns `{ success: false, error: 'Nicht authentifiziert.' }`
    - Mock the Supabase client and any auth calls; do not write to a real database
  - [x] 2.2 Create `app/admin/einstellungen/actions.ts`
    - Named export: `saveSettings(formData: FormData)` — TypeScript strict mode, no `any`
    - Use `'use server'` directive at the top of the file
    - Return type: `Promise<{ success: true } | { success: false; error: string }>`
  - [x] 2.3 Implement the Zod validation schema inside `actions.ts`
    - `confluence_base_url`: `z.string().url()` — error: "Bitte eine gültige URL eingeben."
    - `confluence_email`: `z.string().email()` — error: "Bitte eine gültige E-Mail-Adresse eingeben."
    - `confluence_api_token`: `z.string().min(1)` — error: "API-Token darf nicht leer sein."
    - `confluence_space_key`: `z.string().min(1)` — error: "Space-Key darf nicht leer sein."
    - `confluence_parent_page_id`: `z.string().min(1)` — error: "Parent Page ID darf nicht leer sein."
    - `sales_notification_email`: `z.string().email()` — error: "Bitte eine gültige E-Mail-Adresse eingeben."
    - Use `z.object().safeParse()` so all field errors are collected in a single pass
    - On failure, return `{ success: false, error: <first German field error message> }`
  - [x] 2.4 Implement session authentication check in `saveSettings`
    - Use the server Supabase client to retrieve the current session
    - If no session exists, return `{ success: false, error: 'Nicht authentifiziert.' }` immediately (early return)
    - Extract `user.id` from the session for use as `updated_by`
  - [x] 2.5 Implement the six individual upsert calls in `saveSettings`
    - Use `supabase.from('einstellungen').upsert(...).onConflict('schluessel')` for each key
    - Set `updated_by` to the session user id and `updated_at` to `new Date().toISOString()` on every upsert
    - Set the canonical `beschreibung` string on every upsert (see spec for all six strings)
    - The `confluence_api_token` upsert must include this exact inline comment on the line above the upsert call:
      `// TODO: encrypt confluence_api_token before storing (Supabase Vault or pgcrypto)`
    - On any Supabase error, return `{ success: false, error: 'Fehler beim Speichern. Bitte erneut versuchen.' }`
    - On full success, return `{ success: true }`
  - [x] 2.6 Run only the tests written in 2.1
    - Verify all 2-4 tests pass
    - Confirm the `TODO` comment is present in the source
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 2.1 pass
- All six fields are validated with field-specific German error messages
- Session is checked before any DB write; unauthenticated calls are rejected
- Each key is upserted individually with `updated_by`, `updated_at`, and `beschreibung`
- `confluence_api_token` upsert is preceded by the mandatory TODO comment
- Returns `{ success: true }` on complete success

---

### API Route

#### Task Group 3: `GET /api/confluence?action=test` Route Handler
**Dependencies:** Task Group 1

- [x] 3.0 Complete the API route layer
  - [x] 3.1 Write 2-4 focused tests for the test-connection endpoint
    - Test that a request with no active session returns HTTP 401 with `{ success: false, message: 'Nicht authentifiziert.' }`
    - Test that a valid session and valid credentials (mocked Confluence response HTTP 200) returns `{ success: true, message: 'Verbindung erfolgreich.' }`
    - Test that a valid session and a non-200 Confluence response returns `{ success: false, message: 'Verbindung fehlgeschlagen: <status>' }`
    - Mock the Supabase auth check and the outbound fetch to Confluence; do not make real network calls
  - [x] 3.2 Create `app/api/confluence/route.ts` with a `GET` export
    - Handle the `action=test` query parameter on the `GET` method
    - Ignore unrecognised `action` values with HTTP 400
    - Use the server Supabase client to verify the session; return HTTP 401 with `{ success: false, message: 'Nicht authentifiziert.' }` if no session
  - [x] 3.3 Implement the Confluence connection test logic inside the `GET` handler
    - Call `lib/confluence/client.ts` credential resolution — do not duplicate resolution logic in this file
    - Construct HTTP Basic auth header: Base64 encode `confluence_email:confluence_api_token`
    - Make a `fetch` call to `<confluence_base_url>/wiki/rest/api/user/current` with the Basic auth header
    - On HTTP 200: return `{ success: true, message: 'Verbindung erfolgreich.' }`
    - On any non-200 or network error: return `{ success: false, message: 'Verbindung fehlgeschlagen: <status>' }` — never expose raw credentials in the response body
    - Wrap the outbound fetch in try/catch for network-level errors
  - [x] 3.4 Run only the tests written in 3.1
    - Verify all 2-4 tests pass
    - Confirm credentials are not present in any error response body
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 3.1 pass
- Unauthenticated requests are rejected with HTTP 401
- Credential resolution is fully delegated to `lib/confluence/client.ts`
- Success and failure responses use the exact German message strings from the spec
- No credentials appear in any response body

---

### UI Components and Page

#### Task Group 4: Server Component Page and `SettingsForm` Client Component
**Dependencies:** Task Groups 1, 2, 3

- [x] 4.0 Complete the UI layer
  - [x] 4.1 Write 2-4 focused tests for the `SettingsForm` component
    - Test that the component renders all six labeled input fields with values from props
    - Test that clicking the show/hide toggle on `confluence_api_token` switches the input between `type="password"` and `type="text"` without clearing the value
    - Test that submitting the form calls `saveSettings` and displays "Einstellungen gespeichert." on `{ success: true }`
    - Test that clicking "Verbindung testen" triggers a fetch to `/api/confluence?action=test` and displays the green badge on success
    - Use React Testing Library; mock `saveSettings` and `fetch`
  - [x] 4.2 Create `app/admin/einstellungen/page.tsx` as a Server Component
    - Import and use the service role Supabase client from `lib/supabase/server.ts`
    - Query the `einstellungen` table by `schluessel` for all six keys: `confluence_base_url`, `confluence_email`, `confluence_api_token`, `confluence_space_key`, `confluence_parent_page_id`, `sales_notification_email`
    - Fall back to an empty string if a row does not exist for a given key
    - Pass only the six key/value pairs to `SettingsForm` — do not pass `id`, `updated_by`, or `updated_at` to the client
    - Render a page `<h1>` with the text "Einstellungen" (Nunito Sans, `colors.text.heading` #333333)
    - No additional auth check in this file; the auth guard in `app/admin/layout.tsx` covers it
  - [x] 4.3 Create `app/admin/einstellungen/_components/settings-form.tsx` as a Client Component
    - `'use client'` directive at the top
    - Define and export `SettingsFormProps` interface with all six string fields
    - Initialize all six fields as controlled `useState` variables from props
  - [x] 4.4 Implement the "Confluence Integration" Card section
    - Wrap in `Card` from `components/ui/Card.tsx`
    - `<h2>` heading: "Confluence Integration"
    - Five fields: `confluence_base_url`, `confluence_email`, `confluence_api_token`, `confluence_space_key`, `confluence_parent_page_id`
    - Each field: `<label htmlFor={id}>` + `<input id={id}>` pair
    - Labels use `colors.text.heading` (#333333); helper text below each input uses `colors.text.muted` (#999999) and renders the canonical `beschreibung` string from the spec
    - Card border uses `colors.border.divider` (#e5e5e5)
  - [x] 4.5 Implement the `confluence_api_token` show/hide toggle
    - Input uses `type="password"` by default; a toggle button switches it to `type="text"` and back
    - Toggle button uses an eye / eye-off icon (inline SVG)
    - Toggling must not clear the current input value
    - Toggle button has a descriptive `aria-label` ("Passwort anzeigen" / "Passwort verbergen")
  - [x] 4.6 Implement the "E-Mail Benachrichtigungen" Card section
    - Wrap in a second `Card` from `components/ui/Card.tsx`
    - `<h2>` heading: "E-Mail Benachrichtigungen"
    - One field: `sales_notification_email`
    - Same label/input/helper-text pattern as the Confluence fields
  - [x] 4.7 Implement the "Einstellungen speichern" submit button and save feedback
    - Use `Button` from `components/ui/Button.tsx` with `variant="primary"`
    - Call `saveSettings` via `useTransition`; disable the button and show a loading state while `isPending` is true
    - On `{ success: true }`: display an inline success message "Einstellungen gespeichert." below the button
    - On `{ success: false, error }`: display the returned German error string as an inline error message below the button
    - No full page reload on either outcome
    - Save button uses `colors.primary.hex` (#abd5f4) for background / focus ring per design tokens
  - [x] 4.8 Implement the "Verbindung testen" button and connection result badge
    - Use `Button` from `components/ui/Button.tsx` with `variant="outline"`
    - On click, call `fetch('/api/confluence?action=test')` and parse the JSON response
    - Disable the button and show a loading state while the request is in-flight (use a local `isTesting` state boolean)
    - On `{ success: true }`: show a green badge with white text "Verbindung erfolgreich"
    - On `{ success: false, message }`: show a red badge with white text containing the returned message
    - Both badges are rendered inline below the test button
  - [x] 4.9 Verify accessibility requirements
    - Every input must have a `<label>` with a matching `htmlFor`/`id` pair
    - The show/hide toggle and both action buttons must have descriptive `aria-label` attributes
    - Tab order must flow logically through all six fields, then the test button, then the save button
  - [x] 4.10 Run only the tests written in 4.1
    - Verify all 2-4 tests pass
    - Confirm the show/hide toggle, save feedback, and test badge all render correctly
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 4.1 pass
- All six fields render with correct labels, controlled inputs, and helper text
- `confluence_api_token` field toggles between password and text without losing its value
- Save button calls `saveSettings` via `useTransition` and shows inline German feedback
- Test button calls `/api/confluence?action=test` and displays a colour-coded badge
- Design matches tokens: `#abd5f4` focus/primary, `#e5e5e5` card borders, `#333333` labels, `#999999` helper text
- No custom CSS — Tailwind utility classes and design tokens only

---

### Testing

#### Task Group 5: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-4

- [x] 5.0 Review existing tests and fill critical gaps only
  - [x] 5.1 Review all tests written across Task Groups 1-4
    - Review the 2-4 tests from Task 1.1 (Supabase foundation / credential resolution)
    - Review the 2-4 tests from Task 2.1 (`saveSettings` Server Action)
    - Review the 2-4 tests from Task 3.1 (API route handler)
    - Review the 2-4 tests from Task 4.1 (`SettingsForm` component)
    - Total existing tests: approximately 8-16
  - [x] 5.2 Identify critical gaps for THIS feature only
    - Focus on: full end-to-end flow from form submit through Server Action to upsert
    - Focus on: the show/hide token toggle preserving value across multiple toggles
    - Focus on: network error on the test connection fetch (not just non-200 HTTP)
    - Do NOT assess overall application test coverage
  - [x] 5.3 Write up to 10 additional strategic tests to fill confirmed critical gaps
    - Add integration tests only where a clear critical workflow gap is identified
    - Do not add exhaustive validation tests for every Zod rule — the unit tests in 2.1 cover those
    - Do not add performance, accessibility, or visual regression tests at this stage
  - [x] 5.4 Run only the feature-specific tests
    - Run ONLY the tests from 1.1, 2.1, 3.1, 4.1, and 5.3
    - Expected total: approximately 18-26 tests maximum
    - Do NOT run the entire application test suite
    - All tests must pass before marking this task group complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 18-26 tests total)
- Critical end-to-end workflows for this feature are covered
- No more than 10 additional tests added in this group
- Test scope is limited exclusively to the Admin Settings Page feature

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1** — Supabase Foundation and Credential Resolution (no dependencies; everything else builds on this)
2. **Task Group 2** — `saveSettings` Server Action (depends on Group 1 for the Supabase client and table)
3. **Task Group 3** — `GET /api/confluence?action=test` Route Handler (depends on Group 1 for credential resolution; can run in parallel with Group 2)
4. **Task Group 4** — Server Component Page and `SettingsForm` Client Component (depends on Groups 1, 2, and 3)
5. **Task Group 5** — Test Review and Gap Analysis (depends on all prior groups)

Groups 2 and 3 have the same dependency (Group 1) and no dependency on each other — they can be implemented in parallel by separate engineers if needed.
