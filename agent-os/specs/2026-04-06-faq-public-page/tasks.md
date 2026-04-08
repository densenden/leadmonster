# Task Breakdown: FAQ Public Page with Schema Markup

## Overview
Total Tasks: 4 groups, 26 sub-tasks

## Task List

---

### SEO & Schema Utilities

#### Task Group 1: Schema and Metadata Helpers in `lib/seo/`
**Dependencies:** None — pure utility functions, no runtime or DB dependency

- [x] 1.0 Complete SEO utility layer
  - [x] 1.1 Write 2–4 focused tests for schema and metadata helpers
    - Test `generateFAQPageSchema` produces valid `@type: "FAQPage"` with correct `mainEntity` array shape
    - Test `generateBreadcrumbSchema` produces three-item `BreadcrumbList` with correct `item` URLs
    - Test `buildFAQMetadata` applies correct character-length fallback strings when `meta_title`/`meta_desc` are absent
    - Test that `buildFAQMetadata` sets `robots.index = false` when status is not `publiziert`
    - Use Vitest; mock no external services (pure functions only)
  - [x] 1.2 Create `lib/seo/schema.ts`
    - Export `generateFAQPageSchema(items: Array<{ frage: string; antwort: string }>): object`
      - Returns `{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [...] }`
      - Each entry: `{ "@type": "Question", name: item.frage, acceptedAnswer: { "@type": "Answer", text: item.antwort } }`
    - Export `generateBreadcrumbSchema(crumbs: Array<{ name: string; url: string }>): object`
      - Returns `BreadcrumbList` with `itemListElement` array; position index starts at 1
    - Both functions must be pure — no I/O, no Supabase calls
    - Use TypeScript strict mode; no `any`; define named interfaces for input/output shapes
  - [x] 1.3 Create `lib/seo/metadata.ts`
    - Export `buildFAQMetadata(params: { produkt: { name: string; slug: string; domain?: string | null }; faqRecord: { meta_title?: string | null; meta_desc?: string | null; status: string }; itemCount: number }): Metadata`
    - Title: use `meta_title` if present; fallback `"Häufige Fragen zu {name} | {count} Antworten"` — truncate at 60 characters
    - Description: use `meta_desc` if present; fallback `"Hier finden Sie {count} häufige Fragen und Antworten rund um {name}. Informieren Sie sich jetzt."` — truncate at 160 characters
    - Canonical URL: `https://{domain}/{slug}/faq` where domain resolves from `produkt.domain` falling back to `process.env.NEXT_PUBLIC_BASE_URL`
    - Robots: `{ index: true, follow: true }` only when `faqRecord.status === 'publiziert'`; otherwise `{ index: false, follow: false }`
    - Import and return `Metadata` type from `next`
  - [x] 1.4 Ensure utility tests pass
    - Run ONLY the 2–4 tests written in 1.1 via `npx vitest run`
    - Do NOT run the full test suite

**Acceptance Criteria:**
- The 2–4 tests from 1.1 pass
- `generateFAQPageSchema` and `generateBreadcrumbSchema` return correctly shaped Schema.org objects
- `buildFAQMetadata` returns a valid Next.js `Metadata` object with correct fallbacks and robots directives
- All functions are strictly typed with no `any`

---

### Frontend Component

#### Task Group 2: `FAQ.tsx` Accordion Client Component
**Dependencies:** Task Group 1 (design token values confirmed; no code dependency)

- [x] 2.0 Complete the FAQ accordion component
  - [x] 2.1 Write 3–5 focused tests for `FAQ.tsx`
    - Test that all items render their `frage` and `antwort` strings verbatim without truncation
    - Test that clicking a `<summary>` toggles `open` state on the corresponding `<details>` element
    - Test that a question text is rendered inside an `<h3>` element
    - Test that the component renders the correct number of `<details>` elements for a given `items` array
    - Use Vitest + React Testing Library; no mocking needed (pure UI)
  - [x] 2.2 Implement `components/sections/FAQ.tsx` as a `'use client'` component
    - Accept typed props: `items: Array<{ frage: string; antwort: string }>` and `className?: string`
    - Define a `FAQItem` interface for the prop shape; export it for reuse by the page component
    - Render each item as a native `<details>`/`<summary>` pair
      - `<summary>` contains an `<h3>` with the question text — font-weight 700, 22px (token `h3.desktop`)
      - `<p>` immediately following `<summary>` contains the answer — rendered verbatim, no Markdown parsing
    - Default behaviour: all items closed on mount; each item toggles independently (native `<details>` behaviour)
    - Do not inject intro text, framing phrases, or marketing copy around question/answer strings
  - [x] 2.3 Apply design tokens as Tailwind utility classes (no inline style attributes)
    - Question `<h3>`: text color `#333333` (token `text.heading`), font-family Roboto (heading font)
    - Answer `<p>`: text color `#666666` (token `text.body`), font-family Nunito Sans (body font), font-weight 300
    - Item border: `1px solid #e5e5e5` (token `border.divider`)
    - Section/wrapper background: `#f8f8f8` (token `background.muted`)
    - Card container: white background, `border-radius: 12px`, `box-shadow` matching `sterbegeld24plus-recreation/styles.css` card pattern
    - Primary accent `#abd5f4` (token `colors.primary`) used for open-state indicator or summary chevron
    - Navy heading for section title: `#1a365d` (pilot product primary color from `sterbegeld24plus-recreation/styles.css`)
    - Gold accent `#d4af37` for hover or CTA elements if applicable within the component
  - [x] 2.4 Implement open/close height animation
    - Animate the answer panel height using CSS `transition: height var(--duration-normal) var(--ease-standard)` (250ms, cubic-bezier(0.25, 0.46, 0.45, 0.94))
    - Only animate `height` and `opacity` — no other properties (GPU-friendly per animation standards)
    - Respect `prefers-reduced-motion`: wrap transition declarations in `@media (prefers-reduced-motion: no-preference)` so the panel snaps open/closed with no animation for users who opt out
    - Do not use bounce or overshoot easing; no animation longer than 500ms
    - Add a chevron/arrow indicator on `<summary>` that rotates 180deg when the item is open (same transition, same reduced-motion guard)
  - [x] 2.5 Ensure accessibility requirements
    - `<summary>` must be keyboard-focusable with a visible focus ring (Tailwind `focus-visible:ring`)
    - Minimum tap target height 44px on the `<summary>` element for mobile
    - Logical heading hierarchy: the page's single `<h1>` precedes all `<h3>` question headings — do not place an `<h2>` inside the component; let the page layer handle section headings
    - Color contrast on question text `#333333` on `#ffffff` background is compliant (>4.5:1)
  - [x] 2.6 Apply mobile-first responsive layout
    - Full-width stacked list on mobile (320px+)
    - Container max-width 1200px centred on desktop (matching `sterbegeld24plus-recreation/styles.css` `.container` pattern)
    - Font sizes use `rem` units derived from token values
    - Touch targets at least 44×44px on all interactive elements
  - [x] 2.7 Ensure FAQ component tests pass
    - Run ONLY the 3–5 tests written in 2.1 via `npx vitest run`
    - Verify open/close toggle, verbatim rendering, and `<h3>` structure
    - Do NOT run the full test suite

**Acceptance Criteria:**
- The 3–5 tests from 2.1 pass
- Component renders all items verbatim with no truncation or added copy
- `<details>`/`<summary>` structure is semantically correct and keyboard-accessible
- Height animation runs at 250ms with standard easing; disabled under `prefers-reduced-motion`
- All design tokens applied via Tailwind; zero inline style attributes
- Responsive from 320px to 1200px+ container width

---

### Server Page

#### Task Group 3: `app/[produkt]/faq/page.tsx` — SSG Route
**Dependencies:** Task Groups 1 and 2

- [x] 3.0 Complete the FAQ page route
  - [x] 3.1 Write 3–5 focused tests for the FAQ page
    - Test that `generateStaticParams` returns one entry per `aktiv` product slug from the `produkte` table (mock Supabase server client)
    - Test that the page calls `notFound()` when no `publiziert` FAQ record exists for the slug
    - Test that `generateMetadata` delegates to `buildFAQMetadata` and returns the correct canonical URL shape
    - Test that the FAQ `content` section with `type === 'faq'` is correctly extracted and passed to the `FAQ` component
    - Use Vitest; mock `lib/supabase/server.ts` to return fixture data
  - [x] 3.2 Implement `generateStaticParams` in `app/[produkt]/faq/page.tsx`
    - Import the Supabase server client from `lib/supabase/server.ts` — do not instantiate a new client inline
    - Query `produkte` table: `select('slug')` filtered by `status = 'aktiv'`
    - Return array of `{ produkt: string }` params
    - Handle Supabase errors gracefully: log server-side and return empty array (Next.js will skip pre-render for missing slugs)
  - [x] 3.3 Implement the page component data fetching
    - Declare `export const revalidate = 3600` at module level for ISR cache consistency with the main product page
    - Two sequential Supabase queries (no N+1):
      1. Query `produkte`: `select('id, slug, name, domain, status')` filtered by `slug = params.produkt`
      2. Query `generierter_content`: `select('title, meta_title, meta_desc, content, schema_markup')` filtered by `produkt_id` and `page_type = 'faq'` and `status = 'publiziert'`
    - Select only the columns listed — do not fetch `generated_at`, `published_at`, or other admin-only fields
    - Call `notFound()` if either the product row is absent or the FAQ content row is absent/unpublished
    - Extract the FAQ section: `faqRecord.content.sections.find(s => s.type === 'faq')?.items ?? []`
    - Log a server-side console warning if `items.length < 10`
    - Pass `items` as the typed `FAQItem[]` prop to `<FAQ>`
  - [x] 3.4 Implement `generateMetadata` export
    - Repeat the same two Supabase queries (or extract a shared data-fetching helper to avoid duplication — prefer a private `fetchFAQPageData(slug)` function used by both `generateMetadata` and the page component)
    - Delegate fully to `buildFAQMetadata` from `lib/seo/metadata.ts`
    - Return the `Metadata` object directly — no additional metadata logic in the page file
  - [x] 3.5 Inject Schema.org JSON-LD into the page head
    - If `faqRecord.schema_markup` is present in DB, use it directly
    - Otherwise, call `generateFAQPageSchema(items)` from `lib/seo/schema.ts` at render time
    - Always call `generateBreadcrumbSchema` with three crumbs: `{ name: 'Startseite', url: '/' }`, `{ name: produkt.name, url: '/{slug}' }`, `{ name: 'FAQ', url: '/{slug}/faq' }`
    - Emit both blocks as a single `<script type="application/ld+json">` containing a `@graph` array, injected via a `<Script>` tag with `strategy="beforeInteractive"` or as a direct `<script>` in a Server Component layout slot
    - Validate that the combined `@graph` contains both `FAQPage` and `BreadcrumbList` nodes
  - [x] 3.6 Build page layout and navigation
    - Render `<nav aria-label="Breadcrumb">` with `<ol>`/`<li>` structure: "Startseite" > `{produkt.name}` > "FAQ"
      - Each crumb is an `<a>` link except the last (current page), which is a plain `<span aria-current="page">`
      - Separator character between crumbs rendered via CSS `::after` pseudo-element, not a literal `>`
    - Render a back-link `<a href="/{slug}">` labeled "Zurück zur Produktseite" above the FAQ accordion
    - Render a page-level `<h1>` such as `"Häufige Fragen zu {produkt.name}"` above the FAQ component
    - After the `<FAQ>` component, render a CTA section:
      - Link target: `/{slug}#formular`
      - Link text: "Noch Fragen? Jetzt unverbindlich anfragen"
      - Style as a prominent CTA block using Navy `#1a365d` background and gold `#d4af37` button/accent, matching the pilot product visual language
    - Apply container max-width 1200px, centred, with consistent horizontal padding
  - [x] 3.7 Ensure page route tests pass
    - Run ONLY the 3–5 tests written in 3.1 via `npx vitest run`
    - Verify `generateStaticParams`, `notFound`, `generateMetadata`, and schema injection paths
    - Do NOT run the full test suite

**Acceptance Criteria:**
- The 3–5 tests from 3.1 pass
- `generateStaticParams` pre-renders one page per active product
- `notFound()` fires when no published FAQ record exists
- `revalidate = 3600` is exported at module level
- Both `FAQPage` and `BreadcrumbList` JSON-LD blocks are present in the page head
- `generateMetadata` delegates to `buildFAQMetadata`; canonical URL is correctly formed
- Breadcrumb `<nav>` and back-link render above the accordion; CTA section renders below it
- No N+1 queries; only two sequential Supabase selects per request
- Only needed columns are selected from both tables

---

### Testing

#### Task Group 4: Test Review and Critical Gap Analysis
**Dependencies:** Task Groups 1–3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review tests from Task Groups 1–3
    - Review the 2–4 utility tests from Task Group 1 (`lib/seo/schema.ts`, `lib/seo/metadata.ts`)
    - Review the 3–5 component tests from Task Group 2 (`FAQ.tsx`)
    - Review the 3–5 page route tests from Task Group 3 (`app/[produkt]/faq/page.tsx`)
    - Total existing tests: approximately 8–14 tests
  - [x] 4.2 Analyze critical gaps for this feature only
    - Identify uncovered critical paths within this spec's scope (e.g. schema fallback path when `schema_markup` is null, reduced-motion CSS class presence, breadcrumb aria-current placement)
    - Do NOT assess or fill coverage gaps for other specs or the broader application
    - Prioritize integration paths over additional unit tests
  - [x] 4.3 Write up to 10 additional strategic tests maximum
    - Focus on end-to-end integration paths: schema fallback when `schema_markup` is absent, ISR `revalidate` export value, breadcrumb `aria-current="page"` on the last crumb, `prefers-reduced-motion` CSS class guard presence, CTA link href resolves to `/{slug}#formular`
    - Do not add exhaustive coverage of every prop permutation or every Tailwind class
    - Mock Supabase server client for integration-style page tests; use `@testing-library/react` for component tests
  - [x] 4.4 Run all feature-specific tests only
    - Run ONLY tests related to this spec: tests from 1.1, 2.1, 3.1, and 4.3
    - Expected total: approximately 18–24 tests
    - Do NOT run the full application test suite
    - All tests must pass before the feature is considered complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 18–24 tests total)
- Schema fallback path (null `schema_markup`) is covered
- Breadcrumb accessibility (`aria-current`, `<ol>`/`<li>` structure) is covered
- Reduced-motion guard for accordion animation is covered
- No more than 10 additional tests added in this group
- Zero tests outside the scope of this spec

---

## Execution Order

Recommended implementation sequence:

1. **SEO & Schema Utilities (Task Group 1)** — No dependencies; pure TypeScript functions that can be implemented and tested in isolation. Establishing these helpers first keeps the page component lean and enables clean unit testing of metadata and schema logic.

2. **FAQ Accordion Component (Task Group 2)** — Depends only on design token values (confirmed from `design-tokens/tokens.json`) and no runtime data. Build and test the UI component independently before wiring it to live data.

3. **SSG Page Route (Task Group 3)** — Depends on both `FAQ.tsx` (Task Group 2) and `lib/seo/` helpers (Task Group 1). Implement `generateStaticParams`, data fetching, `generateMetadata`, JSON-LD injection, and page layout as a composed unit once the building blocks exist.

4. **Test Review and Gap Analysis (Task Group 4)** — Runs after all implementation is complete; reviews existing tests, identifies critical uncovered paths within this spec's scope, and adds a maximum of 10 strategic tests to close those gaps.
