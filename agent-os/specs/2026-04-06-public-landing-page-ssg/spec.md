# Specification: Public Landing Page with SSG

## Goal
Render a statically generated, SEO- and AEO-optimised public landing page for each published insurance product, driven entirely by stored JSON content from the `generierter_content` table, with Schema.org structured data injected into the page head.

## User Stories
- As a potential insurance customer, I want to land on a clear, fast-loading product page so that I can understand the product and submit my contact details.
- As a search engine or AI crawler, I want to find canonical URLs, structured metadata, and Schema.org JSON-LD so that the page is correctly indexed and surfaced in search and AI answers.

## Specific Requirements

**Static generation via `generateStaticParams`**
- Query Supabase server-side for all rows in `produkte` joined with `generierter_content` where `produkte.status = 'publiziert'` and `generierter_content.page_type = 'hauptseite'` and `generierter_content.status = 'publiziert'`
- Return an array of `{ produkt: slug }` objects for Next.js to pre-render at build time
- Use the Supabase server client from `lib/supabase/server.ts` (service role) for the build-time query
- Select only the columns needed: `slug` from `produkte`; avoid SELECT *

**`generateMetadata` — dynamic SEO metadata**
- Accept `{ params: { produkt: string } }` and fetch `meta_title`, `meta_desc`, and `slug` from `generierter_content` joined with `produkte` for the matching slug and `page_type = 'hauptseite'`
- Return a Next.js `Metadata` object via the helper in `lib/seo/metadata.ts`
- Set `title` from `meta_title` (max 60 chars), `description` from `meta_desc` (max 160 chars)
- Always set `alternates.canonical` to the absolute URL `https://{domain}/{produkt-slug}`
- Set `robots: { index: true, follow: true }` for published pages

**`lib/seo/metadata.ts` — Metadata generator**
- Export a function `buildProduktMetadata(params)` that accepts slug, meta_title, meta_desc, and optional domain, and returns a fully typed Next.js `Metadata` object
- Include Open Graph tags: `og:title`, `og:description`, `og:type = 'website'`, `og:url`
- Keep function pure and independently testable; no Supabase calls inside this utility

**`lib/seo/schema.ts` — Schema.org JSON-LD generator**
- Export `buildInsuranceAgencySchema(params)` — produces an `InsuranceAgency` object with `name`, `url`, `logo`, `sameAs`
- Export `buildProductSchema(params)` — produces a `Product` object with `name`, `description`, `brand`, `offers` placeholder
- Export `buildBreadcrumbSchema(items)` — produces a `BreadcrumbList` from an array of `{ name, url }` items
- Export `combineSchemas(...schemas)` — wraps multiple schema objects into a single `@graph` JSON-LD script tag string
- All functions return plain objects; the page component injects them via a `<script type="application/ld+json">` tag

**Section renderer in `app/[produkt]/page.tsx`**
- Fetch `generierter_content.content` (JSONB) for the matching slug and `page_type = 'hauptseite'`
- Iterate over `content.sections` array and render the appropriate component based on `section.type`: `hero` → `Hero`, `features` → `FeatureGrid`, `trust` → `TrustBar`, `faq` → `FAQ`, `lead_form` → `LeadForm`
- Unknown section types are silently skipped with no render (no error thrown)
- All section components are Server Components except `LeadForm`, which is a Client Component
- Pass each section's data as typed props — define a discriminated union TypeScript type `ContentSection` covering all known section types

**`components/sections/Hero.tsx`**
- Accept props: `headline: string`, `subline: string`, `cta_text: string`, `cta_anchor: string`
- Render a full-width hero with a dark Navy overlay (`#1a365d` at 70% opacity) over the product hero image served from `public/images/hero-bg.jpg`
- CTA button scrolls to the `cta_anchor` element on the same page; implement as an `<a href={cta_anchor}>` — no JS required
- Headline uses the h1 token scale (36px desktop / 34.2px mobile, Roboto 700) in white; subline in white at 90% opacity
- Mobile: headline scales to 2.5rem, padding reduces proportionally

**`components/sections/FeatureGrid.tsx`**
- Accept props: `items: Array<{ icon: string; title: string; text: string }>`
- Render a CSS grid with `auto-fit, minmax(300px, 1fr)` columns; each card has a white background, 12px border radius, box shadow, and a 4px Gold (`#d4af37`) bottom border on hover
- Icon is rendered via a simple icon map for the values Claude will generate (`shield`, `check`, `star`, `clock`, `heart`, `euro`)
- Card title uses Navy `#1a365d`, body text uses muted `#4a5568`

**`components/sections/TrustBar.tsx`**
- Accept props: `items: Array<{ label: string; value: string }>` representing trust signals
- Render a full-width Navy (`#1a365d`) background bar, flex row, `justify-center`, `gap-16`
- Each item shows a large bold Gold (`#d4af37`) value above a smaller white label
- Collapses to a 2-column grid on mobile

**ISR revalidation strategy**
- Set `export const revalidate = 3600` in `app/[produkt]/page.tsx` for hourly ISR
- When a product is published in the admin, call `revalidatePath('/[produkt]')` from `app/api/admin/content/route.ts` for immediate on-demand revalidation
- Do not use full rebuild for single-product publishes

**404 handling for unpublished or unknown products**
- If the runtime fetch returns no row or a row with `status != 'publiziert'`, call `notFound()` from `next/navigation`
- Set `dynamicParams = true` in the page file to allow runtime fallback for slugs not pre-built at build time

**Tailwind token integration**
- Extend `tailwind.config.ts` with values from `design-tokens/tokens.json`: primary blue `#abd5f4`, brand orange `#ff9651`, heading text `#333333`, body text `#666666`
- For the landing page, the Navy/Gold palette is applied via Tailwind arbitrary values (`bg-[#1a365d]`, `text-[#d4af37]`) as an interim approach until a full token migration is done
- Roboto and Nunito Sans loaded via `next/font/google` in `app/layout.tsx`

## Visual Design
No mockup files are present in `planning/visuals/`. Design references are derived from `sterbegeld24plus-recreation/styles.css` and `design-tokens/tokens.json`.

## Existing Code to Leverage

**`sterbegeld24plus-recreation/styles.css` — Navy/Gold design reference**
- Primary Navy `#1a365d`, accent Gold `#d4af37`, muted text `#4a5568`, light background `#f7fafc`
- Hero pattern: full-width image with `linear-gradient(rgba(26,54,93,0.7), ...)` overlay, white text, centered H1
- Feature card pattern: white card, box shadow, 12px radius, Gold bottom border on hover
- Trust bar pattern: Navy background, full-width, flex row centered items
- CTA button: Gold background, hover to `#b8860b`, `translateY(-2px)` lift

**`design-tokens/tokens.json` — spacing, typography, shadow tokens**
- Section spacing: small 40px, default 70px, large 140px — use for vertical section padding
- Shadow token `0 2px 8px rgba(0,0,0,.08)` for card default state
- Roboto 700 headings, Nunito Sans 300/400 body, line-height 1.6

**`sterbegeld24plus-recreation/assets/hero-bg.jpg` — hero background image**
- Copy to `public/images/hero-bg.jpg`; reference as a static asset; used as default hero background for all products

**Supabase server client (`lib/supabase/server.ts`)**
- Use service-role server client for all build-time and server-side data fetching; never expose service role key to the browser
- Select only required columns per query performance standards

## Out of Scope
- FAQ, Vergleich, Tarife, and Ratgeber sub-pages
- `sitemap.xml`, `robots.txt`, and `llms.txt` generation
- Lead form submission logic and `/api/leads` route
- Admin content generation and publish workflow UI
- Per-product custom hero images
- Authentication or access control on public pages
- Confluence integration and Resend email sending
- The Pseudo-Tarifrechner component
- Internationalization or multi-language support
