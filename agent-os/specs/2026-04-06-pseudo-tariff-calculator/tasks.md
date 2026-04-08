# Task Breakdown: Pseudo-Tariff Calculator

## Overview
Total Tasks: 4 task groups, 28 sub-tasks

## Task List

---

### Data Layer

#### Task Group 1: Static Tariff Data Module
**Dependencies:** None

- [x] 1.0 Complete static tariff data module
  - [x] 1.1 Write 2–4 focused tests for `lib/tarif-data.ts`
    - Test that `getAgeBracket('sterbegeld', 55, 10000)` returns the correct `low`/`high` pair
    - Test that an age at a bracket boundary (e.g., 50) resolves to the correct bracket and not the adjacent one
    - Test that an age outside the valid range (e.g., 39 or 86) returns `undefined` or a typed sentinel value, not a runtime error
    - Test that all five sum tiers exist for every `sterbegeld` bracket (structural completeness check)
    - Skip edge-case tests for `pflege`, `leben`, `unfall` — placeholder structure only
  - [x] 1.2 Define TypeScript types in `lib/tarif-data.ts`
    - `ProduktTyp` — union type: `'sterbegeld' | 'pflege' | 'leben' | 'unfall'`
    - `PremiumRange` — interface: `{ low: number; high: number }`
    - `SumMap` — `Record<number, PremiumRange>` keyed by sum in EUR (5000, 7500, 10000, 12500, 15000)
    - `AgeBracket` — interface: `{ minAge: number; maxAge: number; sums: SumMap }`
    - `TarifData` — `Record<ProduktTyp, AgeBracket[]>`
    - Export all types; use `interface` for object shapes, `type` for unions (strict mode)
  - [x] 1.3 Populate `TARIF_DATA` constant for `sterbegeld` (pilot product)
    - Five age brackets: 40–49, 50–59, 60–69, 70–79, 80–85
    - All five sum tiers per bracket: 5.000 €, 7.500 €, 10.000 €, 12.500 €, 15.000 €
    - Values must be illustrative round numbers — plausible but intentionally imprecise (no live tariff data)
    - Example representative ranges: age 50–59 / 10.000 € → `{ low: 18, high: 26 }` EUR/month
    - Export as `const TARIF_DATA: TarifData`; name in UPPER_SNAKE_CASE per coding-style standards
  - [x] 1.4 Add placeholder structures for `pflege`, `leben`, `unfall`
    - Each maps to an empty array `[]` so the `TarifData` type is satisfied without runtime errors
    - Add a `// TODO: populate when products are implemented` comment on each placeholder
  - [x] 1.5 Export a `getAgeBracket(typ, age, sum)` helper function
    - Signature: `(typ: ProduktTyp, age: number, sum: number) => PremiumRange | undefined`
    - Finds the first bracket where `age >= minAge && age <= maxAge`, then returns `sums[sum]`
    - Returns `undefined` if no bracket matched or the sum key is missing (graceful degradation)
    - Keep function small and focused — single responsibility
  - [x] 1.6 Ensure data layer tests pass
    - Run ONLY the 2–4 tests written in 1.1
    - Verify TypeScript compiles cleanly (`tsc --noEmit`)
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2–4 tests written in 1.1 pass
- `TARIF_DATA` constant satisfies `TarifData` type with no TypeScript errors
- `getAgeBracket` returns correct `PremiumRange` for all `sterbegeld` brackets and sums
- `getAgeBracket` returns `undefined` gracefully for out-of-range inputs
- Placeholder entries exist for `pflege`, `leben`, `unfall`

---

### Schema / SEO Layer

#### Task Group 2: HowTo Schema Generator
**Dependencies:** None (can run in parallel with Task Group 1)

- [x] 2.0 Complete `generateHowToSchema` function
  - [x] 2.1 Write 2–3 focused tests for `generateHowToSchema`
    - Test that the returned object has `@type: 'HowTo'` and a `name` matching the input `produktName`
    - Test that exactly three `HowToStep` entries exist in the `step` array with the correct `text` values
    - Test that the `tool` array contains one entry referencing the product name
    - Skip exhaustive JSON-LD spec compliance tests — focus on output shape only
  - [x] 2.2 Add `generateHowToSchema` to `lib/seo/schema.ts`
    - Follow the same export pattern as existing generators in the file (`generateFAQSchema`, `generateInsuranceAgencySchema` or equivalent)
    - Function signature: `generateHowToSchema(params: HowToSchemaParams): WithContext<HowTo>`
    - `HowToSchemaParams` interface: `{ produktName: string; produktSlug: string }`
    - Schema `name` field: `"{ProduktName} Beitrag berechnen"` — constructed from `params.produktName`
    - Three `HowToStep` entries (order matters for AEO):
      1. `name: 'Alter eingeben'`, `text: 'Geben Sie Ihr Alter zwischen 40 und 85 Jahren an.'`
      2. `name: 'Wunschsumme wählen'`, `text: 'Wählen Sie Ihre gewünschte Versicherungssumme zwischen 5.000 € und 15.000 €.'`
      3. `name: 'Beispielbeitrag ansehen und Angebot anfordern'`, `text: 'Sehen Sie Ihren unverbindlichen Beispielbeitrag und fordern Sie Ihr persönliches Angebot an.'`
    - `tool`: `[{ '@type': 'HowToTool', name: params.produktName }]`
    - Omit `estimatedCost` entirely (per spec)
    - Use `schema-dts` types if already present in the project; otherwise use typed plain objects
  - [x] 2.3 Ensure SEO schema tests pass
    - Run ONLY the 2–3 tests written in 2.1
    - Verify TypeScript compiles cleanly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2–3 tests written in 2.1 pass
- `generateHowToSchema` is exported from `lib/seo/schema.ts` alongside existing generators
- Output is valid JSON-LD shape with `@context`, `@type: 'HowTo'`, `name`, `step` array (3 items), and `tool` array
- No `estimatedCost` field present in the output
- TypeScript strict mode: no errors, no `any`

---

### Frontend Components

#### Task Group 3: TarifRechner Client Component + LeadForm Extension
**Dependencies:** Task Group 1 (requires `TARIF_DATA` and `getAgeBracket`)

- [x] 3.0 Complete `TarifRechner` component and `LeadForm` extension
  - [x] 3.1 Write 3–5 focused tests for `TarifRechner.tsx`
    - Test that the result card is NOT visible on initial render (step 1 only)
    - Test that after updating age to 65 and selecting sum 10.000 €, the result headline renders text matching `/\d+ € – \d+ € pro Monat/`
    - Test that the disclaimer text is present in the DOM once a result is shown
    - Test that clicking "Ihren genauen Beitrag jetzt anfragen" causes the `LeadForm` to appear in the DOM
    - Test that the `LeadForm` receives `intentTag="preis"` — verify via rendered hidden input or prop inspection
    - Skip testing animation timing, slider thumb styling, and responsive layout breakpoints
  - [x] 3.2 Extend `LeadForm` to accept `intentTag` prop
    - Add `intentTag?: string` to the `LeadForm` props interface (optional with no default — component works without it)
    - Include `intent_tag: intentTag` in the POST body object sent to `/api/leads`
    - Do not change any other behavior, layout, or styling of `LeadForm`
    - Verify `LeadForm` still renders correctly when `intentTag` is not provided (backward compatibility)
  - [x] 3.3 Create `components/sections/TarifRechner.tsx`
    - Mark `'use client'` at the very top of the file
    - Named export: `export function TarifRechner({ ... }: TarifRechnerProps)`
    - Props interface `TarifRechnerProps`:
      ```
      produktTyp: ProduktTyp
      produktName: string
      anbieter: string[]
      produktId: string
      ```
    - No data fetching inside the component; import `getAgeBracket` and `TARIF_DATA` from `@/lib/tarif-data`
    - State variables (all `useState`):
      - `age: number` — default `55`
      - `sum: number` — default `10000`
      - `showResult: boolean` — default `false`
      - `showLeadForm: boolean` — default `false`
  - [x] 3.4 Implement the Alter (age) input pair
    - Visible label `<label>` with text "Alter (Jahre)" above the control pair
    - Side-by-side layout: `<input type="range">` and `<input type="number">` sharing the same `age` state
    - Range and number input: `min={40}` `max={85}` `step={1}`; both controlled inputs
    - Slider ARIA: `aria-label="Ihr Alter"` on the `<input type="range">`
    - Both inputs call the same `onChange` handler that validates range (clamp to 40–85) before setting state
    - Tailwind classes use token-mapped color names from `design-tokens/tailwind-config-snippet.js` — do NOT use arbitrary hex values (`text-brand-blue` not `text-[#abd5f4]`)
    - Touch targets: slider thumb and number input minimum 44px height on mobile (responsive, mobile-first)
  - [x] 3.5 Implement the Wunschsumme select
    - Visible label above the control: "Wunschsumme"
    - Render as a styled `<select>` with five `<option>` elements: 5000, 7500, 10000, 12500, 15000
    - Option display text formatted with `toLocaleString('de-DE')` + " €" (e.g., "10.000 €")
    - ARIA: `aria-label="Gewünschte Versicherungssumme"` on the `<select>`
    - Default value: 10000 (matches `sum` state default)
    - On change: parse value to number and update `sum` state; call `setShowResult(true)` to trigger result display
  - [x] 3.6 Implement result calculation and display
    - Call `getAgeBracket(produktTyp, age, sum)` on every render; store result in a derived variable (no extra state)
    - When `showResult === true` AND result is defined, render the result card
    - Result card contents:
      - Headline: `"Etwa {result.low} € – {result.high} € pro Monat"` — styled with token accent color for the numbers
      - Insurer badges row: slice `anbieter` prop to first 3 items; render each as a `<span>` badge with token border color
      - Disclaimer block (always visible when result is shown, never collapsible): full German disclaimer text from spec; styled `text-sm` in token muted text color
    - Result reveal animation: Tailwind `transition-all duration-[250ms]`; use `opacity-0 translate-y-2.5` → `opacity-100 translate-y-0` toggled via a CSS class when `showResult` becomes true
    - Respect `prefers-reduced-motion`: wrap animation classes in a check or use `motion-safe:` Tailwind variant
  - [x] 3.7 Implement step 2 — CTA and LeadForm reveal
    - CTA button "Ihren genauen Beitrag jetzt anfragen" renders below the result card (only visible when result is shown)
    - Button styled with token accent/CTA color; minimum 44px touch target height
    - On click: set `showLeadForm(true)` and call `leadFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })` after state update (use `useEffect` with `showLeadForm` in dependency array)
    - A `ref` (`useRef<HTMLDivElement>(null)`) attaches to the wrapper `<div>` containing `<LeadForm>`
    - Render `<LeadForm intentTag="preis" produktId={produktId} />` inside the ref wrapper when `showLeadForm === true`
    - LeadForm wrapper also has a fade-in transition matching the result card animation
  - [x] 3.8 Apply responsive layout and accessibility
    - Mobile-first: single-column stacked layout for all controls
    - Tablet and desktop (md breakpoint): age slider and number input side-by-side in a flex row
    - Calculator card: white background, `shadow-md` (mapped from tokens `0 2px 8px rgba(0,0,0,.08)`), `rounded-xl` — note: tokens.json specifies `radius: 0px` but spec requires 12px card; use `rounded-xl` and note the token override in a comment
    - Heading hierarchy: use `<h2>` for calculator section heading inside the card; do not skip levels
    - All interactive elements keyboard-navigable; visible focus ring present
    - Add `<section aria-label="Beitragsrechner">` wrapper around the entire component
  - [x] 3.9 Ensure component tests pass
    - Run ONLY the 3–5 tests written in 3.1
    - Verify TypeScript compiles cleanly for `TarifRechner.tsx` and the updated `LeadForm.tsx`
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3–5 tests written in 3.1 pass
- `LeadForm` accepts `intentTag` prop and forwards it in the POST body; existing usage without the prop is unaffected
- `TarifRechner` renders with default age 55 and sum 10.000 € selected; result card hidden until sum is changed or age is adjusted
- Result card shows correct `low`/`high` values from `TARIF_DATA` for the selected bracket and sum
- Disclaimer always appears below result; is not collapsible
- CTA button appears after result; clicking it reveals `LeadForm` with `intentTag="preis"` and scrolls to it
- All Tailwind color classes reference token-mapped names, not arbitrary hex values
- Component is fully keyboard-navigable; ARIA labels on slider and select present
- Animation respects `prefers-reduced-motion` via `motion-safe:` variant or equivalent

---

### Page Integration

#### Task Group 4: Server Component Page + Metadata + Schema Injection
**Dependencies:** Task Groups 1, 2, and 3

- [x] 4.0 Complete `app/[produkt]/tarife/page.tsx` Server Component
  - [x] 4.1 Write 2–4 focused tests for the tarife page
    - Test that the page calls `notFound()` when the product row is not found in Supabase (mock the server client)
    - Test that the page calls `notFound()` when the product status is not `'aktiv'`
    - Test that `generateMetadata` returns the fallback title string when no `generierter_content` row exists for `page_type = 'tarif'`
    - Test that `generateMetadata` returns the `meta_title` from `generierter_content` when the row exists
    - Skip testing that Supabase SQL queries use correct column names — that belongs to integration tests
  - [x] 4.2 Create `app/[produkt]/tarife/page.tsx` as an async Server Component
    - Import Supabase server client from `@/lib/supabase/server` — same pattern as other `[produkt]` sub-route pages
    - Fetch `produkte` row filtered by `slug = params.produkt`
    - Fetch `produkt_config` row joined or queried by `produkt_id`
    - If no product found OR `produkte.status !== 'aktiv'`: call `notFound()` (Next.js 14 import from `next/navigation`)
    - Pass the following props to `<TarifRechner>`:
      - `produktTyp` — from `produkte.typ`
      - `produktName` — from `produkte.name`
      - `anbieter` — from `produkt_config.anbieter` (string array; fallback to `[]` if null)
      - `produktId` — from `produkte.id`
  - [x] 4.3 Inject HowTo JSON-LD schema into the page `<head>`
    - Call `generateHowToSchema({ produktName: produkt.name, produktSlug: produkt.slug })` inside the Server Component
    - Render `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />` in a Next.js `<head>` segment or via a wrapping layout — follow the same pattern used on other public product pages (e.g., FAQ page or Hauptseite)
  - [x] 4.4 Export `generateMetadata` from `app/[produkt]/tarife/page.tsx`
    - Use the existing `generierter_content` fetch-by-`page_type` pattern from `lib/seo/metadata.ts` with `page_type = 'tarif'`
    - If a row with `status = 'publiziert'` exists: use `meta_title` (max 60 chars enforced via `.slice(0, 60)`)
    - Fallback title: `"{ProduktName} Tarifrechner — Beitragsbeispiele"` — constructed dynamically; truncate to 60 chars if necessary
    - Return a Next.js `Metadata` object (import type from `next`)
    - Include `description` field: use `meta_desc` from `generierter_content` if available; otherwise omit or use a generic fallback
  - [x] 4.5 Verify page structure and ensure tests pass
    - Run ONLY the 2–4 tests written in 4.1
    - Manually verify in the dev server: visit `/sterbegeld24plus/tarife` — confirm the page renders, `<TarifRechner>` appears, JSON-LD script tag is present in the HTML source, and `<title>` matches expected metadata
    - Verify `notFound()` behavior by visiting a non-existent slug (e.g., `/nichtexistent/tarife`)
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2–4 tests written in 4.1 pass
- `app/[produkt]/tarife/page.tsx` is an async Server Component with no `'use client'` directive
- Page returns 404 for non-existent products and products with `status !== 'aktiv'`
- `<TarifRechner>` receives correct `produktTyp`, `produktName`, `anbieter`, and `produktId` props
- HowTo JSON-LD script tag present in rendered HTML `<head>` output
- `generateMetadata` returns correct title from DB when available; correct fallback when not
- TypeScript strict mode: no errors, no `any` types

---

### Test Review

#### Task Group 5: Test Review and Gap Analysis
**Dependencies:** Task Groups 1–4

- [x] 5.0 Review existing tests and fill critical gaps only
  - [x] 5.1 Review all tests produced in Task Groups 1–4
    - Review the 2–4 tests from Task Group 1 (data module)
    - Review the 2–3 tests from Task Group 2 (schema generator)
    - Review the 3–5 tests from Task Group 3 (TarifRechner component)
    - Review the 2–4 tests from Task Group 4 (page component)
    - Total existing tests: approximately 9–16 tests
  - [x] 5.2 Analyze test coverage gaps for this feature only
    - Identify critical user workflows not yet covered: e.g., end-to-end flow of age change → result display → CTA click → LeadForm visible
    - Focus ONLY on gaps related to this spec's requirements
    - Do NOT assess coverage of other features, the admin area, or the full application
    - Prioritize integration-level gaps over unit-level gaps
  - [x] 5.3 Write up to 10 additional strategic tests maximum
    - Add tests only if a critical gap is identified — do not pad for coverage percentage
    - Candidate gaps to check: interaction between age slider and number input staying in sync; `getAgeBracket` returning `undefined` for an out-of-range age passed from the component; `LeadForm` POST body containing `intent_tag: "preis"` when `intentTag` prop is set
    - Do NOT write: animation timing tests, pixel-level layout tests, exhaustive bracket-by-bracket data validation, or accessibility audits via automated tools
  - [x] 5.4 Run all feature-specific tests and verify
    - Run ONLY tests related to this spec: `lib/tarif-data`, `lib/seo/schema` (HowTo), `components/sections/TarifRechner`, `app/[produkt]/tarife/page`
    - Expected total: approximately 9–26 tests maximum
    - Do NOT run the full application test suite
    - All tests must pass before this task group is marked complete

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 9–26 tests total)
- The two-step calculator user flow is covered by at least one integration-level test
- No more than 10 additional tests added beyond Task Groups 1–4
- Testing is scoped exclusively to this spec's deliverables

---

## Execution Order

Recommended implementation sequence — Task Groups 1 and 2 have no interdependencies and can be worked in parallel:

1. **Task Group 1** — Static tariff data module (`lib/tarif-data.ts`): foundation for all client-side calculation
2. **Task Group 2** — HowTo schema generator (`lib/seo/schema.ts`): no runtime dependencies; can overlap with Group 1
3. **Task Group 3** — `TarifRechner` Client Component and `LeadForm` extension: depends on Group 1 (`getAgeBracket`)
4. **Task Group 4** — Server Component page, `generateMetadata`, schema injection: depends on Groups 1, 2, and 3
5. **Task Group 5** — Test review and gap analysis: depends on Groups 1–4 all being complete

## File Map

| File | Task Group | Action |
|---|---|---|
| `lib/tarif-data.ts` | 1 | Create new |
| `lib/seo/schema.ts` | 2 | Extend (add `generateHowToSchema`) |
| `components/sections/LeadForm.tsx` | 3 | Extend (add `intentTag` prop) |
| `components/sections/TarifRechner.tsx` | 3 | Create new |
| `app/[produkt]/tarife/page.tsx` | 4 | Create new |
