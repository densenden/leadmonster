# Specification: AI Content Generation Engine

## Goal

Build the core content generation pipeline that calls the Anthropic Claude API (`claude-opus-4-6`) to produce structured, SEO- and AEO-optimised page content for each insurance product, then persists the results to the `generierter_content` table with status `entwurf` for admin review.

## User Stories

- As an admin, I want to click "Content generieren" on a product and have all five page types automatically written by Claude so that I can review and publish them without writing copy manually.
- As a developer, I want generation failures for individual page types to be saved as partial errors so that a single Claude timeout does not discard all already-completed pages.

## Specific Requirements

**`generateContent(produktId)` function in `lib/anthropic/generator.ts`**
- Accept a single `produktId` (UUID string) and return a typed result object containing per-page-type success/error status.
- Fetch `produkte`, `produkt_config`, and all `wissensfundus` rows matching `kategorie = produkt.typ` from Supabase in a single composed query using the server-side Supabase client (`lib/supabase/server.ts`).
- Instantiate the Anthropic SDK with `process.env.ANTHROPIC_API_KEY` and use model `claude-opus-4-6` for all calls.
- Execute five sequential Claude calls: `hauptseite`, `faq`, `vergleich`, `tarif`, and three `ratgeber` sub-calls (one call per article, sharing the same assembled prompt context).
- Use `async/await`; wrap every individual Claude call in its own `try/catch` so a failure on one page type does not abort the remaining calls.
- Export a named TypeScript `interface GenerationResult` describing the per-page outcome shape.

**Prompt architecture — four-layer composition**
- Layer 1 (system prompt): Declare Claude as a German-language SEO copywriter for insurance products; embed AEO rules: every page must open with a 2-3 sentence factual definition; FAQ questions must mirror the exact phrasing a user would type; headings must be informative and free of marketing jargon; all named entities (product name, insurers, target audience) must appear explicitly.
- Layer 2 (Wissensfundus context): Inject the `inhalt` field of all matching `wissensfundus` rows as a labelled block; limit to relevant `tags` intersection with the product config to keep context concise.
- Layer 3 (Produkt-DNA): Include `produkt.name`, `produkt.typ`, `produkt_config.anbieter` (array), and `produkt_config.argumente` (JSON key-selling-points).
- Layer 4 (Vertriebssteuerung): Include `produkt_config.zielgruppe` (array) and `produkt_config.fokus` (one of `sicherheit | preis | sofortschutz`); instruct Claude to weight CTAs and benefit framing accordingly.
- Final instruction in every prompt: respond with valid JSON only, no markdown fences, matching the required output schema for the page type.

**Output JSON schema — sections array**
- Every Claude response must conform to `{ sections: Section[] }` where each `Section` has a `type` discriminator.
- `hero` section: `{ type, headline, subline, cta_text, cta_anchor }` — `cta_anchor` defaults to `"#formular"`.
- `features` section: `{ type, items: [{ icon, title, text }] }` — `icon` is a string slug (e.g. `"shield"`, `"check"`); generate 4-6 items.
- `trust` section: `{ type, stat_items: [{ value, label }] }` — 3 trust statistics (e.g. insurer count, years, rating).
- `faq` section: `{ type, items: [{ frage, antwort }] }` — exactly 10 question-answer pairs; `antwort` must begin with a direct factual sentence.
- `vergleich` section: `{ type, anbieter: [{ name, preis_ab, leistungen: string[], highlight: boolean }] }` — one row per insurer in `anbieter` array.
- `ratgeber` section: `{ type, slug, titel, intro, body_paragraphs: string[], cta_text }` — `body_paragraphs` is an array of 4-6 paragraphs.
- `tarif` section: `{ type, alters_stufen: [{ von, bis, beitrag_ab, beitrag_bis }], disclaimer }` — example data only, disclaimer must be present.
- Every generation call must also return `meta_title` (max 60 chars), `meta_desc` (max 160 chars), and `schema_markup` (Schema.org JSON-LD object) as top-level keys alongside `sections`.

**Schema.org JSON-LD per page type**
- `hauptseite`: compose `InsuranceAgency` + `Product` + `BreadcrumbList` nodes.
- `faq`: compose `FAQPage` with each `frage`/`antwort` pair as `Question` + `acceptedAnswer`.
- `vergleich`: compose `ItemList` with one `ListItem` + `Product` per insurer.
- `ratgeber`: compose `Article` + `BreadcrumbList` + `HowTo` nodes.
- `tarif`: compose `Product` with `offers` listing the lowest example price from the tarif section.
- Claude generates the raw JSON-LD object; a thin helper in `lib/seo/schema.ts` validates required fields and injects the canonical URL before saving.

**Persisting to `generierter_content`**
- After each successful Claude call, immediately upsert a row using `produkt_id` + `page_type` + `slug` as the logical key; set `status = 'entwurf'` and `generated_at = now()`.
- For `ratgeber` page type, generate three articles with slugs derived from the content (e.g. `was-ist-das`, `fuer-wen`, `kosten`); each article is its own row with `page_type = 'ratgeber'`.
- On Claude API error for a page type, do not upsert a row; instead record the error in the function return value for the API route to surface.
- Use the Supabase server client with the service role key for all writes so RLS does not block server-side inserts.

**`/api/generate` POST route**
- Accept `{ produktId: string }` in the request body; validate with zod — reject with HTTP 400 if `produktId` is not a valid UUID.
- Verify that the requesting user has an active Supabase Auth session; return HTTP 401 if not.
- Call `generateContent(produktId)` and return HTTP 200 with `{ data: { generatedCount, errors } }` following the project API response format.
- If all five page-type groups fail, return HTTP 500 with a structured error response; if some succeed, return HTTP 207 (Multi-Status) with per-page success/error detail.
- Do not stream the response; wait for all generation calls to complete before responding.

**Rate limiting and Claude API considerations**
- Execute the five page-type calls sequentially, not concurrently, to avoid hitting Anthropic rate limits on a single API key.
- Set `max_tokens` to 4096 per call; keep `temperature` at 0 for deterministic, factual insurance copy.
- If the Anthropic SDK throws a rate-limit error (HTTP 429), apply exponential backoff with a maximum of three retries before marking that page type as failed.
- Log each generation attempt (produktId, page_type, attempt number, duration) to `console.log` in structured JSON for Vercel log ingestion; never log the raw API key or full prompt.

**Error handling and partial saves**
- The `generateContent` function must never throw; it always resolves with a result object containing `{ success: PageTypeResult[], failed: PageTypeError[] }`.
- A `PageTypeError` carries `{ page_type, slug?, error_message, attempt_count }`.
- The `/api/generate` route reads the result and builds the HTTP response; all error-to-response mapping lives in the route handler, not in the generator.
- Validate the Claude JSON response with a zod schema before upserting; if Claude returns malformed JSON, treat it as a generation failure for that page type and do not save a corrupted row.

## Existing Code to Leverage

**`lib/supabase/server.ts` — Supabase server client**
- Use the service-role server client (established in the project architecture) for all DB reads and writes inside `generateContent`; this bypasses RLS and is safe in server-only `lib/` code.
- Follow the existing pattern of creating a per-request client rather than a module-level singleton.

**`generierter_content` table — DB schema from CLAUDE.md**
- Columns `produkt_id`, `page_type`, `slug`, `title`, `meta_title`, `meta_desc`, `content` (jsonb), `schema_markup` (jsonb), `status`, `generated_at` are already defined; no migration additions are required for the generator to write to this table.
- `status = 'entwurf'` is the default; the generator must always write this value explicitly so future changes to the DB default do not silently affect generator output.

**`produkt_config.argumente` jsonb field**
- This field stores the admin-entered key selling points as arbitrary JSON; inject it verbatim into the Produkt-DNA prompt layer as a formatted list so Claude can incorporate exact USP language.

**`sterbegeld24plus-recreation/styles.css` — reference design vocabulary**
- The existing Navy (`#1a365d`) + Gold (`#d4af37`) colour palette and section hierarchy (hero → features → trust → FAQ → CTA) define the expected content structure; generated `sections` arrays should produce content that maps to these visual zones.
- Icon slug names in `features` sections (e.g. `shield`, `check`, `heart`) should reflect the semantic categories established in the reference design.

**`design-tokens/tokens.json` — brand voice alignment**
- The token file defines `Nunito Sans` + `Roboto` type hierarchy and `#abd5f4` / `#ff9651` brand colours; the system prompt should instruct Claude that the product is a premium insurance brand to keep tone consistent with the established design system.

## Out of Scope

- Building the admin UI that triggers generation (covered in the `product-creation-admin-ui` spec).
- Content preview and manual editing after generation (covered in the `content-preview-editing` spec).
- Publishing workflow that moves status from `entwurf` to `review` or `publiziert`.
- Actual rendering of public-facing pages from the generated content (covered in `public-landing-page-ssg` and related specs).
- Schema.org validation against external validators or Google Rich Results API.
- Streaming Claude responses to the browser; all generation is server-side batch.
- Support for languages other than German in generated content.
- Automatic re-generation or scheduled refresh of existing content rows.
- Image selection or Unsplash API calls as part of the generation pipeline.
- E-mail or Confluence actions triggered by content generation.
