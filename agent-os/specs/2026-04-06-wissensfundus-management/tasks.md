# Task Breakdown: Wissensfundus Management

## Overview
Total Tasks: 4 task groups, 26 sub-tasks

## Task List

---

### Foundation: TypeScript Types and Zod Schema

#### Task Group 1: Types and Validation Schema
**Dependencies:** None — all other groups depend on these definitions

- [x] 1.0 Complete shared type and validation foundation
  - [x] 1.1 Write 2-4 focused tests for the Zod schema
    - Test `kategorie` enum rejects values outside the five allowed options
    - Test `thema` min(3) and max(120) boundaries
    - Test `inhalt` min(20) boundary
    - Test `tags` array splitting: comma-separated string parsed to array, empty strings filtered, max 10 enforced
  - [x] 1.2 Define `Wissensfundus` interface in `lib/supabase/types.ts`
    - Fields: `id: string`, `kategorie: string`, `thema: string`, `inhalt: string`, `tags: string[]`, `created_at?: string`
    - Export as named interface; no `any` types
    - Ensure field names exactly match the `wissensfundus` Supabase table columns from CLAUDE.md
  - [x] 1.3 Define `WissensfundusFormData` type for form inputs (pre-submission shape)
    - `kategorie: 'sterbegeld' | 'pflege' | 'leben' | 'unfall' | 'allgemein'`
    - `thema: string`
    - `inhalt: string`
    - `tags: string` — comma-separated string as the user types it; converted to `string[]` before server action call
  - [x] 1.4 Define `ActionResult` return type for server actions
    - `{ success: boolean, error?: string, fieldErrors?: Record<string, string[]> }`
    - Place in `lib/supabase/types.ts` alongside the `Wissensfundus` interface
  - [x] 1.5 Create Zod validation schema in `lib/validation/wissensfundus.ts`
    - `kategorie`: `z.enum(['sterbegeld', 'pflege', 'leben', 'unfall', 'allgemein'])`
    - `thema`: `z.string().min(3).max(120)`
    - `inhalt`: `z.string().min(20)`
    - `tags`: `z.array(z.string().min(1)).max(10)` — input arrives as comma-separated string; transform with `.transform()` or split before parse
    - Export schema and inferred type `WissensfundusSchema`
    - This single schema is imported by both server actions (server-side enforcement) and the Client Component (client-side UX mirroring)
  - [x] 1.6 Ensure type and schema tests pass
    - Run only the 2-4 tests written in 1.1
    - Confirm TypeScript strict mode: `tsc --noEmit` produces no errors on the new files

**Acceptance Criteria:**
- The 2-4 tests written in 1.1 pass
- `Wissensfundus`, `WissensfundusFormData`, and `ActionResult` are exported from `lib/supabase/types.ts`
- Zod schema lives in `lib/validation/wissensfundus.ts` and is importable in both server and client contexts
- No `any` types; TypeScript strict mode passes

---

### Backend: Server Actions

#### Task Group 2: CRUD Server Actions and AI Read-Path
**Dependencies:** Task Group 1 (types and schema)

- [x] 2.0 Complete server action layer and AI read-path
  - [x] 2.1 Write 3-6 focused tests for server actions and the AI read-path
    - Test `createArtikel` returns `{ success: false, fieldErrors }` when Zod validation fails (e.g., `thema` too short)
    - Test `createArtikel` returns `{ success: true }` on valid input (mock Supabase service-role client)
    - Test `deleteArtikel` calls Supabase `.delete()` with correct `id` filter
    - Test `updateArtikel` merges updated fields and calls `.update()` with correct `id`
    - Test AI read-path helper returns a non-empty Markdown block when rows exist and returns an empty string (no throw) when rows are absent
  - [x] 2.2 Create `app/admin/wissensfundus/actions.ts`
    - Mark file with `'use server'` directive at the top
    - Import Supabase service-role client from `lib/supabase/server.ts` — never use the browser/anon client
    - Import `Wissensfundus`, `ActionResult` types from `lib/supabase/types.ts`
    - Import Zod schema from `lib/validation/wissensfundus.ts`
    - Implement session guard at the top of every mutating action:
      - Call `supabase.auth.getUser()` server-side
      - If no session, return `{ success: false, error: 'Nicht autorisiert' }` without executing any DB mutation
      - This guards against direct POST attacks even though the layout also redirects
  - [x] 2.3 Implement `createArtikel(formData: FormData): Promise<ActionResult>`
    - Parse raw `FormData` fields; split `tags` string on commas, filter empty strings
    - Validate parsed data against the Zod schema; on failure return `{ success: false, fieldErrors: zodError.flatten().fieldErrors }`
    - Insert validated row into `wissensfundus` table via service-role client
    - On Supabase error, return `{ success: false, error: 'Datenbankfehler beim Erstellen' }`
    - On success, call `revalidatePath('/admin/wissensfundus')` then return `{ success: true }`
  - [x] 2.4 Implement `updateArtikel(id: string, formData: FormData): Promise<ActionResult>`
    - Same parse and validate steps as `createArtikel`
    - Update row with matching `id` in `wissensfundus` table
    - On success, call `revalidatePath('/admin/wissensfundus')` then return `{ success: true }`
    - Validate that `id` is a non-empty string before executing DB call; return error if missing
  - [x] 2.5 Implement `deleteArtikel(id: string): Promise<ActionResult>`
    - Validate `id` is a non-empty string
    - Delete row matching `id` from `wissensfundus` table
    - On success, call `revalidatePath('/admin/wissensfundus')` then return `{ success: true }`
    - On Supabase error, return `{ success: false, error: 'Datenbankfehler beim Löschen' }`
  - [x] 2.6 Implement AI generation read-path in `lib/anthropic/generator.ts`
    - Add helper function `fetchWissensfundusKontext(produktTyp: string): Promise<string>`
    - Query `wissensfundus` table using service-role client with filter: `kategorie IN [produktTyp, 'allgemein']`
    - Select only `thema` and `inhalt` columns — omit `id` and `tags` to keep context payloads lean
    - If the query returns an error or empty rows, log a `console.warn` and return an empty string (no throw; pipeline continues without context)
    - Format returned rows as a Markdown block:
      ```
      ## Wissensfundus-Kontext
      ### {thema}
      {inhalt}
      ```
    - Inject the returned string into the system prompt before calling Claude
  - [x] 2.7 Ensure server action and AI read-path tests pass
    - Run only the 3-6 tests written in 2.1
    - Confirm no TypeScript errors on `actions.ts` and the updated `generator.ts`

**Acceptance Criteria:**
- The 3-6 tests written in 2.1 pass
- All three server actions (`createArtikel`, `updateArtikel`, `deleteArtikel`) perform session validation before any DB mutation
- All actions use the service-role Supabase client exclusively
- `revalidatePath` is called after every successful mutation
- Return type is always `ActionResult` — never throws to the client
- AI read-path gracefully handles empty results without throwing

---

### Frontend: Admin UI Components

#### Task Group 3: List Page and WissensfundusForm Component
**Dependencies:** Task Group 1 (types), Task Group 2 (server actions)

- [x] 3.0 Complete admin UI for the wissensfundus feature
  - [x] 3.1 Write 3-5 focused tests for frontend components
    - Test `WissensfundusForm` renders all four fields (`kategorie` select, `thema` input, `inhalt` textarea, `tags` input)
    - Test `WissensfundusForm` displays a field-level error message when `fieldErrors` prop contains an entry for `thema`
    - Test delete confirmation row: clicking "Löschen" renders the inline confirmation; clicking "Abbrechen" hides it again
    - Test category filter tab updates the URL search param `?kategorie=` on selection (use Playwright or React Testing Library with router mock)
  - [x] 3.2 Build the article list page as a Server Component at `app/admin/wissensfundus/page.tsx`
    - Accept `searchParams: { kategorie?: string }` prop to read the active filter from the URL
    - Fetch all `wissensfundus` rows using the service-role Supabase client from `lib/supabase/server.ts`
    - Apply `kategorie` filter in the Supabase query if `searchParams.kategorie` is set; otherwise return all rows
    - Type the fetched rows as `Wissensfundus[]` (imported from `lib/supabase/types.ts`)
    - Render a category filter tab bar above the table with links that set `?kategorie=` in the URL:
      - Tabs: Alle | Sterbegeld | Pflege | Leben | Unfall | Allgemein
      - Active tab visually distinguished using Tailwind utility classes with Navy + Gold design token colors from `design-tokens/tokens.json`
    - Render the articles table with columns: `Kategorie`, `Thema`, `Inhalt (Vorschau)`, `Tags`, `Aktionen`
      - `Inhalt (Vorschau)`: truncate to 100 characters with trailing ellipsis
      - `Tags`: render each tag as a `<Badge>` pill using `components/ui/Badge.tsx`
      - `Aktionen`: "Bearbeiten" and "Löschen" per row — Löschen handled by the delete confirmation sub-component
    - Render empty state message "Keine Artikel in dieser Kategorie." when the filtered result is empty
    - Render a "Neuen Artikel anlegen" button linking to `/admin/wissensfundus/neu`; style with primary button Tailwind classes from design tokens
    - Follow the same column/row/badge structure as `components/admin/LeadTable.tsx` — do not introduce a new table pattern
  - [x] 3.3 Create delete confirmation sub-component (inline in the list row or extracted to `app/admin/wissensfundus/_components/DeleteConfirm.tsx`)
    - Client Component (`'use client'`) with local `useState` for confirmation visibility
    - Default state: shows "Löschen" button only
    - On "Löschen" click: renders inline prompt "Artikel wirklich löschen?" with "Bestätigen" and "Abbrechen" buttons
    - On "Bestätigen": calls `deleteArtikel(id)` server action; on returned error displays inline error text below the prompt
    - On "Abbrechen": resets to default state
    - No global state, no modal overlay — confirmation is scoped entirely within the row
  - [x] 3.4 Build the create page at `app/admin/wissensfundus/neu/page.tsx`
    - Server Component wrapper that renders `<WissensfundusForm>` with no initial data (create mode)
    - Page title: "Neuen Artikel anlegen"
  - [x] 3.5 Build the edit page at `app/admin/wissensfundus/[id]/page.tsx`
    - Server Component that fetches the existing row by `id` using the service-role client
    - If row not found, call `notFound()` from `next/navigation`
    - Renders `<WissensfundusForm artikel={row}>` with pre-filled values (edit mode)
    - Page title: "Artikel bearbeiten"
  - [x] 3.6 Create `components/admin/WissensfundusForm.tsx` as a Client Component
    - Props interface:
      - `artikel?: Wissensfundus` — present for edit mode, absent for create mode
      - `action: (formData: FormData) => Promise<ActionResult>` — receives either `createArtikel` or `updateArtikel` bound with the article id
    - Controlled inputs using `useState` for all four fields; initialize from `artikel` prop if present
    - `kategorie`: `<select>` with options `sterbegeld`, `pflege`, `leben`, `unfall`, `allgemein` — display labels in German (Sterbegeld, Pflege, Lebensversicherung, Unfall, Allgemein)
    - `thema`: `<input type="text">` with placeholder "Kurzes Thema-Label (min. 3 Zeichen)"
    - `inhalt`: `<textarea>` with character count display below (e.g. "342 Zeichen") and helper text "Markdown wird unterstützt"
    - `tags`: `<input type="text">` storing comma-separated value; placeholder "z.B. grundlagen, senioren, sofortschutz"
    - Client-side validation: run the imported Zod schema on form submit before calling the server action; set local `fieldErrors` state on failure to show inline error messages without a round trip
    - Server-side errors: if the server action returns `fieldErrors`, merge them into the local error state
    - Submit button label: "Speichern" (disabled with loading indicator while action is pending — use `useTransition`)
    - Cancel button: navigates back to `/admin/wissensfundus` using `useRouter().push()`
    - Inline field-level errors rendered below each input using a small red text element; no separate error summary
    - All inputs styled with `border rounded-lg focus:ring` Tailwind utilities consistent with the project design language from `design-tokens/tokens.json`
  - [x] 3.7 Ensure UI component tests pass
    - Run only the 3-5 tests written in 3.1
    - Verify `tsc --noEmit` passes for all new component files

**Acceptance Criteria:**
- The 3-5 tests written in 3.1 pass
- List page is a Server Component; category filter state lives in URL search params (no client-side state for filtering)
- `WissensfundusForm` is a Client Component; uses `useTransition` for pending state, Zod schema for client-side validation
- Delete confirmation is scoped to each row with local state — no global modal
- Create and edit pages route correctly to the shared form component
- All UI uses Tailwind utility classes driven by `design-tokens/tokens.json`; no hardcoded hex values
- `Badge` component from `components/ui/Badge.tsx` used for tag rendering
- Table structure matches `LeadTable.tsx` pattern (no new pattern introduced)

---

### Testing: Review and Gap Analysis

#### Task Group 4: Test Review and Critical Gap Coverage
**Dependencies:** Task Groups 1, 2, and 3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review all tests written in previous task groups
    - Review the 2-4 tests from Task 1.1 (Zod schema validation)
    - Review the 3-6 tests from Task 2.1 (server actions and AI read-path)
    - Review the 3-5 tests from Task 3.1 (list page, form component, delete confirmation)
    - Total existing tests: approximately 8-15 tests
  - [x] 4.2 Analyze gaps for this feature's critical user workflows only
    - Identify whether the end-to-end create flow (form submit -> server action -> DB insert -> list revalidation) is covered
    - Identify whether the edit flow (pre-fill -> change -> submit -> update) is covered
    - Identify whether the auth guard in server actions is covered (unauthenticated session returns error without DB call)
    - Do NOT assess broader application test coverage — scope is strictly this feature
  - [x] 4.3 Write up to 8 additional targeted tests to fill identified critical gaps
    - Prioritize integration-level tests that cross the form -> server action boundary
    - Add an end-to-end test (Playwright) covering the happy path: admin logs in, creates an article, sees it in the list — only if the create flow is not already covered by existing tests
    - Add a test verifying that the AI read-path context block contains the correct `thema` from a seeded DB row
    - Do NOT add exhaustive edge case, accessibility, or performance tests in this group
  - [x] 4.4 Run all feature-specific tests
    - Run only tests related to this spec (tests from 1.1, 2.1, 3.1, and 4.3)
    - Expected total: approximately 16-23 tests maximum
    - Do NOT run the entire application test suite
    - All tests must pass before marking this task group complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 16-23 tests total)
- The create and edit user workflows are covered at the integration level
- The server-action auth guard is tested
- No more than 8 additional tests added in this group
- Testing scope is strictly limited to the wissensfundus management feature

---

## Execution Order

Implement in strict dependency order:

1. **Task Group 1 — Types and Validation Schema**
   Produces `Wissensfundus`, `WissensfundusFormData`, `ActionResult` types and the shared Zod schema. Every subsequent group imports from here.

2. **Task Group 2 — Server Actions and AI Read-Path**
   Server actions depend on the types (Group 1). The AI read-path in `lib/anthropic/generator.ts` is standalone but also uses the service-role client pattern established here.

3. **Task Group 3 — List Page and WissensfundusForm**
   UI depends on types (Group 1) for prop interfaces and on server actions (Group 2) to wire form submission and delete calls.

4. **Task Group 4 — Test Review and Gap Analysis**
   Reviews and extends tests from all three prior groups; requires all implementation to be complete before gap analysis is meaningful.
