# Task Breakdown: Content Preview & Manual Editing

## Overview
Total Tasks: 4 groups, 26 sub-tasks

## Task List

---

### API Layer

#### Task Group 1: PATCH API Route with Zod Validation
**Dependencies:** None — `lib/supabase/server.ts` (service role client) already exists

- [x] 1.0 Complete the PATCH API route for content editing
  - [x] 1.1 Write 2–4 focused tests for the PATCH route
    - Test: valid PATCH body returns 200 and the updated row
    - Test: `meta_title` > 60 chars returns 422 with a field-level error
    - Test: `meta_desc` > 160 chars returns 422 with a field-level error
    - Test: unknown `id` returns 404
    - Mock Supabase service-role client — do not hit the real DB in tests
  - [x] 1.2 Create `app/api/admin/content/[id]/route.ts`
    - Export only `PATCH` handler (GET is handled by the Server Component via direct DB call)
    - Parse and validate request body with the Zod schema:
      ```ts
      z.object({
        title:        z.string().min(1).optional(),
        meta_title:   z.string().max(60).optional(),
        meta_desc:    z.string().max(160).optional(),
        content:      z.record(z.unknown()).optional(),
        status:       z.enum(['entwurf', 'review', 'publiziert']).optional(),
        published_at: z.string().datetime().nullable().optional(),
      })
      ```
    - Return 422 with field-level error details on Zod failure (follow `{ data: null, error: { code, message, details } }` response shape from API standards)
    - Use service-role Supabase client from `lib/supabase/server.ts` — never the anon client
    - On `status === 'publiziert'` and no explicit `published_at` provided: set `published_at = new Date().toISOString()` automatically
    - Return 404 when `id` does not match any row
    - Return 200 with `{ data: updatedRow, error: null }` on success
    - Auth guard: verify Supabase session exists; return 401 if not (consistent with admin layout guard)
  - [x] 1.3 Ensure API tests pass
    - Run only the tests written in 1.1
    - Do NOT run the full test suite at this stage

**Acceptance Criteria:**
- The 2–4 tests written in 1.1 pass
- PATCH with valid body updates the DB row and returns the updated record
- `meta_title` and `meta_desc` length limits are enforced server-side with 422 and field details
- `published_at` is set automatically when advancing to `publiziert`
- Unauthenticated requests return 401

---

### Server Component — Content Management Page

#### Task Group 2: Content Management Page (Server Component)
**Dependencies:** Task Group 1 (API route path is referenced in child components)

- [x] 2.0 Complete the content management Server Component page
  - [x] 2.1 Write 2–3 focused tests for the page data-fetching logic
    - Test: page renders "Noch kein Content generiert" + "Content generieren" button when no rows are found for `produkt_id`
    - Test: page groups returned rows by `page_type` and renders one tab/accordion section per unique type
    - Test: `ratgeber` page_type with multiple rows renders all rows within the same group
    - Use Vitest with mocked Supabase server client
  - [x] 2.2 Implement `app/admin/produkte/[id]/content/page.tsx`
    - Server Component — no `'use client'` directive
    - Fetch all `generierter_content` rows for the `produkt_id` param via service-role client from `lib/supabase/server.ts`
    - Group rows by `page_type` in this order: `hauptseite`, `faq`, `vergleich`, `tarif`, `ratgeber`
    - If no rows exist: render empty state with "Noch kein Content generiert" message and a "Content generieren" button that POSTs to `/api/generate` with `{ produktId }`
    - For each `page_type` group, render a tab or accordion section containing:
      - Status badge (color-coded pill: gray=entwurf, yellow=review, green=publiziert) from `components/ui/Badge.tsx`
      - "Generiert am: {DD.MM.YYYY HH:mm}" in small muted text (German locale)
      - "Veröffentlicht am: {DD.MM.YYYY HH:mm}" if `published_at` is set, otherwise "Noch nicht veröffentlicht"
      - `<ContentPreview>` Client Component (Task Group 3) for each row in the group
    - `ratgeber` group: render all matching rows stacked vertically within the section, each with its own `<ContentPreview>`
    - Reuse the admin Tailwind token styles consistent with `app/admin/produkte/page.tsx`
    - Tab/accordion navigation must be keyboard-accessible (use semantic `<button>` or `<details>`/`<summary>` elements)
  - [x] 2.3 Format and display timestamps correctly
    - Helper: `formatGermanDateTime(isoString: string): string` in `lib/utils/date.ts`
    - Format: `DD.MM.YYYY HH:mm` using `de-DE` locale via `Intl.DateTimeFormat`
    - Export and reuse this helper across admin pages
  - [x] 2.4 Ensure page tests pass
    - Run only the tests written in 2.1

**Acceptance Criteria:**
- The 2–3 tests written in 2.1 pass
- Empty state renders correctly when no content exists
- All `page_type` groups appear in the correct order
- Multiple `ratgeber` rows each receive their own editor panel
- Timestamps display in German locale format
- Page is a Server Component with no client-side data fetching

---

### Frontend Components

#### Task Group 3: ContentPreview Client Component
**Dependencies:** Task Group 1 (calls PATCH API), Task Group 2 (page renders this component)

- [x] 3.0 Complete the ContentPreview Client Component and all sub-components
  - [x] 3.1 Write 3–5 focused tests for ContentPreview
    - Test: component renders the left preview column and right editor column
    - Test: editing `meta_title` beyond 60 chars turns the counter and border red
    - Test: editing `meta_desc` beyond 160 chars turns the counter and border red
    - Test: "Speichern" button is disabled when there are no unsaved changes (clean state)
    - Test: clicking "Regenerieren" with a dirty form shows the "Nicht gespeicherte Änderungen gehen verloren" warning before calling the generate API
    - Use Vitest + React Testing Library; mock `fetch` for PATCH and POST calls
  - [x] 3.2 Create `components/admin/ContentPreview.tsx`
    - `'use client'` directive — this is a fully interactive Client Component
    - Props interface:
      ```ts
      interface ContentPreviewProps {
        row: GenerierterContent   // full DB row type from Supabase types
        produktId: string
      }
      ```
    - Use `useState` for all editable field values; initialise from `row` prop
    - Track dirty state: `isDirty = current values !== initial values`
    - Two-column layout: `grid grid-cols-1 lg:grid-cols-2 gap-6`; left = preview (read-only), right = editor
    - Left column: renders content JSON sections using existing `components/sections/` components (Hero, FeatureGrid, FAQ, etc.) in read-only mode; wrap in `pointer-events-none select-none` to prevent interaction
    - Right column: editable fields described in 3.3 and 3.4
  - [x] 3.3 Implement editable metadata fields (right column, top)
    - `title` — standard `<input type="text">` with label "Seitentitel"
    - `meta_title` — `<input type="text">` with label "Meta-Titel" and live character counter (see 3.5)
    - `meta_desc` — `<textarea>` with label "Meta-Beschreibung" and live character counter (see 3.5)
    - All inputs are controlled components; update local state `onChange`
  - [x] 3.4 Implement per-section content editors (right column, below metadata)
    - Iterate over `content.sections` array from the row's JSONB field
    - Render appropriate inputs per section `type`:
      - `hero`: text inputs for `headline` and `subline`
      - `features`: for each item in `items[]`, text inputs for `title` and `text`
      - `faq`: for each item in `items[]`, text inputs for `frage` and `antwort`
      - Other section types: render a labeled `<textarea>` for each string-valued key in the object
    - Changes update the nested `content` object in local state
    - Section editors are grouped under a collapsible `<details>` element labelled by section type for visual clarity
  - [x] 3.5 Implement character counters for `meta_title` and `meta_desc`
    - Display as `"{count} / {limit} Zeichen"` below each field
    - Color thresholds (apply to both counter text and field border):
      - 0–80% of limit: default gray (`text-gray-400`)
      - >80% and <=100%: orange (`text-orange-500 border-orange-500`)
      - >100%: red (`text-red-600 border-red-600`)
    - `meta_title` limit: 60; `meta_desc` limit: 160
    - Extract as a reusable `<CharacterCounter>` sub-component inside the same file or in `components/ui/`
  - [x] 3.6 Implement "Speichern" button and PATCH call
    - Button label: "Speichern"; show unsaved indicator ("Ungespeicherte Änderungen") when `isDirty === true`
    - On click: `fetch('PATCH /api/admin/content/{id}', body)` with `{ title, meta_title, meta_desc, content }`
    - Loading state: disable button, show spinner during request
    - On success: reset dirty state to `false`; update local `initial` snapshot to saved values
    - On API error: display inline error message below the button using the `error.details` array from the response; do not clear the form
    - Do not combine status changes into this save call (status is a separate action per spec)
  - [x] 3.7 Implement status toggle
    - Status pill rendered prominently above the editor columns
    - Forward-only button: if current status is `entwurf` show "Weiter zu Review", if `review` show "Publizieren"
    - Back-navigation: small dropdown `<select>` next to the pill allows selecting any status (for corrections)
    - On status advance: PATCH `/api/admin/content/{id}` with `{ status: nextStatus }` (and `published_at: null` unless advancing to `publiziert`, in which case omit `published_at` and let the API set it)
    - On success: update the displayed status badge in both the ContentPreview and the parent page without a full page reload (use `router.refresh()` from `next/navigation` to revalidate Server Component data)
  - [x] 3.8 Implement "Regenerieren" button
    - One button per ContentPreview instance (i.e. per page_type row)
    - If `isDirty === true`: show a `window.confirm()` dialog (or inline warning banner) with text "Nicht gespeicherte Änderungen gehen verloren. Trotzdem regenerieren?"
    - On confirm (or if not dirty): POST to `/api/generate` with `{ produktId, pageType: row.page_type }`
    - Show spinner and disable all editing controls during generation (can take 5–15s)
    - On success: call `router.refresh()` to reload the Server Component and surface new content in the preview and editor; re-initialise local state from new `row` prop via `useEffect` watching `row.id`
    - On error: display inline error message; restore editing controls
  - [x] 3.9 Ensure ContentPreview tests pass
    - Run only the tests written in 3.1

**Acceptance Criteria:**
- The 3–5 tests written in 3.1 pass
- Two-column layout renders on desktop; stacks vertically on mobile
- Character counters reflect gray/orange/red thresholds at the correct percentages
- Dirty state indicator appears when any field is changed and clears after a successful save
- "Speichern" PATCH call uses only content/metadata fields, not status
- Status toggle PATCH call is independent of the save action
- "Regenerieren" with dirty state shows a confirmation before proceeding
- `router.refresh()` is called after successful save, status change, and regeneration

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1–3

- [x] 4.0 Review existing tests and fill critical gaps
  - [x] 4.1 Review all tests written in groups 1–3
    - API tests from Task 1.1 (2–4 tests)
    - Page data-fetching tests from Task 2.1 (2–3 tests)
    - ContentPreview component tests from Task 3.1 (3–5 tests)
    - Total existing: approximately 7–12 tests
  - [x] 4.2 Identify critical gaps for this feature only
    - Check the end-to-end editorial workflow: create content → edit fields → save → advance status → verify publiziert sets `published_at`
    - Check the regenerate flow: dirty state warning appears → confirm → spinner shows → refresh occurs
    - Check the empty-state flow: no content rows → "Content generieren" button is present and functional
    - Do NOT assess coverage of unrelated admin pages or public routes
  - [x] 4.3 Write up to 8 additional strategic tests to close critical gaps
    - Maximum 8 new tests — focus on integration points between groups
    - Suggested targets if gaps exist:
      - End-to-end: edit `meta_title` to exactly 60 chars → save → API receives correct value → row updated
      - Status advance from `review` → `publiziert` → verify `published_at` is populated in the DB response
      - `ratgeber` page with 2 rows renders 2 independent `ContentPreview` instances (no shared state)
      - PATCH route rejects an unauthenticated request with 401
    - Skip: performance tests, full accessibility audits, exhaustive section-type rendering tests
  - [x] 4.4 Run only feature-specific tests
    - Run tests from 1.1, 2.1, 3.1, and 4.3 only
    - Expected total: approximately 15–20 tests
    - Do NOT run the entire application test suite

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 15–20 tests)
- The complete editorial workflow (edit → save → advance status → publiziert) is covered by at least one integration test
- No more than 8 additional tests added in this group
- Test scope is limited exclusively to this spec's feature

---

## Execution Order

Recommended implementation sequence:

1. **API Layer** (Task Group 1) — build and validate the PATCH route first so the Client Component has a stable contract to call
2. **Server Component** (Task Group 2) — implement the content management page that fetches and organises data; passes rows to `<ContentPreview>`
3. **Frontend Components** (Task Group 3) — implement `ContentPreview` with all interactive behaviour against the live API route
4. **Test Review** (Task Group 4) — review all written tests, fill critical integration gaps, verify the full editorial workflow end-to-end
