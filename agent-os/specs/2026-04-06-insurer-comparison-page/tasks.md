# Task Breakdown: Insurer Comparison Page

## Overview
Total Tasks: 4 task groups, 22 sub-tasks

## Task List

---

### SEO & Schema Layer

#### Task Group 1: Schema.org Generator for Vergleich
**Dependencies:** None — `lib/seo/schema.ts` must exist before the page can consume stored markup, and before content-generation tests can validate output shape.

- [x] 1.0 Extend `lib/seo/schema.ts` with vergleich schema generators
  - [x] 1.1 Write 2–4 focused unit tests for schema generator output
    - Test that `generateVergleichSchema` returns a valid `ItemList` wrapping one `Product` per insurer
    - Test that each `Product` item contains `name`, `description`, `offers.@type`, and `offers.category`
    - Test that the top-level wrapper includes a `BreadcrumbList` with exactly three entries: Startseite, {Produktname}, Vergleich
    - Mock the input data; do not call Supabase
  - [x] 1.2 Add `generateVergleichSchema` function to `lib/seo/schema.ts`
    - Input: `{ anbieter: string[]; produktName: string; produktTyp: string; produktSlug: string; criteria: { label: string; values: Record<string, string | boolean> }[] }`
    - Output: JSON-LD object containing `BreadcrumbList` (three entries) wrapping an `ItemList` of `Product` nodes
    - Each `Product`: `name` = insurer name, `description` = joined criterion labels where value is truthy, `offers.@type = "Offer"`, `offers.category` = produktTyp (e.g., "Sterbegeldversicherung")
    - Follow the existing function signature patterns already in `lib/seo/schema.ts`
    - Use strict TypeScript interfaces; no `any`
  - [x] 1.3 Run only the 2–4 tests written in 1.1
    - Verify all pass; fix schema shape errors before moving on

**Acceptance Criteria:**
- The 2–4 tests written in 1.1 pass
- `generateVergleichSchema` exports cleanly with full TypeScript types
- Output is valid JSON-LD that matches `ItemList + Product + BreadcrumbList` spec requirements

---

### Component Layer

#### Task Group 2: `Vergleich.tsx` Comparison Table Component
**Dependencies:** None — this is a pure presentational Server Component with no external data dependencies at build time.

- [x] 2.0 Build `components/sections/Vergleich.tsx`
  - [x] 2.1 Write 3–5 focused unit tests for `Vergleich.tsx` using Vitest
    - Test that the table renders one `<th scope="col">` per insurer name
    - Test that boolean `true` values render an SVG element with `aria-label="Ja"`
    - Test that boolean `false` values render an element with `aria-label="Nein"`
    - Test that a string value renders as plain text inside a `<td>`
    - Test that the wrapping `div` carries the `overflow-x-auto` class
  - [x] 2.2 Define the TypeScript props interface
    - `anbieter: string[]` — list of insurer column headers
    - `criteria: { label: string; values: Record<string, string | boolean> }[]` — rows
    - `produktName: string` — used in the table caption
    - `generatedAt: string` — pre-formatted date string (e.g., "02.04.2026"), passed in from page
    - Export the interface as `VergleichProps` for use by the page
  - [x] 2.3 Implement the accessible HTML table structure
    - `<table>` inside a `<div className="overflow-x-auto rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">`
    - `<caption className="sr-only">` with `{produktName} — Anbietervergleich`
    - `<thead>`: first `<th scope="col">` is "Kriterium" (empty visually, described by caption); one `<th scope="col">` per insurer using `min-w-[140px]`
    - `<tbody>`: each row is one criterion; first cell is `<th scope="row">` with the `label`; subsequent cells are `<td>` per insurer
    - Table header row background: `bg-[#1a365d] text-white` (Navy from pilot styles)
    - Highlighted / best-value cells: `text-[#d4af37]` (Gold accent) when value is truthy boolean
    - Apply `min-w-full table-auto` to `<table>`; insurer `<th>` cells use `min-w-[140px]`
  - [x] 2.4 Implement boolean and string value rendering
    - Boolean `true`: inline SVG checkmark, `aria-label="Ja"`, `className="text-[#d4af37]"`, `aria-hidden={false}`
    - Boolean `false`: inline SVG dash/minus, `aria-label="Nein"`, `className="text-gray-400"`, `aria-hidden={false}`
    - String value: render as `<span>` plain text
    - Do not use emoji or image tags — SVG only for icons
  - [x] 2.5 Add the disclaimer line below the table
    - Render immediately after `</table>` inside the scroll wrapper: `<p className="mt-2 text-sm text-gray-500">Alle Angaben ohne Gewähr. Stand: {generatedAt}.</p>`
    - `generatedAt` is already formatted by the page before being passed as prop
  - [x] 2.6 Run only the 3–5 tests written in 2.1
    - Verify all pass; fix accessibility attribute errors or class name mismatches before moving on

**Acceptance Criteria:**
- The 3–5 tests written in 2.1 pass
- Table uses `<th scope="col">` and `<th scope="row">` correctly throughout
- Boolean values render as SVG icons with correct `aria-label` attributes
- Horizontal scroll wrapper is present with `overflow-x-auto`
- Disclaimer line renders with the passed `generatedAt` string
- No `any` types; component is a React Server Component (no `"use client"`)

---

### Page Layer

#### Task Group 3: `app/[produkt]/vergleich/page.tsx` SSG Route
**Dependencies:** Task Group 1 (schema types needed for the stored markup contract), Task Group 2 (`Vergleich.tsx` must exist to be imported).

- [x] 3.0 Build `app/[produkt]/vergleich/page.tsx`
  - [x] 3.1 Write 2–4 focused unit/integration tests for the page module
    - Test that `generateStaticParams` returns one entry per product with `status = 'aktiv'` (mock Supabase server client)
    - Test that `generateMetadata` returns `meta_title` and canonical URL from the DB row when a `vergleich` content row exists
    - Test that `generateMetadata` falls back to a default title when no DB row exists
    - Test that the page calls `notFound()` when no published `vergleich` row is found for the slug
  - [x] 3.2 Implement `generateStaticParams`
    - Query `produkte` table via `lib/supabase/server.ts` where `status = 'aktiv'`
    - Return `[{ produkt: slug }]` for each active product
    - Follow the same pattern used in other `[produkt]` pages
  - [x] 3.3 Implement `generateMetadata`
    - Accept `{ params: { produkt: string } }` as argument
    - Query `generierter_content` where `produkt_id` matches the slug and `page_type = 'vergleich'`
    - Read `meta_title` and `meta_desc` from the row
    - `meta_title` pattern: "{Produktname} Anbieter im Vergleich {Jahr}" — enforce 60-character maximum with a truncation guard
    - Set `alternates.canonical` to `/${params.produkt}/vergleich`
    - Return sensible German-language defaults when no DB row exists: title "Anbietervergleich", description "Vergleichen Sie die besten Anbieter."
  - [x] 3.4 Implement the page Server Component
    - Single joined Supabase query: fetch `produkte` + `produkt_config` + `generierter_content` (page_type = 'vergleich') in one call using `lib/supabase/server.ts`
    - Call `notFound()` immediately when no published vergleich content row exists
    - Extract and parse `content` JSONB; locate the section with `type = "vergleich"` to pass `criteria` to `Vergleich.tsx`
    - Format `generated_at` timestamp to "DD.MM.YYYY" string server-side before passing as `generatedAt` prop
    - Inject `schema_markup` from `generierter_content` as `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(row.schema_markup) }} />` inside the page's JSX (Next.js renders this into `<head>` via the layout)
  - [x] 3.5 Implement the breadcrumb navigation UI
    - Render `<nav aria-label="Breadcrumb">` above the page heading
    - Use `<ol>` with `<li>` children
    - Three entries: `<Link href="/">Startseite</Link>`, `<Link href="/{produkt}">{produktName}</Link>`, current page `<span aria-current="page">Vergleich</span>`
    - Apply muted text style: `text-sm text-gray-500` with `"/"` separators between items
    - Use Next.js `<Link>` component for the two linked items
  - [x] 3.6 Compose the full page layout
    - Outer container: `<main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-0 py-12">`
    - Order: breadcrumb nav → H1 page heading → intro paragraph (from `content.sections[vergleich].intro`) → `<Vergleich>` component → LeadForm CTA section
    - H1: "{Produktname} — Anbieter im Vergleich" using `font-['Roboto']` (heading font from design tokens)
    - Intro paragraph: `{vergleichSection.intro}` rendered as `<p className="mt-4 mb-8 text-lg text-gray-700">`
  - [x] 3.7 Integrate the LeadForm CTA section
    - Render below the `Vergleich` component inside a `<section className="mt-16 bg-[#e1f0fb] rounded-2xl px-6 py-12">`
    - H2 heading: "Ihren persönlichen Tarif jetzt anfragen" using `font-['Roboto'] text-2xl font-bold text-[#1a365d]`
    - Pass `<LeadForm produktId={product.id} intentTag="preis" />` — do not modify `LeadForm.tsx` internals
  - [x] 3.8 Run only the 2–4 tests written in 3.1
    - Verify all pass; fix query logic or notFound guard errors before moving on

**Acceptance Criteria:**
- The 2–4 tests written in 3.1 pass
- `generateStaticParams` pre-renders one page per active product
- `generateMetadata` returns correct title, description, and canonical URL
- Page calls `notFound()` for missing vergleich content
- JSON-LD `<script>` tag is injected with stored schema markup
- Breadcrumb nav uses semantic `<nav>`, `<ol>`, `<li>` with `aria-current="page"` on the active item
- `LeadForm` receives `intentTag="preis"` and correct `produktId`
- Page is a Server Component with no `"use client"` directive

---

### Testing

#### Task Group 4: Test Review and Critical Gap Analysis
**Dependencies:** Task Groups 1, 2, and 3 complete.

- [x] 4.0 Review existing feature tests and fill critical gaps
  - [x] 4.1 Review all tests written across Task Groups 1–3
    - Review the 2–4 schema generator tests (Task 1.1)
    - Review the 3–5 component tests (Task 2.1)
    - Review the 2–4 page module tests (Task 3.1)
    - Total existing tests: approximately 7–13 tests
  - [x] 4.2 Identify critical gaps in coverage for this feature only
    - Assess whether the end-to-end data flow from Supabase row → parsed criteria → rendered table cells is covered
    - Assess whether the `generatedAt` date formatting (raw timestamp → "DD.MM.YYYY") is tested
    - Assess whether the `notFound()` path is covered by at least one test
    - Do not assess coverage of unrelated features or the full application
  - [x] 4.3 Write up to 8 additional targeted tests to fill identified gaps
    - Prioritize: full-page integration test with mocked Supabase verifying `<th scope="row">` and icon rendering together
    - Prioritize: date formatting utility test confirming ISO timestamp → "DD.MM.YYYY" output
    - Prioritize: `generateMetadata` 60-character title truncation guard test
    - Skip: edge cases for malformed JSON content, performance scenarios, print layout, or animation states
    - Do not exceed 8 additional tests; leave exhaustive coverage to a dedicated QA phase
  - [x] 4.4 Run only the feature-specific tests
    - Run ONLY the tests from Tasks 1.1, 2.1, 3.1, and 4.3
    - Expected total: approximately 15–21 tests
    - Do not run the entire application test suite
    - Verify all feature tests pass before marking this task group complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 15–21 tests total)
- The Supabase-to-render data flow is covered by at least one integration test
- Date formatting from raw timestamp to "DD.MM.YYYY" is verified
- `notFound()` guard is verified
- No more than 8 additional tests added in this group
- The full application test suite is not run in this phase

---

## Execution Order

Recommended implementation sequence:

1. **Schema Layer (Task Group 1)** — No dependencies; establishes the JSON-LD contract that the page will serve verbatim from the DB.
2. **Component Layer (Task Group 2)** — No external dependencies; pure presentational work that can proceed in parallel with Task Group 1 if two engineers are available.
3. **Page Layer (Task Group 3)** — Requires `Vergleich.tsx` (Task Group 2) to exist as an import; benefits from schema type definitions (Task Group 1) for TypeScript correctness.
4. **Test Review and Gap Analysis (Task Group 4)** — Requires all three preceding groups to be complete so that end-to-end data flow tests can be written.
