# Specification: Ratgeber Guide Pages

## Goal
Render statically generated, long-form decision guide articles for each insurance product with AEO-optimised structure, Schema.org Article + HowTo markup, internal linking, and a reading time estimate. Admins can generate additional guide articles on demand from the content management page.

## User Stories
- As a potential insurance customer, I want to read a detailed guide article about the product so that I can make an informed decision.
- As a search engine or AI crawler, I want to find structured Article and HowTo markup so that guide content is surfaced in featured snippets and AI answers.
- As an admin, I want to generate additional guide articles for a product so that I can expand the content library over time.

## Specific Requirements

**SSG route `app/[produkt]/ratgeber/[thema]/page.tsx`**
- `generateStaticParams` fetches all `produkte` rows with `status = 'publiziert'` joined with `generierter_content` where `page_type = 'ratgeber'` and `status = 'publiziert'`
- Returns array of `{ produkt: string, thema: string }` — `thema` is the `slug` column value
- Set `export const revalidate = 3600` for hourly ISR
- Set `dynamicParams = true` for runtime fallback
- Call `notFound()` if slug resolves to no published row

**Ratgeber index page `app/[produkt]/ratgeber/page.tsx`**
- Lists all published ratgeber articles for the product as a card grid
- Each card: article title, intro excerpt (~150 chars), reading time, link to article
- Own `generateMetadata` with title pattern "Ratgeber zu {Produkt} — Alle Guides"
- BreadcrumbList schema: Home > Produkt > Ratgeber
- Links to each article card: `/[produkt]/ratgeber/[thema]`

**Content data model — `content` JSONB sections**
- Ratgeber articles use a typed sections array with these section variants:
  - `intro`: `{ type, text }` — 2-3 sentence AEO-compliant lead paragraph (direct factual answer)
  - `body`: `{ type, heading, paragraphs: string[] }` — H2 section with body copy
  - `steps`: `{ type, heading, items: [{ number, title, description }] }` — numbered how-to steps (optional)
  - `cta`: `{ type, headline, cta_text, cta_anchor }` — lead form call-to-action
  - `related`: `{ type, articles: [{ slug, title }] }` — internal links to sibling ratgeber
- `slug` column stores the URL segment (e.g. `was-ist-sterbegeld`, `fuer-wen`, `kosten-leistungen`)
- Minimum 3 articles per product; each is a separate `generierter_content` row with `page_type = 'ratgeber'`

**`generateMetadata` per article**
- Fetches `meta_title`, `meta_desc`, `slug`, and `title` from `generierter_content` for the matching `page_type = 'ratgeber'` and slug
- Uses `lib/seo/metadata.ts` `buildProduktMetadata()` helper
- Canonical URL: `{NEXT_PUBLIC_BASE_URL}/{produkt}/ratgeber/{thema}`
- `robots: { index: true, follow: true }`

**Schema.org markup**
- `Article`: `headline`, `description`, `datePublished` (from `published_at`), `dateModified`, `author` (InsuranceAgency entity), `publisher`
- `BreadcrumbList`: Home > Produkt > Ratgeber > Article title
- `HowTo`: conditional — only emitted when `steps` sections are present; `name` = article title, `step` array from `steps.items`
- All schemas composed via `lib/seo/schema.ts` `combineSchemas()` and injected as `<script type="application/ld+json">`

**Article rendering**
- `intro` section: rendered as a `<p>` lead paragraph, styled larger than body text — AEO key (direct answer in first sentence)
- `body` sections: H2 heading + body paragraphs; sub-sections within body can use H3
- `steps` sections: ordered list with large numbered markers, each step has a bold title + description
- `cta` section: renders `LeadForm` component with pre-set `intentTag` derived from the article topic (articles about cost → `preis`, about coverage → `sicherheit`)
- `related` section: card row of 2-3 sibling article links at article end

**Reading time estimate**
- Calculated at render time: sum all text content from all sections, count words, divide by 200 (average reading speed), round up
- Display: "Lesezeit: ca. X Minuten" in small muted text below the article title
- Minimum displayed: "ca. 2 Minuten"

**Internal linking**
- Breadcrumb navigation rendered at top of every article using `BreadcrumbList` schema data
- `related` section links to sibling ratgeber slugs for the same product
- Each article links back to the main product landing page via a contextual inline link or the breadcrumb

**Admin: generate additional guides**
- `app/admin/produkte/[id]/content/page.tsx` includes a "Ratgeber" section listing all generated ratgeber rows with status badges
- "Weiteren Ratgeber generieren" button: opens a small form asking for a topic/slug suggestion, then calls POST `/api/generate` with `{ produktId, pageType: 'ratgeber', topic }` to generate one additional article
- Newly generated article appears in the list with `status = 'entwurf'` for review

## Existing Code to Leverage

**`lib/supabase/server.ts`** — service role client for all build-time and server-side fetches

**`lib/seo/schema.ts`** — `buildBreadcrumbSchema`, `buildArticleSchema`, `buildHowToSchema`, `combineSchemas`

**`lib/seo/metadata.ts`** — `buildProduktMetadata` function for consistent metadata across all public pages

**`lib/anthropic/generator.ts`** — `generateContent` extended to accept optional `topic` param for single ratgeber generation; reuses the same four-layer prompt architecture with an additional instruction to produce a single `ratgeber` section output

**`components/sections/LeadForm.tsx`** — reused inside the `cta` section with pre-set `intentTag`

**`app/[produkt]/page.tsx`** — establishes the section-type delegation pattern that ratgeber articles follow

## Out of Scope
- Full-text search across ratgeber articles
- Comments or user-generated content
- Author profile pages
- Article versioning or rollback
- Category taxonomy pages beyond the product-level ratgeber index
- Social sharing buttons
- Pagination within a single article
- PDF export of articles
- Scheduled article publication
