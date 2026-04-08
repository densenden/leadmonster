# Task Breakdown: AI Content Generation Engine

## Overview
Total Tasks: 32 sub-tasks across 5 task groups

## Task List

---

### Task Group 1: SDK Installation and Type Foundation
**Dependencies:** None

- [x] 1.0 Install Anthropic SDK and establish TypeScript type contracts
  - [x] 1.1 Write 2-4 focused tests for type contracts and SDK instantiation
    - Test that `GenerationResult` interface satisfies expected shape `{ success: PageTypeResult[], failed: PageTypeError[] }`
    - Test that `PageTypeError` carries the required fields: `page_type`, `slug?`, `error_message`, `attempt_count`
    - Test that `GenerationResult` is correctly typed so that it can never throw (always resolves)
    - Use Vitest; mock the Anthropic SDK at module level; do NOT make real API calls
  - [x] 1.2 Install the Anthropic Node.js SDK
    - Run `npm install @anthropic-ai/sdk`
    - Confirm `anthropic` package appears in `package.json` dependencies
    - Verify TypeScript types are included (no `@types/` package needed for this SDK)
  - [x] 1.3 Define and export all TypeScript interfaces in `lib/anthropic/types.ts`
    - `interface GenerationResult { success: PageTypeResult[], failed: PageTypeError[] }`
    - `interface PageTypeResult { page_type: PageType, slug: string, rowId: string }`
    - `interface PageTypeError { page_type: PageType, slug?: string, error_message: string, attempt_count: number }`
    - `type PageType = 'hauptseite' | 'faq' | 'vergleich' | 'tarif' | 'ratgeber'`
    - All types in strict TypeScript; no `any`; export everything as named exports
  - [x] 1.4 Verify type tests pass
    - Run ONLY the 2-4 tests written in 1.1
    - Confirm TypeScript strict mode (`tsc --noEmit`) reports zero errors on the new file

**Acceptance Criteria:**
- The 2-4 tests written in 1.1 pass
- `@anthropic-ai/sdk` present in `package.json`
- `lib/anthropic/types.ts` compiles with zero TypeScript errors in strict mode
- All interfaces are exported as named exports and importable from downstream modules

---

### Task Group 2: Zod Output Validation Schemas
**Dependencies:** Task Group 1

- [x] 2.0 Define Zod schemas for all Claude output shapes
  - [x] 2.1 Write 3-5 focused tests for Zod schema validation
    - Test that a valid `hauptseite` payload passes the schema
    - Test that a valid `faq` payload with exactly 10 items passes the schema
    - Test that a malformed payload (missing `sections`) is rejected and returns a `ZodError`
    - Test that `meta_title` longer than 60 characters is rejected
    - Test that `meta_desc` longer than 160 characters is rejected
  - [x] 2.2 Create `lib/anthropic/schemas.ts` with all section-level Zod schemas
    - `HeroSectionSchema`: `{ type: 'hero', headline, subline, cta_text, cta_anchor }` — `cta_anchor` defaults to `"#formular"`
    - `FeaturesSectionSchema`: `{ type: 'features', items }` — `items` array min 4, max 6; each item: `{ icon, title, text }`
    - `TrustSectionSchema`: `{ type: 'trust', stat_items }` — exactly 3 items: `{ value, label }`
    - `FaqSectionSchema`: `{ type: 'faq', items }` — exactly 10 items: `{ frage, antwort }`
    - `VergleichSectionSchema`: `{ type: 'vergleich', anbieter }` — array of `{ name, preis_ab, leistungen: string[], highlight: boolean }`
    - `RatgeberSectionSchema`: `{ type: 'ratgeber', slug, titel, intro, body_paragraphs, cta_text }` — `body_paragraphs` min 4, max 6
    - `TarifSectionSchema`: `{ type: 'tarif', alters_stufen, disclaimer }` — `alters_stufen`: `{ von, bis, beitrag_ab, beitrag_bis }`; `disclaimer` is required non-empty string
  - [x] 2.3 Create per-page-type top-level response schemas in `lib/anthropic/schemas.ts`
    - `HauptseitResponseSchema`: `{ sections: z.array(SectionUnionSchema), meta_title: z.string().max(60), meta_desc: z.string().max(160), schema_markup: z.record(z.unknown()) }`
    - `FaqResponseSchema`, `VergleichResponseSchema`, `TarifResponseSchema`, `RatgeberResponseSchema` — each with the same top-level envelope but constraining which section types are present
    - Export a `PageResponseSchemas` map keyed by `PageType` for use in the generator
  - [x] 2.4 Export `SectionUnion` TypeScript type inferred from the discriminated union schema
    - Use `z.infer<typeof SectionUnionSchema>` so the rest of the codebase uses schema-derived types, not hand-written ones
  - [x] 2.5 Ensure Zod schema tests pass
    - Run ONLY the 3-5 tests written in 2.1
    - Confirm zero TypeScript errors

**Acceptance Criteria:**
- The 3-5 tests written in 2.1 pass
- All seven section schemas and five page-response schemas are exported from `lib/anthropic/schemas.ts`
- Malformed Claude JSON is reliably rejected before any DB write
- `meta_title` and `meta_desc` length constraints enforced at schema level

---

### Task Group 3: Schema.org Helper and Prompt Architecture
**Dependencies:** Task Group 2

- [x] 3.0 Build `lib/seo/schema.ts` helper and the four-layer prompt composer
  - [x] 3.1 Write 3-5 focused tests for schema.ts and prompt composition
    - Test that `buildSchemaMarkup('hauptseite', ...)` returns an object containing `@type: 'InsuranceAgency'` and a canonical URL
    - Test that `buildSchemaMarkup('faq', ...)` returns an object with `@type: 'FAQPage'` and at least one `Question` entity
    - Test that `buildSchemaMarkup('ratgeber', ...)` returns an `Article` node
    - Test that the prompt composer includes all four layers and ends with the JSON-only instruction
    - Test that Wissensfundus injection is filtered to matching tags only (irrelevant rows excluded)
  - [x] 3.2 Create `lib/seo/schema.ts`
    - Export `buildSchemaMarkup(pageType: PageType, data: SchemaInput): Record<string, unknown>`
    - `hauptseite`: compose `InsuranceAgency` + `Product` + `BreadcrumbList` — inject canonical URL via `canonicalUrl` parameter
    - `faq`: compose `FAQPage` — map each `{ frage, antwort }` pair to `{ "@type": "Question", "name": frage, "acceptedAnswer": { "@type": "Answer", "text": antwort } }`
    - `vergleich`: compose `ItemList` with one `ListItem` + `Product` per insurer
    - `ratgeber`: compose `Article` + `BreadcrumbList` + `HowTo`
    - `tarif`: compose `Product` with `offers` pointing to the lowest `beitrag_ab` value from the tarif section
    - Validate required fields (`@context`, `@type`, canonical URL) before returning; throw a typed `SchemaValidationError` if missing — the generator catches this and marks the page as failed
    - Follow kebab-case file naming and camelCase function naming per coding-style standards
  - [x] 3.3 Create `lib/anthropic/prompt-builder.ts` implementing the four-layer composition
    - Layer 1 — System prompt string constant: declare German-language SEO copywriter role; embed AEO rules (2-3 sentence factual definition opener, FAQ phrasing mirrors user queries, no marketing jargon in headings, all named entities explicit); reference premium insurance brand tone consistent with `Nunito Sans` / `Roboto` design system
    - Layer 2 — `buildWissensfundusBlock(rows: WissensfundusRow[], produktConfigTags: string[]): string`: filter rows to those whose `tags` intersect with product config tags; format as labelled `## Wissensfundus` block
    - Layer 3 — `buildProduktDnaBlock(produkt, config): string`: include `produkt.name`, `produkt.typ`, `config.anbieter` array, and `config.argumente` jsonb as a formatted key-selling-points list
    - Layer 4 — `buildVertriebssteuerungBlock(config): string`: include `config.zielgruppe` array and `config.fokus`; add instruction to weight CTAs and benefit framing for the chosen focus
    - `composePrompt(pageType, layers): { system: string, user: string }`: assembles all four layers plus final instruction "Respond with valid JSON only, no markdown fences, matching the required output schema for this page type"
    - Export all functions as named exports; no default exports (per project conventions)
  - [x] 3.4 Ensure schema and prompt tests pass
    - Run ONLY the 3-5 tests written in 3.1

**Acceptance Criteria:**
- The 3-5 tests written in 3.1 pass
- `buildSchemaMarkup` covers all five page types and injects canonical URL
- Prompt composer produces correctly structured four-layer prompts
- Wissensfundus tag filtering prevents irrelevant context from inflating prompts
- Zero TypeScript strict-mode errors in both new files

---

### Task Group 4: Core Generator and Retry Logic
**Dependencies:** Task Group 3

- [x] 4.0 Implement `lib/anthropic/generator.ts` with all five sequential Claude calls and error handling
  - [x] 4.1 Write 4-6 focused tests for the generator
    - Test that `generateContent` resolves (never throws) even when every Claude call throws a network error
    - Test that a successful Claude call results in an upsert to `generierter_content` with `status = 'entwurf'`
    - Test that a malformed Claude JSON response (Zod validation failure) is recorded in `failed`, not in `success`, and produces no DB write
    - Test that rate-limit errors (HTTP 429) trigger exponential backoff with up to 3 retries before marking as failed with `attempt_count = 3`
    - Test that all three `ratgeber` sub-calls run independently so one failure does not skip the remaining two
    - Mock the Anthropic SDK and Supabase server client; do NOT make real API or DB calls
  - [x] 4.2 Implement the Supabase data-fetch block inside `generateContent`
    - Import and instantiate the server-side Supabase client from `lib/supabase/server.ts` using the service-role key
    - Fetch `produkte` row by `produktId` and join `produkt_config` in a single composed query (select only needed columns — avoid SELECT *)
    - Fetch all `wissensfundus` rows where `kategorie = produkt.typ` in the same round-trip or an immediately following single query
    - If the product or its config is not found, resolve early with `{ success: [], failed: [{ page_type: 'hauptseite', error_message: 'Product not found', attempt_count: 0 }] }` — do not throw
  - [x] 4.3 Implement the Anthropic client instantiation and shared call helper
    - Instantiate `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` inside the function body (per-call client, not module-level singleton — consistent with Supabase server pattern)
    - Create private async helper `callClaudeWithRetry(client, messages, pageType, slug): ClaudeRawResponse`
    - Set `model: 'claude-opus-4-6'`, `max_tokens: 4096`, `temperature: 0` on every call
    - Implement exponential backoff: on HTTP 429, wait `2^attempt * 1000ms` before retry; max 3 attempts total; on non-rate-limit errors, do not retry — fail immediately
    - Log each attempt as structured JSON to `console.log`: `{ event: 'claude_call', produktId, page_type, attempt, duration_ms }` — never log `apiKey` or prompt text
  - [x] 4.4 Implement the five sequential generation calls
    - Call order: `hauptseite` → `faq` → `vergleich` → `tarif` → three `ratgeber` sub-calls
    - For each call: compose prompt via `composePrompt`, call `callClaudeWithRetry`, parse response as JSON (wrap in try/catch for `JSON.parse`), validate with the appropriate Zod schema from Task Group 2, build schema_markup via `buildSchemaMarkup` from Task Group 3, upsert to `generierter_content`
    - Upsert logic: use `produkt_id + page_type + slug` as the logical conflict key; always set `status = 'entwurf'` explicitly; set `generated_at = new Date().toISOString()`; store `sections` array as the `content` jsonb column and schema_markup as its own column
    - For each `ratgeber` article, derive `slug` from the article's `slug` field returned by Claude; create three separate rows with `page_type = 'ratgeber'`
    - On any failure (JSON.parse error, Zod error, Anthropic SDK error after retries, SchemaValidationError from schema.ts): push a `PageTypeError` to `failed` array and continue to next call — never abort the loop
  - [x] 4.5 Implement and export `generateContent(produktId: string): Promise<GenerationResult>`
    - Function must be declared as `async` and must always resolve — outer try/catch wraps the entire body to catch any unhandled case
    - Return `{ success: PageTypeResult[], failed: PageTypeError[] }`
    - Export as a named export from `lib/anthropic/generator.ts`
    - Import and re-export `GenerationResult`, `PageTypeResult`, `PageTypeError` from `lib/anthropic/types.ts`
  - [x] 4.6 Ensure generator tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Confirm `tsc --noEmit` reports zero errors

**Acceptance Criteria:**
- The 4-6 tests written in 4.1 pass
- `generateContent` never throws; always resolves with `GenerationResult`
- Partial failures are correctly isolated per page type
- HTTP 429 triggers exponential backoff (3 max retries) before recording failure
- Malformed Claude JSON is caught before any DB write
- Structured JSON logging on every Claude call attempt
- Zero TypeScript strict-mode errors

---

### Task Group 5: API Route and Response Mapping
**Dependencies:** Task Group 4

- [x] 5.0 Implement `app/api/generate/route.ts` with auth, validation, and HTTP response mapping
  - [x] 5.1 Write 3-5 focused tests for the API route
    - Test that a request without a valid Supabase Auth session returns HTTP 401
    - Test that a request body with a non-UUID `produktId` returns HTTP 400 with an error detail
    - Test that a fully successful `GenerationResult` (zero failed) returns HTTP 200 with `{ data: { generatedCount: 7, errors: [] } }`
    - Test that a partially successful result (some failed) returns HTTP 207 with per-page detail in `data`
    - Test that a completely failed result (all page types in `failed`) returns HTTP 500 with a structured error response
    - Mock `generateContent` to return controlled `GenerationResult` shapes; do NOT test generator internals here
  - [x] 5.2 Implement request validation in the route handler
    - Parse the request body with `request.json()` wrapped in try/catch (malformed JSON → HTTP 400)
    - Define and apply a Zod schema: `z.object({ produktId: z.string().uuid() })` — on failure return HTTP 400 with `{ data: null, error: { code: 'VALIDATION_ERROR', message: 'produktId must be a valid UUID', details: [...] } }` following the project API response format from `agent-os/standards/backend/api.md`
  - [x] 5.3 Implement Supabase Auth session check
    - Create a Supabase server client (`lib/supabase/server.ts`) and call `getUser()` (not `getSession()` — use the server-side method that validates the JWT against the auth server)
    - If no active user, return HTTP 401 with `{ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentifizierung erforderlich' } }`
  - [x] 5.4 Implement the response mapping logic
    - Call `await generateContent(produktId)`
    - Count `generatedCount = result.success.length`
    - If `result.failed.length === 0`: return HTTP 200 with `{ data: { generatedCount, errors: [] } }`
    - If `result.success.length > 0 && result.failed.length > 0`: return HTTP 207 with `{ data: { generatedCount, errors: result.failed } }`
    - If `result.success.length === 0`: return HTTP 500 with `{ data: null, error: { code: 'GENERATION_FAILED', message: 'Alle Seitentypen konnten nicht generiert werden', details: result.failed } }`
    - All error-to-HTTP mapping lives exclusively in this route handler; no HTTP-status knowledge leaks into `generateContent`
  - [x] 5.5 Ensure API route tests pass
    - Run ONLY the 3-5 tests written in 5.1
    - Confirm route compiles with zero TypeScript errors

**Acceptance Criteria:**
- The 3-5 tests written in 5.1 pass
- Unauthenticated requests are rejected with HTTP 401
- Invalid `produktId` format is rejected with HTTP 400
- HTTP 200 / 207 / 500 returned according to partial-success logic
- Response body follows the project-standard JSON envelope in all cases
- No HTTP status logic inside `generateContent` — route handler owns all response mapping

---

### Task Group 6: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-5

- [x] 6.0 Review existing tests and fill critical gaps
  - [x] 6.1 Review tests written across Task Groups 1-5
    - Review 2-4 tests from Task Group 1 (type contracts)
    - Review 3-5 tests from Task Group 2 (Zod schemas)
    - Review 3-5 tests from Task Group 3 (schema.ts + prompt-builder)
    - Review 4-6 tests from Task Group 4 (generator)
    - Review 3-5 tests from Task Group 5 (API route)
    - Total existing tests: approximately 15-25
  - [x] 6.2 Identify critical gaps for this feature only
    - Assess whether the full end-to-end path (valid request → DB upsert row with `status = 'entwurf'`) has integration coverage
    - Assess whether the retry loop (HTTP 429 → 3 retries → `attempt_count = 3` in `PageTypeError`) has explicit coverage
    - Assess whether the `ratgeber` three-sub-call independence (one failure does not skip others) has explicit coverage
    - Do NOT assess coverage of other features or the full application test suite
  - [x] 6.3 Write up to 8 additional strategic tests to fill identified gaps
    - Prioritise integration path: mock Supabase + mock Anthropic SDK; call `generateContent` with a complete `ProduktRow` fixture; assert all expected rows would be upserted
    - Add one test verifying the slug derivation for `ratgeber` rows produces URL-safe values
    - Add one test verifying the `buildSchemaMarkup` canonical URL injection for all five page types in a single parameterised test
    - Do NOT write exhaustive edge-case tests; maximum 8 new tests across all gaps
  - [x] 6.4 Run all feature-specific tests
    - Run ONLY the tests related to this spec: test files in `lib/anthropic/`, `lib/seo/`, and `app/api/generate/`
    - Expected total: approximately 23-33 tests
    - Do NOT run the full application test suite
    - Verify all tests pass with `vitest run --reporter=verbose`

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 23-33 tests total)
- The full generation path (request → Claude mock → DB upsert → 207/200 response) is covered by at least one integration-style test
- No more than 8 additional tests added in this group
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence:

1. SDK Installation and Type Foundation (Task Group 1) — establishes shared interfaces used by all downstream groups
2. Zod Output Validation Schemas (Task Group 2) — schemas must exist before the generator can validate Claude responses
3. Schema.org Helper and Prompt Architecture (Task Group 3) — `buildSchemaMarkup` and `composePrompt` must be ready before the generator calls them
4. Core Generator and Retry Logic (Task Group 4) — depends on all three prior groups; implements the primary business logic
5. API Route and Response Mapping (Task Group 5) — thin orchestration layer that depends only on `generateContent` from Task Group 4
6. Test Review and Gap Analysis (Task Group 6) — final quality gate; runs after all implementation is complete

## Key Files

| File | Task Group | Purpose |
|---|---|---|
| `lib/anthropic/types.ts` | 1 | Shared TypeScript interfaces: `GenerationResult`, `PageTypeResult`, `PageTypeError`, `PageType` |
| `lib/anthropic/schemas.ts` | 2 | Zod schemas for all seven section types and five page-response envelopes |
| `lib/seo/schema.ts` | 3 | `buildSchemaMarkup` — composes Schema.org JSON-LD per page type and injects canonical URL |
| `lib/anthropic/prompt-builder.ts` | 3 | Four-layer prompt composition: system, Wissensfundus, Produkt-DNA, Vertriebssteuerung |
| `lib/anthropic/generator.ts` | 4 | `generateContent(produktId)` — sequential Claude calls, retry logic, Zod validation, DB upserts |
| `app/api/generate/route.ts` | 5 | POST handler — auth check, UUID validation, HTTP 200/207/500 response mapping |
