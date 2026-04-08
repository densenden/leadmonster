# Task Breakdown: Product Creation & Configuration Admin UI

## Overview
Total Tasks: 4 groups, 26 sub-tasks

## Task List

---

### TypeScript & Data Layer

#### Task Group 1: Types, Zod Schema, and Supabase Integration
**Dependencies:** None — foundational types that all other groups depend on

- [x] 1.0 Complete types and schema layer
  - [x] 1.1 Write 2-5 focused tests for the Zod schema
    - Test: valid full payload passes validation
    - Test: missing required fields (`name`, `slug`, `typ`) are rejected
    - Test: `slug` with uppercase or spaces is rejected (regex check)
    - Test: `status` field is optional (create mode) and accepts valid enum values
    - Test: `argumente` accepts arbitrary `Record<string, string>` and rejects non-string values
    - File: `__tests__/api/admin/produkte-schema.test.ts`
  - [x] 1.2 Define `ProduktWithConfig` combined type in `lib/supabase/types.ts`
    - Extend or compose from Supabase-generated `produkte` and `produkt_config` row types
    - Export as `ProduktWithConfig` — used as `initialData` prop type in `ProduktForm`
    - Export `ProduktTyp`, `Fokus`, `Status` as union type aliases for all enum fields
    - Use `interface` for object shapes; `type` for unions per coding-style standard
  - [x] 1.3 Define the Zod validation schema in `lib/validations/produkt.ts`
    - Implement the schema exactly as specified in the spec:
      ```
      name: z.string().min(2).max(100)
      slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/)
      typ: z.enum(['sterbegeld', 'pflege', 'leben', 'unfall'])
      status: z.enum(['entwurf', 'aktiv', 'archiviert']).optional()
      zielgruppe: z.array(z.string()).optional()
      fokus: z.enum(['sicherheit', 'preis', 'sofortschutz']).optional()
      anbieter: z.array(z.string().min(1)).optional()
      argumente: z.record(z.string()).optional()
      ```
    - Export inferred TypeScript type: `export type ProduktFormValues = z.infer<typeof produktSchema>`
    - Export a separate `produktUpdateSchema` that extends the base with a required `id: z.string().uuid()` field for PATCH
  - [x] 1.4 Verify tests from 1.1 pass
    - Run ONLY `__tests__/api/admin/produkte-schema.test.ts`
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- All 2-5 schema tests pass
- `ProduktWithConfig` type correctly combines both table shapes
- Zod schema matches the spec exactly; inferred TypeScript types are used downstream
- `produktUpdateSchema` includes `id` for PATCH validation

---

### API Layer

#### Task Group 2: REST API Route
**Dependencies:** Task Group 1 (Zod schema and types)

- [x] 2.0 Complete the API route
  - [x] 2.1 Write 3-6 focused tests for the API route
    - Test: POST with valid body creates product and returns `201` with `{ data: { id } }`
    - Test: POST with duplicate slug returns `409` with `{ error: { code: 'SLUG_EXISTS' } }`
    - Test: POST without auth session returns `401`
    - Test: PATCH with valid body updates product and returns `200` with `{ data: { id } }`
    - Test: POST with invalid body (missing `name`) returns `400` with field-level error details
    - Mock Supabase service role client for all tests; do not hit the real DB
    - File: `__tests__/api/admin/produkte-route.test.ts`
  - [x] 2.2 Create `app/api/admin/produkte/route.ts`
    - Import Zod schemas from `lib/validations/produkt.ts`
    - Import service role client from `lib/supabase/server.ts`
  - [x] 2.3 Implement auth guard at the top of both handlers
    - Call `createServerClient()` from `lib/supabase/server.ts`
    - Read session from cookie via `supabase.auth.getSession()`
    - Return `Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })` if no session
    - Guard applies to both POST and PATCH before any DB access
  - [x] 2.4 Implement POST handler
    - Parse and validate body with `produktSchema.safeParse()`; on failure return `400` with `{ data: null, error: { code: 'VALIDATION_ERROR', details: [...] } }`
    - Check slug uniqueness: query `produkte` table for existing row with same `slug`; return `409` with `{ data: null, error: { code: 'SLUG_EXISTS' } }` if found
    - Sequential DB writes:
      1. Insert into `produkte` (`name`, `slug`, `typ`, `status` defaulting to `'entwurf'`) — capture returned `id`
      2. Insert into `produkt_config` (`produkt_id`, `zielgruppe`, `fokus`, `anbieter`, `argumente`) using the captured `id`
    - On success return `Response.json({ data: { id }, error: null }, { status: 201 })`
    - Catch all DB errors; map to `{ data: null, error: { code: 'DB_ERROR' } }` with status `500`; never expose raw Supabase error text
  - [x] 2.5 Implement PATCH handler
    - Parse and validate body with `produktUpdateSchema.safeParse()`; on failure return `400`
    - Update `produkte` row by `id` (fields: `name`, `slug`, `typ`, `status`, `updated_at: new Date().toISOString()`)
    - Upsert `produkt_config` row using `onConflict: 'produkt_id'` (fields: `zielgruppe`, `fokus`, `anbieter`, `argumente`)
    - On success return `Response.json({ data: { id }, error: null }, { status: 200 })`
    - Map all DB errors to safe envelopes as in POST handler
  - [x] 2.6 Verify API route tests from 2.1 pass
    - Run ONLY `__tests__/api/admin/produkte-route.test.ts`
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- All 3-6 API route tests pass
- POST returns `201`, PATCH returns `200` with `{ data: { id } }` envelope
- Unauthenticated requests receive `401`
- Duplicate slug returns `409` with `SLUG_EXISTS` error code
- No raw Supabase error messages reach the client
- Sequential writes: `produkte` inserted before `produkt_config`

---

### Frontend Components

#### Task Group 3: Admin UI Components and Pages
**Dependencies:** Task Group 1 (types), Task Group 2 (API route to call)

- [x] 3.0 Complete all admin UI components and pages
  - [x] 3.1 Write 3-6 focused tests for the frontend components
    - Test: `ProduktForm` renders all fields in create mode with empty values
    - Test: Slug auto-populates from name input when slug is pristine
    - Test: Slug auto-population stops once user has manually edited the slug field
    - Test: Submitting the form with missing required fields shows inline German error messages
    - Test: Submit button is disabled with loading state while request is in flight
    - Test: `Badge` component renders correct color variant for each status value
    - Framework: Vitest + React Testing Library
    - File: `__tests__/components/admin/ProduktForm.test.tsx`
  - [x] 3.2 Build `components/ui/Badge.tsx`
    - Props: `variant: 'neutral' | 'success' | 'danger'`, `children: React.ReactNode`
    - Tailwind classes per variant:
      - `neutral`: gray background (map to design token equivalent)
      - `success`: green background
      - `danger`: red background
    - Border radius `0px` per `design-tokens/tokens.json`
    - Use absolute import path `@/components/ui/Badge`
  - [x] 3.3 Build `components/admin/ProduktForm.tsx`
    - Mark as `'use client'` at top of file
    - Props interface: `mode: 'create' | 'edit'`, `initialData?: ProduktWithConfig`
    - Internal state via `useState` for all field values, slug pristine flag, loading state, and field-level errors
    - **Produktname field**: text input, `required`; on change, if slug is pristine, run slug auto-generation: `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`
    - **URL-Slug field**: text input, `required`; on manual change, set `slugPristine = false` to stop auto-population; show preview `/{slug}` in muted text below input using a `<p>` with `text-sm text-gray-500`; validate uniqueness on `blur` by checking if slug already exists (optional: local state flag or deferred to server `409` response)
    - **Produkttyp select**: options `sterbegeld` / `pflege` / `leben` / `unfall` with German labels "Sterbegeldversicherung", "Pflegeversicherung", "Lebensversicherung", "Unfallversicherung"; `required`
    - **Zielgruppe checkboxes**: multi-select; options `senioren_50plus` / `familien` / `alleinstehende` / `paare` / `berufstaetige` with German labels "Senioren 50+", "Familien", "Alleinstehende", "Paare", "Berufstätige"; stored as `string[]`
    - **Vertriebsfokus radio group**: options `sicherheit` / `preis` / `sofortschutz` with labels "Sicherheit & Verlässlichkeit", "Bester Preis", "Sofortschutz"; `required`
    - **Anbieter tag input**: text input + "Enter to add" logic; renders each entry as a pill with a `×` remove button; stored as `string[]`; minimum 1 character per entry
    - **Verkaufsargumente key-value editor**: dynamic list of `{ key: string, value: string }` rows; "Zeile hinzufügen" button appends a new empty row; each row has a `×` remove button; serialised to `Record<string, string>` on submit
    - **Status select** (edit mode only, `mode === 'edit'`): options `entwurf` / `aktiv` / `archiviert` with German labels "Entwurf", "Aktiv", "Archiviert"
    - **Submit handler**: call POST `/api/admin/produkte` (create) or PATCH `/api/admin/produkte` (edit) with JSON body; set loading state `true` before fetch, `false` after; on `201`/`200` call `router.push('/admin/produkte/' + id)` via `useRouter`; on `409` set slug field error "Dieser URL-Slug ist bereits vergeben."; on other errors set a global form error message in German
    - **Submit button**: label "Produkt speichern" (create) / "Änderungen speichern" (edit); `disabled` and shows spinner text while loading
    - Inline field-level error messages rendered as `<p className="text-sm text-red-600 mt-1">` below each field
    - All styling via Tailwind only; no custom CSS files; max-width `max-w-2xl` container; single-column layout
    - Focus ring: `focus:ring-2 focus:ring-[#abd5f4]` per spec brand color
    - Input border radius: `rounded-none` per design token `borders.radius = 0px`
    - Font classes: apply Nunito Sans (`font-sans`) for body text, Roboto for headings — inherits from root layout; no per-component font loading
  - [x] 3.4 Build `app/admin/produkte/page.tsx` (product list)
    - Server Component — no `'use client'`
    - Fetch all rows from `produkte` table using service role client from `lib/supabase/server.ts`; order by `created_at DESC`
    - Page header: `<h1>` "Produkte" with "Neues Produkt" link button to `/admin/produkte/neu`
    - Render data as an HTML `<table>` with columns: Name, Typ, Status, Erstellt am, Aktionen
    - Status column: render `<Badge>` component with correct `variant` per status value
    - "Erstellt am" column: format `created_at` as `DD.MM.YYYY` using `toLocaleDateString('de-DE')`
    - Aktionen column: two links — "Bearbeiten" → `/admin/produkte/[id]`, "Content" → `/admin/produkte/[id]/content`
    - Empty state: if no rows, render `<p>` "Noch keine Produkte angelegt. Erstellen Sie Ihr erstes Produkt."
    - Auth guard inherited from `app/admin/layout.tsx` — no additional session check needed here
  - [x] 3.5 Build `app/admin/produkte/neu/page.tsx` (new product page)
    - Server Component
    - Renders `<ProduktForm mode="create" />` with no `initialData`
    - Page heading: `<h1>` "Neues Produkt anlegen"
    - No data fetching required
    - Redirect on successful form save is handled inside `ProduktForm` via `useRouter`
  - [x] 3.6 Build `app/admin/produkte/[id]/page.tsx` (edit product page)
    - Server Component
    - Fetch `produkte` row by `params.id` using service role client
    - Fetch corresponding `produkt_config` row by `produkt_id = params.id`
    - Call `notFound()` from `next/navigation` if `produkte` row is null or not found
    - Compose fetched data into `ProduktWithConfig` shape and pass as `initialData` to `<ProduktForm mode="edit" initialData={...} />`
    - Page heading: `<h1>` "Produkt bearbeiten: {produkt.name}"
  - [x] 3.7 Verify UI tests from 3.1 pass
    - Run ONLY `__tests__/components/admin/ProduktForm.test.tsx`
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- All 3-6 component tests pass
- `ProduktForm` renders correctly in both create and edit mode with correct field visibility
- Slug auto-generation works and stops on manual edit; preview renders below input
- Tag input and key-value editor add and remove entries correctly
- Submit button shows loading state and is disabled during in-flight requests
- `409 SLUG_EXISTS` response surfaces a German inline slug error
- Product list page displays table with correct Badge variants and formatted dates
- Empty state message displays when no products exist
- Edit page calls `notFound()` for unknown IDs
- All styling uses Tailwind only; `rounded-none`; focus ring uses `#abd5f4`

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1, 2, and 3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review all tests written in Task Groups 1-3
    - Review 2-5 schema tests from Task 1.1 (`produkte-schema.test.ts`)
    - Review 3-6 API route tests from Task 2.1 (`produkte-route.test.ts`)
    - Review 3-6 component tests from Task 3.1 (`ProduktForm.test.tsx`)
    - Total existing tests: approximately 8-17 tests
  - [x] 4.2 Identify critical gaps for THIS feature only
    - Focus exclusively on the product creation and edit admin UI workflows
    - Identify any untested critical paths: end-to-end create flow, end-to-end edit flow, PATCH upsert on `produkt_config`
    - Do NOT assess coverage of unrelated parts of the application
    - Skip edge cases, error boundary exhaustion, and accessibility testing unless business-critical
  - [x] 4.3 Write up to 8 additional strategic tests maximum
    - Priority gaps to fill if not already covered:
      - Integration: full create flow from form submit → API POST → DB insert mock → redirect
      - Integration: full edit flow from form load → field change → API PATCH → DB upsert mock → redirect
      - API: PATCH `produkt_config` correctly uses upsert-on-conflict, not a plain insert
      - Component: Anbieter tag input prevents adding empty strings
      - Component: Key-value editor serialises rows to `Record<string, string>` correctly before submit
    - Add tests only where a genuine critical gap exists; do not write tests to reach a coverage number
    - File: `__tests__/api/admin/produkte-integration.test.ts` and/or additions to existing test files
  - [x] 4.4 Run all feature-specific tests
    - Run ONLY tests in `__tests__/api/admin/` and `__tests__/components/admin/`
    - Expected total: approximately 16-25 tests
    - Do NOT run the entire application test suite
    - All tests must pass before this task group is marked complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 16-25 tests total)
- Critical create and edit workflows are covered end-to-end with mocked DB
- No more than 8 additional tests added in gap analysis
- Test scope is limited exclusively to this spec's admin UI feature

---

## Execution Order

Recommended implementation sequence based on dependencies:

1. **Task Group 1** — Types, Zod Schema (`lib/supabase/types.ts`, `lib/validations/produkt.ts`)
2. **Task Group 2** — API Route (`app/api/admin/produkte/route.ts`)
3. **Task Group 3** — UI Components and Pages (`components/ui/Badge.tsx`, `components/admin/ProduktForm.tsx`, three page files)
4. **Task Group 4** — Test Review and Gap Analysis

Task Group 3 may begin `Badge.tsx` and `ProduktForm.tsx` component scaffolding in parallel with Task Group 2 since types from Task Group 1 are sufficient to start. However, submit handler wiring in `ProduktForm` should only be completed once the API route from Task Group 2 is finalised.
