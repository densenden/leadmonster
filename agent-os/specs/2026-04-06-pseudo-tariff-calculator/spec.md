# Specification: Pseudo-Tariff Calculator

## Goal
Provide a two-step, purely illustrative tariff calculator at `app/[produkt]/tarife/page.tsx` that converts visitor curiosity about pricing into a captured lead by showing a pre-configured monthly premium range and immediately surfacing the lead form with `intent_tag` preset to `"preis"`.

## User Stories
- As a visitor, I want to enter my age and desired payout sum to see an example monthly premium range, so that I can quickly assess affordability before speaking to an advisor.
- As a sales team member, I want every calculator interaction to pre-tag the resulting lead as price-motivated, so that follow-up can be targeted accordingly.

## Specific Requirements

**Two-step calculator flow**
- Step 1: User selects Alter (age) and Wunschsumme; result card animates in showing the premium range and example insurer names.
- Step 2: A prominent CTA button below the result reveals the `LeadForm` component in-page (no navigation); the form receives `intentTag="preis"` as a prop.
- State for current step, selected inputs, and whether the lead form is visible is managed locally inside `TarifRechner.tsx` via `useState`.
- No page reload or route change between steps; smooth fade/slide transition on result reveal (150–250ms, `ease-decelerate`).

**Age input — Alter**
- Rendered as both a range slider and a synchronized number input side-by-side; both controls update the same state value.
- Valid range: 40–85 (inclusive); step 1.
- Default value: 55 (representative mid-range for target demographic Senioren 50+).
- Slider uses native `<input type="range">`; styled with Tailwind and design-token colors.
- ARIA label "Ihr Alter" on the slider; visible label "Alter (Jahre)" above the control pair.

**Sum select — Wunschsumme**
- Rendered as a styled `<select>` or a button-group toggle (5 options, single-select): 5.000 €, 7.500 €, 10.000 €, 12.500 €, 15.000 €.
- Default selection: 10.000 €.
- ARIA label "Gewunschte Versicherungssumme"; visible label above the control.

**Static example data table — per product type**
- Data lives in a TypeScript constant file `lib/tarif-data.ts` (not in the DB; no API call).
- Structure: `Record<ProduktTyp, AgeBracket[]>` where each `AgeBracket` has `minAge`, `maxAge`, and a nested map of sum → `{ low: number; high: number }` monthly premium in EUR.
- Product types covered: `sterbegeld`, `pflege`, `leben`, `unfall`.
- Age brackets for `sterbegeld` (pilot): 40–49, 50–59, 60–69, 70–79, 80–85 — each with all five sum tiers.
- Values are illustrative round numbers; must be clearly plausible but intentionally imprecise to avoid regulatory issues.

**Result display**
- Shows headline "Etwa X € – Y € pro Monat" where X/Y are the `low`/`high` values for the matched bracket and sum.
- Below the range: a row of 2–3 example insurer placeholder names drawn from `produkt_config.anbieter` passed as a prop; rendered as small badges.
- Mandatory disclaimer block rendered directly beneath the result, always visible once a result is shown: "Dies ist eine unverbindliche Beispielrechnung auf Basis von Musterdaten. Der tatsächliche Beitrag hängt von Ihren persönlichen Angaben und den Konditionen des jeweiligen Versicherers ab."
- Disclaimer styled in muted text color at `text-sm`; not collapsible.

**Lead form integration**
- After result is shown, a CTA button "Ihren genauen Beitrag jetzt anfragen" is visible.
- Clicking the button sets local state `showLeadForm = true`; the existing `LeadForm` component renders below the calculator card with prop `intentTag="preis"`.
- `LeadForm` must accept `intentTag` as a required prop and include it in the POST body to `/api/leads`.
- Scroll the page to the lead form automatically (`scrollIntoView`) after reveal.

**Page component — `app/[produkt]/tarife/page.tsx`**
- Async Server Component; fetches `produkt` row and `produkt_config` row from Supabase server client using the `produkt` param.
- Returns 404 (`notFound()`) if product not found or status is not `aktiv`.
- Passes `produktTyp`, `produktName`, `anbieter` array, and `produktId` as props to the `TarifRechner` Client Component.
- Exports `generateMetadata` that returns `metaTitle` from `generierter_content` where `page_type = 'tarif'`; falls back to `"{ProduktName} Tarifrechner — Beitragsbeispiele"` (max 60 chars).

**Schema.org — HowTo markup**
- Inject `<script type="application/ld+json">` in the page's `<head>` via `lib/seo/schema.ts`.
- Schema type: `HowTo` with `name` "Sterbegeldversicherung Beitrag berechnen" (or equivalent per product).
- Three `HowToStep` entries: (1) Alter eingeben, (2) Wunschsumme wählen, (3) Beispielbeitrag ansehen und Angebot anfordern.
- `estimatedCost` omitted; include `tool` referencing the product name.

**`TarifRechner.tsx` component contract**
- Marked `"use client"` at top of file.
- Props interface: `produktTyp`, `produktName`, `anbieter: string[]`, `produktId: string`.
- No external data fetching inside the component; all example data imported from `lib/tarif-data.ts`.
- Export as named export `TarifRechner`; file at `components/sections/TarifRechner.tsx`.
- Tailwind classes must reference design-token values via the Tailwind config extension from `design-tokens/tokens.json`.

## Visual Design

No visual mockups provided for this spec. Design follows the established premium insurance aesthetic from `sterbegeld24plus-recreation/styles.css`:
- Navy primary (`#1a365d`) for headings and structural elements; gold accent (`#d4af37`) for CTA buttons and result highlight text.
- White card with `box-shadow` and `border-radius: 12px` for the calculator card surface.
- Result reveal: `opacity: 0 → 1` + `translateY(10px) → translateY(0)` at 250ms `ease-decelerate`.

## Existing Code to Leverage

**`components/sections/LeadForm.tsx`**
- Existing lead capture form component; `TarifRechner` renders it in step 2 with `intentTag="preis"` prop.
- Extend `LeadForm` to accept and forward an optional `intentTag: string` prop into the `/api/leads` POST body.

**`lib/seo/schema.ts`**
- Existing schema.org generator; add a new `generateHowToSchema(params)` exported function following the same pattern as existing generators (`FAQPage`, `InsuranceAgency`).

**`lib/seo/metadata.ts`**
- Existing Next.js metadata generator; reuse the `generierter_content` fetch-by-`page_type` pattern with the value `'tarif'` and a constructed fallback string.

**`lib/supabase/server.ts`**
- Existing Supabase server client; use for data fetching in `app/[produkt]/tarife/page.tsx` exactly as used in other `[produkt]` sub-route pages.

**`design-tokens/tokens.json` + `design-tokens/tailwind-config-snippet.js`**
- Brand Blue `#abd5f4`, Brand Orange `#ff9651`, text/spacing scales; all Tailwind utility classes in `TarifRechner.tsx` must use token-mapped names rather than arbitrary hex values.

## Out of Scope
- No real-time tariff API integration of any kind — all data is static and hardcoded in `lib/tarif-data.ts`.
- No server-side calculation route; lookup happens entirely client-side.
- No admin UI for editing example premium data.
- No PDF export or result sharing functionality.
- No user account or saved-calculation feature.
- No comparison of multiple age/sum combinations simultaneously.
- No email capture at the result step — only at the full lead form step.
- No Confluence or Resend integration inside this spec — handled by the separate `2026-04-06-lead-form-capture-api` spec.
- No changes to the `leads` database schema — `intent_tag` column already exists per CLAUDE.md.
- No populated premium data for `pflege`, `leben`, `unfall` in initial implementation (placeholder structure only).
