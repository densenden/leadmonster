# Specification: FAQ Public Page with Schema Markup

## Goal
Render a fully SSG-built public FAQ page for each product at `app/[produkt]/faq/page.tsx` that surfaces all FAQ items from `generierter_content`, applies `FAQPage` Schema.org JSON-LD, and formats every question/answer pair according to AEO rules so KI-Suche (ChatGPT, Perplexity, Gemini) can extract direct answers.

## User Stories
- As a visitor, I want to read clear answers to the most common questions about a product so that I can make an informed decision without speaking to a consultant.
- As a search engine or AI crawler, I want structured FAQ data in JSON-LD and semantically correct HTML so that individual answers can surface as featured snippets or AI-generated responses.

## Specific Requirements

**SSG Data Fetching from `generierter_content`**
- Use Next.js `generateStaticParams` to pre-render one FAQ page per active product slug fetched from the `produkte` table (status = `aktiv`)
- Query `generierter_content` filtered by `produkt_id` and `page_type = 'faq'` and `status = 'publiziert'` using the Supabase server client from `lib/supabase/server.ts`
- Select only the columns needed: `title`, `meta_title`, `meta_desc`, `content`, `schema_markup`
- Use Next.js `revalidate` set to the same ISR interval as the main product page (e.g., `export const revalidate = 3600`) so both pages stay cache-consistent
- Return a 404 via `notFound()` if no published FAQ record exists for the product slug

**Content Data Shape (FAQ section from `content` JSONB)**
- The `content` field is a JSONB object with a `sections` array; the FAQ page reads the section where `type === 'faq'`
- Each FAQ item has the shape `{ frage: string, antwort: string }` as defined in the existing content output format
- Enforce a minimum of 10 FAQ items; if fewer than 10 are present, the page still renders but logs a warning server-side
- The page component passes the items array to `components/sections/FAQ.tsx` as a typed prop

**`components/sections/FAQ.tsx` — Accordion Q&A Component**
- Implement as a Client Component (`'use client'`) because accordion open/close state requires interactivity
- Accept props: `items: Array<{ frage: string; antwort: string }>` and an optional `className` string
- Render each item as a `<details>`/`<summary>` pair for native accessibility, or replicate the same semantics with ARIA `role="region"`, `aria-expanded`, and `aria-controls` if a custom animated variant is preferred
- Only one item open at a time by default; support toggling any item independently
- Animate open/close with `transition: height var(--duration-normal) var(--ease-standard)` (150–250ms, no bounce); respect `prefers-reduced-motion` by disabling transitions
- Apply design tokens from `design-tokens/tokens.json`: body font `Nunito Sans`, heading font `Roboto`, border `#e5e5e5`, text `#333333`/`#666666`, primary accent `#abd5f4`, section background `#f8f8f8`
- Each `<summary>` renders the question as an `<h3>` with font-weight 700 and font-size matching the `h3` token (22px desktop)

**AEO Formatting Rules**
- The question string must be phrased exactly as a user would type it into a search box — this is enforced during content generation, not at render time, but the component must render the question string verbatim without truncation
- The first sentence of the answer must be a complete, self-contained direct response — render the stored answer string verbatim
- The answer text is rendered as a `<p>` element (plain text, no Markdown parsing needed since Claude outputs plain text into this field)
- Do not add intro text, framing phrases, or marketing copy before the answer

**Schema.org `FAQPage` JSON-LD**
- Inject a `<script type="application/ld+json">` tag in the page head via Next.js metadata or inline script
- The JSON-LD object must be `@type: "FAQPage"` with a `mainEntity` array where each entry is `@type: "Question"` with `name` (the question) and `acceptedAnswer` of `@type: "Answer"` with `text` (the full answer)
- Pull this markup from `schema_markup` JSONB column in `generierter_content` if already stored; if absent, generate it at render time from `content.sections[faq].items`
- The `BreadcrumbList` schema is also injected on the same page: three items — Home (`/`), Produkt (`/{slug}`), FAQ (`/{slug}/faq`)
- Both schema blocks can be combined into a single `@graph` array or emitted as two separate `<script>` tags

**`generateMetadata` for FAQ Route**
- Export an async `generateMetadata` function in `app/[produkt]/faq/page.tsx`
- Title pattern: use `meta_title` from DB if present; fallback to `"Häufige Fragen zu {produkt.name} | {count} Antworten"` — max 60 characters
- Description: use `meta_desc` from DB if present; fallback to `"Hier finden Sie {count} häufige Fragen und Antworten rund um {produkt.name}. Informieren Sie sich jetzt."` — max 160 characters
- Set canonical URL to `https://{domain}/{slug}/faq` (domain resolved from `produkte.domain` or `NEXT_PUBLIC_BASE_URL` env var)
- Set `robots: { index: true, follow: true }` only when `status = 'publiziert'`; set `noindex` for any other status

**Page Layout and Navigation**
- The page header renders a `<nav aria-label="Breadcrumb">` with three crumbs: "Startseite" → product name → "FAQ" using `<ol>` and `<li>` elements
- Include a prominent back-link to the main product page (`/{slug}`) labeled "Zurück zur Produktseite" placed above the FAQ list
- After the FAQ accordion, include a CTA section linking to the lead form on the main product page (`/{slug}#formular`) with text "Noch Fragen? Jetzt unverbindlich anfragen"
- Apply the Navy + Gold premium visual language from `sterbegeld24plus-recreation/styles.css` as the reference: primary `#1a365d`, accent gold `#d4af37`, background `#f7fafc`, container max-width 1200px

**Supabase Query Pattern**
- Use a single query or two sequential queries (join `produkte` + `generierter_content`); never N+1 per FAQ item
- Use the Supabase server client (service role) from `lib/supabase/server.ts` for all data fetching in Server Components and `generateMetadata`
- Select only needed columns; do not fetch `generated_at`, `published_at`, or admin-only fields on the public page

## Existing Code to Leverage

**`lib/supabase/server.ts` — Supabase Server Client**
- Already defined as the service-role client for server-side data fetching
- Use this client in both `generateStaticParams` and the page component; do not instantiate a new client inline

**`lib/seo/schema.ts` — Schema.org JSON-LD Generator**
- Planned module for generating structured data across all page types
- Add `generateFAQPageSchema(items)` and `generateBreadcrumbSchema(crumbs)` functions here; call them from the page rather than building JSON-LD inline

**`lib/seo/metadata.ts` — Next.js Metadata Generator**
- Planned shared metadata generation module
- Add a `buildFAQMetadata(produkt, faqRecord, itemCount)` helper; delegate to it from the `generateMetadata` export in the page file to keep pages lean

**`design-tokens/tokens.json` — Design Token Source**
- Present at `/design-tokens/tokens.json` with colors, typography (Nunito Sans body, Roboto headings), and spacing values
- Tailwind config must extend these tokens; use Tailwind utility classes throughout, not inline style attributes

**`sterbegeld24plus-recreation/styles.css` — Visual Reference**
- Defines the premium Navy + Gold design language (`--primary: #1a365d`, `--accent: #d4af37`) to follow for the pilot product
- Follow the same card/section styling: white cards with box-shadow, `border-radius: 12px`, hover `translateY(-2px)` transitions, and the `.container` layout wrapper pattern

## Out of Scope
- Admin UI for editing or reordering FAQ items (covered by the content-preview-editing spec)
- Real-time or client-side fetching of FAQ data
- Pagination or search/filter within the FAQ list
- User-submitted questions or community Q&A features
- Multi-language support or i18n routing
- FAQ items sourced from anywhere other than `generierter_content`
- Email capture or lead form embedded directly on the FAQ page
- Analytics event tracking for accordion interactions
- A/B testing of FAQ ordering or copy
