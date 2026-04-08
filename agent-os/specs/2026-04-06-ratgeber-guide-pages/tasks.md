# Task Breakdown: Ratgeber Guide Pages

## Overview
Total Tasks: 4 task groups, 30 sub-tasks

## Task List

---

### TypeScript Types & Data Layer

#### Task Group 1: Section Types, Supabase Queries, and SEO Schema Helpers
**Dependencies:** None — builds foundational types and data-access functions used by all subsequent groups

- [x] 1.0 Complete data layer and schema infrastructure
  - [x] 1.1 Write 2-8 focused tests for the data layer
    - Test that `fetchRatgeberBySlug` returns `null` for an unpublished row
    - Test that `fetchAllRatgeberForProdukt` returns only rows with `page_type = 'ratgeber'` and `status = 'publiziert'`
    - Test that `calculateReadingTime` returns a minimum of 2 and rounds up correctly
    - Test that `buildArticleSchema` output includes `headline`, `datePublished`, and `author`
    - Test that `buildHowToSchema` is only called when `steps` sections are present
    - Limit to these 5 tests — do not expand to exhaustive coverage
  - [x] 1.2 Define TypeScript section types in `lib/types/ratgeber.ts`
    - `IntroSection`: `{ type: 'intro', text: string }`
    - `BodySection`: `{ type: 'body', heading: string, paragraphs: string[] }`
    - `StepsSection`: `{ type: 'steps', heading: string, items: { number: number, title: string, description: string }[] }`
    - `CtaSection`: `{ type: 'cta', headline: string, cta_text: string, cta_anchor: string }`
    - `RelatedSection`: `{ type: 'related', articles: { slug: string, title: string }[] }`
    - `RatgeberSection` = union of all five variants
    - `RatgeberContent`: `{ sections: RatgeberSection[] }`
    - Export typed `GenerierterContentRow` interface matching the Supabase `generierter_content` schema
    - Use `interface` for object shapes, `type` for the union — follow TypeScript strict mode (no `any`)
  - [x] 1.3 Add Supabase query functions in `lib/supabase/ratgeber.ts`
    - `fetchAllRatgeberForProdukt(produktSlug: string)`: select `id, slug, title, content, meta_desc, published_at` from `generierter_content` joining `produkte` on `produkt_id` where `page_type = 'ratgeber'` and both rows have `status = 'publiziert'`, ordered by `generated_at` asc
    - `fetchRatgeberBySlug(produktSlug: string, thema: string)`: single row fetch adding `meta_title, meta_desc, schema_markup` fields; returns `null` if not found
    - `fetchAllPublishedRatgeberParams()`: for `generateStaticParams` — returns `{ produkt: string, thema: string }[]` joining `produkte` (slug) + `generierter_content` (slug) where both statuses are `'publiziert'`
    - Use `lib/supabase/server.ts` service-role client for all calls
    - Use typed return values from 1.2 — never return untyped `any`
  - [x] 1.4 Implement `calculateReadingTime(sections: RatgeberSection[]): number` in `lib/utils/reading-time.ts`
    - Concatenate all text strings from all section variants into one string
    - Count words by splitting on whitespace
    - Divide by 200, apply `Math.ceil`
    - Clamp minimum to 2
    - Export as a pure function with no side effects
  - [x] 1.5 Extend `lib/seo/schema.ts` with `buildArticleSchema` and `buildHowToSchema`
    - `buildArticleSchema(args: { headline, description, datePublished, dateModified, produktSlug, thema })`: returns Schema.org `Article` object with `InsuranceAgency` author entity and publisher fields; canonical URL composed from `NEXT_PUBLIC_BASE_URL`
    - `buildHowToSchema(args: { name: string, steps: StepsSection['items'] })`: returns Schema.org `HowTo` with `step` array
    - Verify `combineSchemas()` already accepts an array — if not, implement it to spread multiple schema objects into a `@graph` array
    - Follow existing function naming pattern already established in `lib/seo/schema.ts`
  - [x] 1.6 Ensure data layer tests pass
    - Run only the 5 tests written in 1.1
    - All 5 must pass before moving to Task Group 2
    - Do not run the full test suite

**Acceptance Criteria:**
- The 5 tests written in 1.1 pass
- TypeScript compiles with strict mode and zero errors (`tsc --noEmit`)
- All Supabase query functions return typed results
- `calculateReadingTime` enforces a minimum of 2
- Schema helpers produce valid Schema.org JSON-LD structure

---

### Public Pages (SSG/ISR)

#### Task Group 2: Ratgeber Article Route and Index Page
**Dependencies:** Task Group 1

- [x] 2.0 Complete the public-facing ratgeber pages
  - [x] 2.1 Write 2-8 focused tests for the public pages
    - Test that `generateStaticParams` returns the correct `{ produkt, thema }` shape from mocked Supabase data
    - Test that the article page calls `notFound()` when `fetchRatgeberBySlug` returns `null`
    - Test that `generateMetadata` sets `canonical` to the correct URL pattern
    - Test that the index page renders a card for each article in the mocked list
    - Limit to these 4 tests — use Vitest with Supabase and Next.js mocks
  - [x] 2.2 Build `app/[produkt]/ratgeber/[thema]/page.tsx`
    - Export `export const revalidate = 3600` (hourly ISR)
    - Export `export const dynamicParams = true`
    - Implement `generateStaticParams` calling `fetchAllPublishedRatgeberParams()` from 1.3
    - Implement `generateMetadata` calling `fetchRatgeberBySlug` then `buildProduktMetadata()` from `lib/seo/metadata.ts`
      - Set canonical URL: `{NEXT_PUBLIC_BASE_URL}/{produkt}/ratgeber/{thema}`
      - Set `robots: { index: true, follow: true }`
    - In the page component, call `fetchRatgeberBySlug`; call `notFound()` if result is `null`
    - Call `calculateReadingTime(content.sections)` to get reading time
    - Compose schemas: always include `buildArticleSchema` + `buildBreadcrumbSchema` (4 levels: Home > Produkt > Ratgeber > article title); include `buildHowToSchema` only when at least one `steps` section exists
    - Pass combined schema to `<script type="application/ld+json">` tag via `combineSchemas()`
    - This is a Server Component — no `'use client'` directive
  - [x] 2.3 Implement section-type rendering via `RatgeberRenderer` in `app/[produkt]/ratgeber/[thema]/_components/ratgeber-renderer.tsx`
    - Accept `sections: RatgeberSection[]` as prop
    - `intro`: render as `<p>` with larger lead text styling (`text-lg font-light leading-relaxed` via Tailwind)
    - `body`: render H2 with `text-2xl font-semibold` + body paragraphs; paragraphs may contain sub-headings marked with H3
    - `steps`: render `<ol>` with large numbered markers (`text-4xl font-bold text-primary`), each item has a bold title and description below
    - `cta`: render `<LeadForm intentTag={deriveIntentTag(articleSlug)} produktId={...} zielgruppeTag={...} />`
    - `deriveIntentTag`: `kosten/preis` → 'preis', `schutz/sicherheit` → 'sicherheit', default → 'sicherheit'
    - `related`: render a card row of 2-3 sibling article links (`/[produkt]/ratgeber/[slug]`) using the same card style as the index grid
    - Handle unknown section types gracefully (return `null` per section — no crash)
    - Use Tailwind utility classes from design tokens; no inline styles
  - [x] 2.4 Render breadcrumb navigation in the article layout
    - Render a visible `<nav aria-label="Breadcrumb">` at the top of the article using `<ol>` with `<li>` items
    - Levels: Home (`/`) > Produkt name (`/[produkt]`) > Ratgeber (`/[produkt]/ratgeber`) > Article title
    - Styled with `text-sm text-muted-foreground` and chevron separator
    - The `BreadcrumbList` schema produced in 2.2 mirrors these same four levels
  - [x] 2.5 Display reading time below article title
    - Render `<p className="text-sm text-muted-foreground mt-1">Lesezeit: ca. {readingTime} Minuten</p>` directly below the `<h1>` article title
    - `readingTime` value comes from `calculateReadingTime` called in the page component (1.4)
  - [x] 2.6 Build `app/[produkt]/ratgeber/page.tsx` (index page)
    - Server Component fetching all published ratgeber via `fetchAllRatgeberForProdukt`
    - Implement `generateMetadata`: title `"Ratgeber zu {Produkt} — Alle Guides"`, meta description from product name
    - Inject `BreadcrumbList` schema for 3 levels: Home > Produkt > Ratgeber
    - Render a responsive card grid: 1 column mobile, 2 columns tablet (`md:`), 3 columns desktop (`lg:`)
    - Each card: article `title` as H2, intro excerpt truncated at ~150 chars from `meta_desc`, reading time badge, link to `/[produkt]/ratgeber/[slug]`
    - Card uses Tailwind classes consistent with the existing design system (`rounded-xl`, `shadow-sm`, `hover:shadow-md` transition)
    - Empty state: if no published articles, render a short message rather than an empty grid
  - [x] 2.7 Ensure public page tests pass
    - Run only the 4 tests written in 2.1
    - All 4 must pass; fix any issues before moving to Task Group 3
    - Do not run the full test suite

**Acceptance Criteria:**
- The 4 tests written in 2.1 pass
- `generateStaticParams` returns correct param shapes
- `notFound()` fires when slug is not found or not published
- `generateMetadata` sets correct canonical URL and robots directives
- Article page renders all 5 section types without errors
- `HowTo` schema is only emitted when `steps` sections are present
- Index page card grid renders correct article data with truncated excerpt
- TypeScript compiles with no errors

---

### Admin Interface

#### Task Group 3: Admin Ratgeber Section and Generate Button
**Dependencies:** Task Group 1 (types and query functions), Task Group 2 (public route exists)

- [x] 3.0 Complete the admin ratgeber management UI
  - [x] 3.1 Write 2-8 focused tests for the admin UI
    - Test that the ratgeber section renders a status badge for each article row (mocked data)
    - Test that clicking "Weiteren Ratgeber generieren" submits a POST to `/api/generate` with `{ produktId, pageType: 'ratgeber', topic }`
    - Test that a validation error is shown when the topic field is empty on submit
    - Limit to these 3 tests
  - [x] 3.2 Add a Ratgeber section to `app/admin/produkte/[id]/content/page.tsx`
    - Fetch all `generierter_content` rows where `produkt_id = params.id` and `page_type = 'ratgeber'` using the service-role Supabase client
    - Render a table or list with columns: slug, title, status badge (`entwurf` / `review` / `publiziert`), `generated_at` date
    - Status badges styled with colour coding: `entwurf` → yellow, `review` → blue, `publiziert` → green
    - This section sits below any existing content sections on the page; do not restructure the existing layout
  - [x] 3.3 Build `GenerateRatgeberButton` client component in `app/admin/produkte/[id]/content/_components/generate-ratgeber-button.tsx`
    - `'use client'` directive required
    - Props: `produktId: string`
    - Renders a button "Weiteren Ratgeber generieren" that opens an inline form (no modal required — inline expand is sufficient)
    - Form contains one text input: "Thema / Slug-Vorschlag" (e.g. `fuer-wen`, `kosten-leistungen`)
    - Client-side validation: field must not be empty before submit
    - On submit: POST to `/api/generate` with body `{ produktId, pageType: 'ratgeber', topic: inputValue }`
    - Validate `topic` with zod on the server inside `/api/generate` route (`z.string().min(3).max(100)`)
    - Show loading state on button during fetch (`disabled` + spinner or "Wird generiert…" text)
    - On success: display inline success message "Ratgeber wird generiert — bitte Seite neu laden"; do not auto-refresh (avoid race condition with generation time)
    - On error: display `error.message` in red below the form
    - Uses Tailwind classes consistent with the existing admin UI; no custom CSS
  - [x] 3.4 Extend `/api/generate` route to handle `pageType: 'ratgeber'` with optional `topic`
    - Validate request body with zod: `{ produktId: z.string().uuid(), pageType: z.enum(['ratgeber', ...existingTypes]), topic: z.string().min(3).max(100).optional() }`
    - When `pageType === 'ratgeber'`, pass `topic` to `generateContent` from `lib/anthropic/generator.ts`
    - `generateContent` already accepts an optional `topic` param per the spec — confirm the signature and pass through
    - Insert resulting content as a new `generierter_content` row with `status = 'entwurf'`
    - Return `{ data: { id: newRowId, slug: generatedSlug }, error: null }` with HTTP 201
    - Return HTTP 422 for zod validation failures; HTTP 500 for Claude API errors with a user-friendly message in `error.message`
    - This route must be protected — check Supabase Auth session; return 401 if no valid session
  - [x] 3.5 Ensure admin UI tests pass
    - Run only the 3 tests written in 3.1
    - All 3 must pass before moving to Task Group 4
    - Do not run the full test suite

**Acceptance Criteria:**
- The 3 tests written in 3.1 pass
- Ratgeber list with status badges renders correctly in the admin content page
- "Weiteren Ratgeber generieren" button posts correct payload to `/api/generate`
- Empty topic field shows a client-side validation error without making a network request
- `/api/generate` returns 401 without a valid session
- New article row appears with `status = 'entwurf'` in Supabase after successful generation
- TypeScript compiles with no errors

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1, 2, and 3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review all tests written in Task Groups 1-3
    - Review the 5 tests from Task Group 1 (data layer)
    - Review the 4 tests from Task Group 2 (public pages)
    - Review the 3 tests from Task Group 3 (admin UI)
    - Total existing tests: 12
  - [x] 4.2 Analyze test coverage gaps for this feature only
    - Identify any critical user workflows specific to ratgeber pages that are not covered
    - Prioritize end-to-end and integration gaps over unit test gaps
    - Focus exclusively on: SSG build-time correctness, article rendering, lead form intent tagging, and admin generation flow
    - Do not assess general application test coverage
  - [x] 4.3 Write up to 10 additional strategic tests to fill identified critical gaps
    - Suggested candidates (only add if not already covered):
      - E2e: article page renders breadcrumb with 4 correct levels
      - E2e: `cta` section renders `LeadForm` with correct `intentTag` for a cost-focused slug
      - Integration: `/api/generate` route with `pageType: 'ratgeber'` inserts a row and returns 201
      - Integration: full article rendering pipeline from Supabase row to rendered HTML includes reading time
      - Unit: `deriveIntentTag` returns `'preis'` for slug containing `kosten`
    - Do not write more than 10 new tests total
    - Skip edge cases, performance tests, accessibility audits, and social sharing (all out of scope per spec)
  - [x] 4.4 Run only feature-specific tests
    - Run only the tests from Task Groups 1-3 plus any added in 4.3
    - Expected total: 12-22 tests maximum
    - Do not run the entire application test suite
    - All feature-specific tests must pass

**Acceptance Criteria:**
- All feature-specific tests pass (12-22 tests total)
- Critical ratgeber workflows are covered: static generation, article rendering, reading time, admin generation trigger
- No more than 10 additional tests added in gap analysis
- Zero TypeScript compilation errors across all new files
- Testing scope is limited exclusively to this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1 — Data Layer** (types, Supabase queries, reading time util, SEO schema helpers)
   - No dependencies; establishes the foundation everything else imports from
2. **Task Group 2 — Public Pages** (SSG article route, index page, section renderer, breadcrumbs)
   - Depends on Task Group 1 types and query functions
3. **Task Group 3 — Admin Interface** (ratgeber list, generate button, `/api/generate` extension)
   - Depends on Task Group 1 types; Task Group 2 must exist as the public destination for generated content
4. **Task Group 4 — Test Review and Gap Analysis**
   - Depends on all prior task groups being complete and their tests passing

## Key Implementation Notes

- All new page components under `app/[produkt]/ratgeber/` are Server Components unless explicitly interactive (only `GenerateRatgeberButton` requires `'use client'`)
- All Supabase fetches use the service-role client from `lib/supabase/server.ts` — never the browser client in server code
- Design token values from `design-tokens/tokens.json` must be used via Tailwind config extension — do not hardcode hex colours in component files
- The `revalidate = 3600` export on the article route enables hourly ISR so newly published articles appear without a full rebuild
- zod validation is required on all API route inputs per project coding rules — no raw request forwarding
- German text in all user-facing labels, English in all code identifiers — per CLAUDE.md coding rules
- File names follow kebab-case (`ratgeber-renderer.tsx`, `reading-time.ts`, `generate-ratgeber-button.tsx`)
- Imports use the `@/` path alias throughout (e.g. `@/lib/supabase/ratgeber`, `@/lib/utils/reading-time`)
