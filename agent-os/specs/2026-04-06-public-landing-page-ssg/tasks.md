# Task Breakdown: Public Landing Page with SSG

## Overview
Total Tasks: 32 sub-tasks across 5 task groups

## Context
This spec builds the statically generated public product landing page for LeadMonster. The page is driven entirely by JSONB content stored in `generierter_content` and must be correct for SEO and AEO from day one. The implementation order below follows strict dependency layering: pure utility libs first, then section components (no data dependencies), then the page shell that wires everything together, and finally ISR/revalidation plumbing on top of that.

Design reference: `sterbegeld24plus-recreation/styles.css` (Navy `#1a365d`, Gold `#d4af37`). Token source of truth: `design-tokens/tokens.json`. Tailwind arbitrary values are the accepted interim approach for the Navy/Gold palette.

---

## Task List

### SEO Utility Libraries

#### Task Group 1: lib/seo — Metadata and Schema.org Generators
**Dependencies:** None (pure functions, no Supabase, no React)

- [x] 1.0 Implement the SEO utility library layer
  - [x] 1.1 Write 2–5 focused unit tests for the SEO utilities (Vitest)
    - Test that `buildProduktMetadata` returns correct `title`, `description`, and `alternates.canonical` given known inputs
    - Test that `buildInsuranceAgencySchema` returns an object with `@type: "InsuranceAgency"` and all required fields
    - Test that `buildBreadcrumbSchema` maps an array of `{ name, url }` items to the correct `BreadcrumbList` structure
    - Test that `combineSchemas` wraps multiple schema objects into a single `@graph` array and serialises to valid JSON
    - Keep all tests pure: no network calls, no Supabase imports — pass raw params directly to each function
  - [x] 1.2 Create `lib/seo/metadata.ts` — `buildProduktMetadata` function
    - Accept `{ slug, meta_title, meta_desc, domain?: string }` — typed interface, no `any`
    - Return a fully typed Next.js `Metadata` object (import from `next`)
    - Set `title` from `meta_title` (caller is responsible for the 60-char cap; function passes through as-is)
    - Set `description` from `meta_desc`
    - Set `alternates.canonical` to `https://${domain ?? process.env.NEXT_PUBLIC_SITE_DOMAIN}/${slug}`
    - Set `robots: { index: true, follow: true }`
    - Set Open Graph: `og:title`, `og:description`, `og:type = 'website'`, `og:url` matching canonical
    - Function must be pure: no Supabase calls, no side effects — only derive output from arguments
    - Use absolute path alias `@/lib/seo/metadata`
  - [x] 1.3 Create `lib/seo/schema.ts` — Schema.org JSON-LD generator functions
    - Export `buildInsuranceAgencySchema({ name, url, logo, sameAs })` returning a plain `InsuranceAgency` object
    - Export `buildProductSchema({ name, description, brand, offersDescription })` returning a plain `Product` object with a placeholder `offers` field
    - Export `buildBreadcrumbSchema(items: Array<{ name: string; url: string }>)` returning a `BreadcrumbList` object with correctly indexed `ListItem` entries
    - Export `combineSchemas(...schemas: object[])` returning a JSON string of `{ "@context": "https://schema.org", "@graph": [...schemas] }` — suitable for direct injection into a `<script type="application/ld+json">` tag
    - All four functions return plain objects or strings; no JSX, no DOM, no React dependency
    - Co-locate a TypeScript interface for each schema shape above its function
    - Use self-documenting names; add a single-line JSDoc explaining the Schema.org type each function produces
  - [x] 1.4 Verify SEO utility tests pass
    - Run only the 2–5 tests written in 1.1 (`vitest run lib/seo`)
    - Do not run the full test suite
    - Confirm zero TypeScript errors in the two new files (`tsc --noEmit`)

**Acceptance Criteria:**
- All 2–5 tests written in 1.1 pass
- `buildProduktMetadata` returns a Metadata object with canonical URL, Open Graph, and robots fields
- All four schema functions produce structurally correct plain objects or JSON strings
- No `any` types; TypeScript strict mode passes

---

### Frontend Section Components

#### Task Group 2: Section Components — Hero, FeatureGrid, TrustBar
**Dependencies:** Task Group 1 (design token values referenced; no code import dependency)

- [x] 2.0 Build the three public-facing Server Component sections
  - [x] 2.1 Write 2–5 focused tests for section components (Vitest + React Testing Library or snapshot tests)
    - Test that `Hero` renders an `<h1>` containing the `headline` prop and an `<a>` whose `href` equals the `cta_anchor` prop
    - Test that `FeatureGrid` renders one card per item in the `items` array
    - Test that `TrustBar` renders one value+label pair per item in the `items` array
    - Keep component tests as Server Component render tests (renderToString or static snapshot); no browser required
  - [x] 2.2 Copy the hero background image asset
    - Copy `sterbegeld24plus-recreation/assets/hero-bg.jpg` to `public/images/hero-bg.jpg`
    - Confirm the file is reachable at `/images/hero-bg.jpg` as a static Next.js public asset
  - [x] 2.3 Create `components/sections/Hero.tsx`
    - Props interface: `headline: string`, `subline: string`, `cta_text: string`, `cta_anchor: string`
    - This is a Server Component — no `'use client'` directive
    - Render a full-width section with `public/images/hero-bg.jpg` as CSS background image
    - Apply a Navy overlay using `bg-[#1a365d]/70` or inline style `rgba(26,54,93,0.7)` via a positioned child div
    - `headline` rendered as `<h1>` — Roboto 700, white, 36px desktop / 2.5rem mobile — use `text-4xl md:text-[36px] font-bold text-white`
    - `subline` rendered as `<p>` — white at 90% opacity (`text-white/90`)
    - CTA rendered as `<a href={cta_anchor}>` with Gold background (`bg-[#d4af37]`), hover to `hover:bg-[#b8860b]`, `hover:-translate-y-0.5` lift — no JS required, pure anchor scroll
    - Section vertical padding: 140px desktop / 70px mobile (matching `design-tokens/tokens.json` section spacing large/default)
    - Mobile: headline reduces to `text-[2.5rem]`, horizontal padding reduces
    - Semantic: wrap in `<section>` with `aria-label` matching the headline for screen readers
  - [x] 2.4 Create `components/sections/FeatureGrid.tsx`
    - Props interface: `items: Array<{ icon: string; title: string; text: string }>`
    - This is a Server Component — no `'use client'` directive
    - Render a CSS grid using Tailwind: `grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8`
    - Each card: white background, `rounded-xl` (12px), shadow `shadow-[0_2px_8px_rgba(0,0,0,.08)]` from design tokens, `border-b-4 border-transparent hover:border-[#d4af37] transition-colors duration-150`
    - Card title: Navy `text-[#1a365d]` font-bold; body text: muted `text-[#4a5568]`
    - Icon map (plain object constant above the component): `shield`, `check`, `star`, `clock`, `heart`, `euro` → simple SVG inline or Unicode fallback — unknown icon values render nothing (no error thrown)
    - Section padding: 70px top/bottom from design tokens (`py-[70px]`)
    - Wrap in `<section>` with semantic `aria-label="Produktvorteile"` or equivalent
  - [x] 2.5 Create `components/sections/TrustBar.tsx`
    - Props interface: `items: Array<{ label: string; value: string }>`
    - This is a Server Component — no `'use client'` directive
    - Full-width Navy background: `bg-[#1a365d]`
    - Desktop layout: `flex flex-row justify-center gap-16 py-[40px]`
    - Mobile layout (< 640px): `grid grid-cols-2 gap-8` — collapse to two-column grid
    - Each item: `value` as large bold Gold text (`text-[#d4af37] text-3xl font-bold`); `label` as smaller white text below (`text-white text-sm`)
    - Wrap in `<section>` with `aria-label="Vertrauenssignale"` — use `role="list"` + `role="listitem"` on items for screen readers
  - [x] 2.6 Configure Tailwind token extension in `tailwind.config.ts`
    - Extend `theme.colors` with values from `design-tokens/tokens.json`:
      - `primary: '#abd5f4'`, `brand-orange: '#ff9651'`, `text-heading: '#333333'`, `text-body: '#666666'`
    - Extend `theme.fontFamily` to include `roboto` and `nunito` as named families matching what `next/font/google` will provide
    - The Navy/Gold palette remains as Tailwind arbitrary values for this spec (interim approach per spec)
    - Do not modify the file if `tailwind.config.ts` does not yet exist — instead create it with these extensions and the standard Next.js content glob
  - [x] 2.7 Verify section component tests pass
    - Run only the 2–5 tests written in 2.1 (`vitest run components/sections`)
    - Confirm no TypeScript errors in the three new component files

**Acceptance Criteria:**
- All 2–5 tests written in 2.1 pass
- `Hero` renders an `<h1>`, an `<a>` CTA, and the Navy overlay without JavaScript
- `FeatureGrid` renders a card per item with Gold hover border; unknown icons silently skip
- `TrustBar` collapses to two-column grid on mobile
- All three components are Server Components (no `'use client'`)
- Tailwind token extension in place

---

### Page Shell

#### Task Group 3: app/[produkt]/page.tsx — SSG Page with Section Renderer
**Dependencies:** Task Groups 1 and 2

- [x] 3.0 Implement the dynamic SSG product page
  - [x] 3.1 Write 3–5 focused tests for the page module
    - Test that `generateStaticParams` returns the correct array shape `[{ produkt: string }]` when the Supabase server client is mocked to return two published slugs
    - Test that `generateMetadata` calls `buildProduktMetadata` with the correct slug, meta_title, and meta_desc retrieved from a mocked Supabase response
    - Test that the section renderer renders `<Hero>` when the sections array contains `{ type: 'hero', ... }` and renders nothing for an unknown `type: 'unknown'`
    - Mock all Supabase calls — tests must not make real network requests
  - [x] 3.2 Define the `ContentSection` discriminated union TypeScript type
    - Place in `lib/types/content.ts` (create file) so it can be imported by both the page and future section components
    - Cover all known types: `HeroSection`, `FeaturesSection`, `TrustSection`, `FaqSection`, `LeadFormSection`
    - Each variant must be a typed object literal with `type` as a string literal discriminant and all fields the section component expects
    - Use `type ContentSection = HeroSection | FeaturesSection | TrustSection | FaqSection | LeadFormSection`
    - Export all constituent types individually for use in component prop interfaces
  - [x] 3.3 Implement `generateStaticParams` in `app/[produkt]/page.tsx`
    - Import the server Supabase client from `@/lib/supabase/server`
    - Query `produkte` joined with `generierter_content` using a single query (avoid N+1):
      - Filter: `produkte.status = 'publiziert'` AND `generierter_content.page_type = 'hauptseite'` AND `generierter_content.status = 'publiziert'`
      - Select only `produkte.slug` — no `SELECT *`
    - Return `slugs.map(row => ({ produkt: row.slug }))`
    - Wrap in try/catch; on error log to console and return `[]` so the build does not fail silently with an uncaught exception
  - [x] 3.4 Implement `generateMetadata` in `app/[produkt]/page.tsx`
    - Accept `{ params: { produkt: string } }`
    - Fetch `meta_title`, `meta_desc`, `slug` from `generierter_content` joined with `produkte` where slug matches and `page_type = 'hauptseite'`
    - If no row is found, return a minimal fallback `Metadata` object (do not throw or call `notFound` here — the page component handles that)
    - Call `buildProduktMetadata({ slug, meta_title, meta_desc })` from `@/lib/seo/metadata` and return its result
  - [x] 3.5 Implement the page default export in `app/[produkt]/page.tsx`
    - Export `export const revalidate = 3600` and `export const dynamicParams = true` at module scope
    - Accept `{ params: { produkt: string } }`
    - Fetch `generierter_content.content` (JSONB), `title`, `slug` for the matching slug and `page_type = 'hauptseite'` using the server Supabase client
    - If the row is not found or `status !== 'publiziert'`, call `notFound()` from `next/navigation`
    - Parse `content.sections` as `ContentSection[]`; if parsing fails return `notFound()`
    - Render sections via a `renderSection(section: ContentSection, index: number)` helper function defined in the same file:
      - `type === 'hero'` → `<Hero ...section />`
      - `type === 'features'` → `<FeatureGrid items={section.items} />`
      - `type === 'trust'` → `<TrustBar items={section.items} />`
      - `type === 'faq'` → `<FAQ ...section />` (import placeholder — component built in a future spec)
      - `type === 'lead_form'` → `<LeadForm ...section />` (import placeholder — component built in a future spec)
      - Unknown types: return `null` (no error, no log)
    - Wrap the sections list in a `<main>` element
    - Build Schema.org JSON-LD using `buildInsuranceAgencySchema`, `buildProductSchema`, `buildBreadcrumbSchema`, and `combineSchemas` from `@/lib/seo/schema`
    - Inject the combined schema string into the page via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: combinedSchema }} />`
    - Place the script tag inside a `<Head>`-equivalent structure — in Next.js App Router inject it inside the returned JSX directly, not via a separate Head component
  - [x] 3.6 Verify page tests pass
    - Run only the 3–5 tests written in 3.1 (`vitest run app/\[produkt\]`)
    - Confirm no TypeScript errors (`tsc --noEmit`)

**Acceptance Criteria:**
- All 3–5 tests written in 3.1 pass
- `generateStaticParams` returns only published slugs and does not crash when Supabase returns an error
- `generateMetadata` returns a Metadata object with correct canonical URL
- Section renderer renders known section types and silently skips unknown ones
- JSON-LD script tag is present in the rendered HTML
- `revalidate = 3600` and `dynamicParams = true` are exported
- `notFound()` is called for unpublished or missing products

---

### ISR and On-Demand Revalidation

#### Task Group 4: On-Demand Revalidation in Admin Content Route
**Dependencies:** Task Group 3

- [x] 4.0 Wire on-demand revalidation to the admin content publish action
  - [x] 4.1 Locate or create `app/api/admin/content/route.ts`
    - If the file does not yet exist, create a minimal POST handler that returns `405 Method Not Allowed` for non-POST requests — this is a placeholder scaffold for the full admin content API built in a later spec
    - If the file already exists, read it fully before editing
  - [x] 4.2 Add `revalidatePath` call on content publish
    - Import `revalidatePath` from `next/cache`
    - After a successful publish action (status change to `'publiziert'`), call `revalidatePath('/[produkt]', 'page')` passing the specific product slug so only that path is invalidated, not all product pages
    - Guard the call: only invoke `revalidatePath` when the incoming request is authenticated (check Supabase Auth session via the server client — even a basic session presence check is sufficient for now)
    - Return a JSON response `{ data: { revalidated: true, slug }, error: null }` on success following the project API response format
    - Return `{ data: null, error: { code: 'UNAUTHORIZED', message: '...' } }` with status 401 when no session is present
  - [x] 4.3 Confirm ISR and revalidation behaviour (manual verification)
    - Confirm `export const revalidate = 3600` is present in `app/[produkt]/page.tsx`
    - Confirm `revalidatePath` is called only in `app/api/admin/content/route.ts`, not in the public page
    - No automated tests required for this task group — manual confirmation and code review are sufficient given the narrow scope

**Acceptance Criteria:**
- `revalidatePath` is called in the admin content route on publish, not in the public page
- Unauthenticated requests to the admin route receive a 401 response
- `export const revalidate = 3600` is confirmed in the page file
- The public page does not trigger full site rebuilds on single-product publishes

---

### Testing Review and Gap Analysis

#### Task Group 5: Test Review and Critical Gap Fill
**Dependencies:** Task Groups 1–4

- [x] 5.0 Review all feature tests and fill critical gaps
  - [x] 5.1 Review tests from Task Groups 1–3
    - Review the 2–5 SEO utility tests from Task 1.1
    - Review the 2–5 section component tests from Task 2.1
    - Review the 3–5 page module tests from Task 3.1
    - Identify any critical user-facing behaviour that has no test coverage at all
    - Focus only on this spec's scope: SEO metadata correctness, section rendering, 404 for unpublished products, JSON-LD presence
  - [x] 5.2 Write up to 8 additional strategic tests to fill identified critical gaps
    - Write a test confirming that `notFound()` is invoked when the Supabase response returns a row with `status = 'entwurf'`
    - Write a test confirming that `combineSchemas` output is valid JSON and contains `"@context": "https://schema.org"`
    - Write a test confirming the `TrustBar` renders zero items when passed an empty array without throwing
    - Write a test confirming the `Hero` CTA `<a>` tag has an `href` starting with `#` (anchor-only, no page reload)
    - Add up to 4 further tests only if a critical workflow gap is found during review — do not write tests for non-critical paths or edge cases
    - Do not exceed 8 additional tests total in this task group
  - [x] 5.3 Run all feature-specific tests
    - Run the complete set of tests written across task groups 1–3 plus the additions from 5.2
    - Expected total: approximately 9–23 tests
    - Run only feature-scoped tests, not the entire application test suite
    - All tests must pass before this spec is considered complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 9–23 tests total)
- `notFound()` path for unpublished products is covered
- JSON-LD structural correctness is covered
- No more than 8 additional tests added in this task group
- Zero TypeScript errors across all files introduced by this spec

---

## Execution Order

Recommended implementation sequence based on dependency graph:

1. SEO Utility Libraries (Task Group 1) — pure functions, no dependencies, unblocks everything else
2. Section Components + Tailwind Config (Task Group 2) — no data dependencies, can be built and tested in isolation
3. SSG Page Shell (Task Group 3) — requires both SEO utilities and section components to be importable
4. On-Demand Revalidation (Task Group 4) — thin addition on top of the completed page; requires Task Group 3
5. Test Review and Gap Fill (Task Group 5) — runs last, after all implementation is stable

## Files Created by This Spec

- `lib/seo/metadata.ts`
- `lib/seo/schema.ts`
- `lib/types/content.ts`
- `components/sections/Hero.tsx`
- `components/sections/FeatureGrid.tsx`
- `components/sections/TrustBar.tsx`
- `app/[produkt]/page.tsx`
- `app/api/admin/content/route.ts` (scaffold or extended)
- `public/images/hero-bg.jpg` (copied from `sterbegeld24plus-recreation/assets/`)
- `tailwind.config.ts` (created or extended)
