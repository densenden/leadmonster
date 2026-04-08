# Specification: Admin Settings Page (Einstellungen)

## Goal
Give admins a UI at `/admin/einstellungen` to view and update Confluence integration credentials and the sales notification email stored in the `einstellungen` table, so that the lead flow can be reconfigured without touching environment variables or redeploying.

## User Stories
- As an admin, I want to update Confluence credentials from the UI so that I can reconfigure the lead sync without redeployment.
- As an admin, I want to test the Confluence connection before saving so that I can verify credentials are valid before going live.

## Specific Requirements

**Page `app/admin/einstellungen/page.tsx`**
- Server Component — loads all six credential keys from the `einstellungen` table on render using the service role Supabase client from `lib/supabase/server.ts`
- Queries `einstellungen` by `schluessel` for each of the six keys; falls back to an empty string if a row does not yet exist
- Groups fields into two visual sections rendered as separate `Card` components: "Confluence Integration" (five Confluence fields) and "E-Mail Benachrichtigungen" (sales_notification_email)
- Passes loaded key/value pairs to the `SettingsForm` client component as props; does not expose `id`, `updated_by`, or `updated_at` to the client
- Protected by the existing auth guard in `app/admin/layout.tsx` — no additional auth check required in this page

**Client Component `app/admin/einstellungen/_components/settings-form.tsx`**
- `'use client'` directive; receives initial field values as props typed with a `SettingsFormProps` interface
- Controlled inputs for all six fields using `useState` initialised from props
- `confluence_api_token` field uses `type="password"` with a show/hide toggle button (eye / eye-off icon); toggling changes the input type between `"password"` and `"text"` without clearing the value
- "Einstellungen speichern" submit button calls the `saveSettings` Server Action via `useTransition`; shows a loading state on the button during the pending transition
- After save, displays an inline success message ("Einstellungen gespeichert.") or an inline error message in German — no full page reload
- "Verbindung testen" button (separate from save) triggers a `fetch` call to `GET /api/confluence?action=test`; shows an inline result badge: green with "Verbindung erfolgreich" or red with the returned error message
- The test button is also disabled and shows a loading state while the test request is in-flight
- All labels are associated with inputs via `htmlFor`/`id`; all inputs have descriptive `aria-label` or visible `<label>` text

**Server Action `app/admin/einstellungen/actions.ts`**
- Named export `saveSettings(formData: FormData)` — TypeScript strict mode, no `any`
- Parse and validate all six fields with Zod before any DB write; return `{ success: false, error: string }` on validation failure with a German user-facing message
- Retrieve the authenticated session user id via the server Supabase client; return `{ success: false, error: 'Nicht authentifiziert.' }` with a 401-equivalent early return if no session
- Upsert each of the six keys individually into the `einstellungen` table using `onConflict('schluessel')` so existing rows are updated and missing rows are inserted; set `updated_by` to the session user id and `updated_at` to `new Date().toISOString()` on every upsert
- The `confluence_api_token` upsert must include a mandatory inline comment: `// TODO: encrypt confluence_api_token before storing (Supabase Vault or pgcrypto)`
- Set the `beschreibung` field on every upsert using the canonical human-readable strings defined in the requirements so descriptions are always kept in sync
- Return `{ success: true }` on complete success; return `{ success: false, error: 'Fehler beim Speichern. Bitte erneut versuchen.' }` on any DB error

**Zod validation schema**
- `confluence_base_url`: `z.string().url()` — invalid message: "Bitte eine gültige URL eingeben."
- `confluence_email`: `z.string().email()` — invalid message: "Bitte eine gültige E-Mail-Adresse eingeben."
- `confluence_api_token`: `z.string().min(1)` — invalid message: "API-Token darf nicht leer sein."
- `confluence_space_key`: `z.string().min(1)` — invalid message: "Space-Key darf nicht leer sein."
- `confluence_parent_page_id`: `z.string().min(1)` — invalid message: "Parent Page ID darf nicht leer sein."
- `sales_notification_email`: `z.string().email()` — invalid message: "Bitte eine gültige E-Mail-Adresse eingeben."
- Validation errors are field-level; all failing fields are reported in a single pass (use `z.object().safeParse()`)

**Test connection endpoint `GET /api/confluence?action=test`**
- Route Handler at `app/api/confluence/route.ts`; handles the `action=test` query parameter on the `GET` method
- Checks for a valid Supabase Auth session via the server client; returns HTTP 401 with `{ success: false, message: 'Nicht authentifiziert.' }` if no session
- Reads credentials using the same DB-first / env-fallback chain already defined in `lib/confluence/client.ts` — does not duplicate credential resolution logic
- Makes a lightweight Confluence REST call (`GET /wiki/rest/api/user/current`) using HTTP Basic auth (Base64 of `email:token`) to verify credentials
- Returns `{ success: true, message: 'Verbindung erfolgreich.' }` on HTTP 200 from Confluence
- Returns `{ success: false, message: 'Verbindung fehlgeschlagen: <Confluence-Statuscode>' }` on any non-200 response or network error; never exposes raw credentials in the response body

**`beschreibung` values stored in `einstellungen`**
- `confluence_base_url`: "Basis-URL der Confluence-Instanz (z.B. https://firma.atlassian.net)"
- `confluence_email`: "E-Mail-Adresse des Confluence-API-Nutzers"
- `confluence_api_token`: "Confluence API-Token (verschlüsselt gespeichert)"
- `confluence_space_key`: "Space-Key in Confluence für Leads (z.B. LEADS)"
- `confluence_parent_page_id`: "ID der übergeordneten Seite für neue Lead-Pages"
- `sales_notification_email`: "E-Mail-Adresse für Vertriebs-Benachrichtigungen bei neuen Leads"

**Design**
- Two `Card` components from `components/ui/Card.tsx` separating Confluence fields from the email field
- `Button` from `components/ui/Button.tsx` for both the save and test actions; primary variant for save, secondary/outline variant for test
- Tailwind utility classes and design tokens only — no custom CSS; use `colors.primary.hex` (#abd5f4) for focus rings and the save button; use `colors.border.divider` (#e5e5e5) for card borders
- Input labels use `colors.text.heading` (#333333); helper/description text below each input uses `colors.text.muted` (#999999) and renders the `beschreibung` string for that field
- Page heading "Einstellungen" as an `h1`, card section headings as `h2`; font family Nunito Sans (body) from design tokens
- Success badge: green background with white text; error badge: red background with white text; both rendered inline below the relevant action button

## Existing Code to Leverage

**`lib/supabase/server.ts`**
- Service role Supabase client already specified in the admin authentication spec
- Use for all server-side reads (page load) and writes (Server Action, test endpoint auth check)

**`lib/confluence/client.ts`**
- Contains the DB-first / env-fallback credential resolution logic that the test endpoint must reuse without duplication
- Any changes to how credentials are resolved should happen only in this file

**`app/admin/layout.tsx` auth guard**
- All routes under `/admin` are already protected; no additional session check is needed in the page component itself
- The Server Action and API route must each independently verify the session since they are called outside the layout boundary

**`components/ui/Button.tsx` and `components/ui/Card.tsx`**
- Planned UI atoms that all admin pages use; use them as-is without creating one-off styled wrappers
- Follow the same prop patterns established in other admin pages (e.g., `variant`, `isLoading`, `onClick`)

**`design-tokens/tokens.json`**
- Source of truth for all colors, typography, and spacing; reference token values directly rather than hard-coding hex values in Tailwind classes where token-based classes are available

## Out of Scope
- Encryption implementation of `confluence_api_token` (deferred; TODO comment only)
- Audit log or change history for credential updates
- `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, or `UNSPLASH_ACCESS_KEY` management (environment variables only)
- Supabase connection string or key management
- Multi-user permission levels or role-based access to the settings page
- Email sending from the settings page (Resend integration is a separate spec)
- Any public-facing routes or SEO concerns
- Inline editing of `beschreibung` values by the admin
- Bulk import or export of settings
