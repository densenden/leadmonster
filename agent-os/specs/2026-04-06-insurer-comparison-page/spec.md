# Specification: Insurer Comparison Page

## Goal

Render a statically generated comparison page for each product at `app/[produkt]/vergleich/page.tsx` that displays a structured table of insurers from `produkt_config.anbieter` against feature criteria from `generierter_content`, closes with a lead form CTA, and is fully instrumented with `ItemList + Product` Schema.org JSON-LD for SEO and AEO.

## User Stories

- As a visitor, I want to compare insurers side by side on a single page so that I can make an informed choice without leaving the site.
- As a visitor, I want to request a personal offer directly from the comparison page so that I do not have to navigate elsewhere to convert.

## Specific Requirements

**SSG page — `app/[produkt]/vergleich/page.tsx`**
- Implement as a Next.js Server Component using `generateStaticParams` to pre-render one page per product with `status = 'aktiv'`
- Fetch both the product record (`produkte` + `produkt_config`) and the `generierter_content` row where `page_type = 'vergleich'` in a single server-side call using the Supabase server client (`lib/supabase/server.ts`)
- Return `notFound()` when no published `vergleich` content row exists for the product slug
- Inject the `schema_markup` field from `generierter_content` as a `<script type="application/ld+json">` tag inside the page's `<head>` via Next.js script injection
- Pass the parsed `content` JSON and the `anbieter` array from `produkt_config` as props to `Vergleich.tsx`

**`generateMetadata` for the comparison page**
- Export an async `generateMetadata` function that reads `meta_title` and `meta_desc` from the `generierter_content` row
- `meta_title` must follow the pattern "{Produktname} Anbieter im Vergleich {Jahr}" and must not exceed 60 characters
- Set `alternates.canonical` to the full URL `/{produkt}/vergleich`
- Fall back to a sensible default title and description when no DB row exists

**`components/sections/Vergleich.tsx` — comparison table**
- Accept props: `anbieter: string[]`, `criteria: { label: string; values: Record<string, string | boolean> }[]`, `produktName: string`, `generatedAt: string`
- Render an HTML `<table>` with semantic `<thead>`, `<tbody>`, `<th scope="col">`, `<th scope="row">` for full accessibility
- First column is the criterion label (row header), subsequent columns are each insurer name
- Boolean values render as a checkmark icon (SVG, inline, aria-label="Ja") or dash (aria-label="Nein"); string values render as plain text
- Wrap the table in a `div` with `overflow-x-auto` for horizontal scroll on mobile; table itself uses `min-w-full` to prevent column collapse
- Apply design tokens: Navy primary (`#1a365d` from `sterbegeld24plus-recreation/styles.css`) for table header background, Gold accent (`#d4af37`) for highlighted cells or best-value badges

**Content JSON shape for vergleich section**
- The `generierter_content.content` JSONB field for `page_type = 'vergleich'` must include a `vergleich` section with the structure: `{ type: "vergleich", intro: string, criteria: [{ label, values: { [anbieter]: string | boolean } }] }`
- The intro text (2–3 sentences) names the product, lists the insurers, and states the comparison date — satisfying AEO entity-naming requirements
- This structure is populated by the Claude generator in `lib/anthropic/generator.ts`; the page consumes it read-only

**Schema.org `ItemList + Product` JSON-LD**
- The `schema_markup` stored in `generierter_content` must contain an `ItemList` wrapping one `Product` per insurer
- Each `Product` item must include: `name` (insurer name), `description` (brief insurer summary from criteria), `offers.@type = "Offer"`, `offers.category` = product type (e.g., "Sterbegeldversicherung")
- Wrap the `ItemList` in a top-level `BreadcrumbList` with three entries: Startseite → {Produktname} → Vergleich
- The full markup is stored in DB and served verbatim; `lib/seo/schema.ts` contains the generator function used at content-generation time

**Breadcrumb UI above the table**
- Render a visible breadcrumb trail above the page heading: "Startseite / {Produktname} / Vergleich" using `<nav aria-label="Breadcrumb">` with `<ol>` and `<li>` elements
- Link items use Next.js `<Link>` component; current page (Vergleich) is not linked, has `aria-current="page"`

**Disclaimer below the table**
- Display a single line of muted body text immediately below the `</table>`: "Alle Angaben ohne Gewähr. Stand: {generated_at formatted as DD.MM.YYYY}."
- Use the `generated_at` timestamp from the `generierter_content` row; format it server-side before passing to the component

**Lead form CTA section**
- Reuse the existing `components/sections/LeadForm.tsx` component unchanged
- Pass `intentTag="preis"` as prop, along with `produktId` from the fetched product record
- Render the CTA section below the disclaimer with a heading: "Ihren persönlichen Tarif jetzt anfragen" (H2)
- Wrap in a visually distinct container using `bg-[#e1f0fb]` (background.primary from design tokens) with adequate vertical padding

**Responsive behavior**
- Table section: horizontal scroll (`overflow-x-auto`) on viewports below `md` breakpoint; column widths use `min-w-[140px]` per insurer column to keep text readable
- Lead form CTA stacks vertically on mobile by default (LeadForm component handles this internally)
- Page padding: `px-4 md:px-8 lg:px-0` inside a max-width container (`max-w-6xl mx-auto`)

## Visual Design

No mockup files are present in `planning/visuals/`. Design follows existing reference from `sterbegeld24plus-recreation/styles.css` and `design-tokens/tokens.json`.

## Existing Code to Leverage

**`lib/supabase/server.ts` — server-side Supabase client**
- Used by all SSG/SSR pages to query `generierter_content`, `produkte`, and `produkt_config`
- Apply the same pattern used in other `[produkt]` pages: single joined query, early `notFound()` guard

**`components/sections/LeadForm.tsx` — lead capture form**
- Already accepts `produktId` and `intentTag` props; pass `intentTag="preis"` from this page
- Do not modify LeadForm internals; the comparison page is purely a consumer

**`lib/seo/schema.ts` — Schema.org JSON-LD generator**
- Contains or will contain helper functions for `BreadcrumbList` and `ItemList + Product` markup
- The vergleich page reads stored `schema_markup` from DB; `schema.ts` is the generation-time utility

**`design-tokens/tokens.json` — design token source of truth**
- Brand Blue `#abd5f4` for secondary accents, Brand Orange `#ff9651` for highlights
- Background primary `#e1f0fb` for the CTA section container
- `Nunito Sans` body font and `Roboto` heading font applied via Tailwind config extension

**`sterbegeld24plus-recreation/styles.css` — pilot product reference**
- Navy `#1a365d` and Gold `#d4af37` establish the premium insurance aesthetic for table headers and highlighted cells
- `box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1)` pattern reused for table container card elevation

## Out of Scope

- Live insurer API integration or real-time pricing data
- Sortable or filterable table columns (no client-side interactivity on the table)
- Admin UI for editing comparison criteria directly (managed via content generation flow)
- Per-insurer detail pages or modal popups
- User accounts, saved comparisons, or personalisation
- Print stylesheet or PDF export
- Pagination of insurers (all insurers from `anbieter` array appear in one table)
- Automated revalidation or ISR beyond standard `generateStaticParams` SSG
- Any email sequence triggered from this page (lead form submission triggers the existing `/api/leads` flow)
- Translation or multilingual support
