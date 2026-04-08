# Task Breakdown: SEO Automation (Sitemap, Robots, llms.txt)

## Overview
Total Tasks: 4 task groups, 22 sub-tasks

## Task List

---

### Infrastructure & Shared Utilities

#### Task Group 1: Environment Variable and Canonical URL Helper
**Dependencies:** None

- [x] 1.0 Complete shared SEO infrastructure
  - [x] 1.1 Write 2-4 focused tests for `buildCanonicalUrl`
    - Test that the helper prepends `NEXT_PUBLIC_BASE_URL` correctly
    - Test that trailing slashes on the path are normalised (no double slashes)
    - Test that a missing `NEXT_PUBLIC_BASE_URL` throws or returns a clear error
    - Keep tests in `lib/seo/__tests__/metadata.test.ts`; use Vitest; mock `process.env`
  - [x] 1.2 Add `NEXT_PUBLIC_BASE_URL` to `.env.example`
    - Place it directly below the existing Supabase keys
    - Add an inline comment: `# Required — absolute base URL, e.g. https://leadmonster.de`
    - Confirm the variable is already gitignored via `.env.local` convention
  - [x] 1.3 Implement `buildCanonicalUrl(path: string): string` in `lib/seo/metadata.ts`
    - Read `process.env.NEXT_PUBLIC_BASE_URL`; throw a descriptive error if undefined
    - Strip any trailing slash from the base URL before concatenation
    - Ensure the path always begins with `/` (prepend if missing)
    - Export the function as a named export alongside existing metadata helpers
    - TypeScript strict mode; no `any`; single-responsibility function
  - [x] 1.4 Verify tests from 1.1 pass
    - Run only `lib/seo/__tests__/metadata.test.ts`
    - Do not run the full test suite

**Acceptance Criteria:**
- `buildCanonicalUrl` is exported from `lib/seo/metadata.ts`
- All 2-4 tests in 1.1 pass
- `.env.example` contains `NEXT_PUBLIC_BASE_URL` with a comment
- Function throws a descriptive error when the env variable is absent

---

### Static SEO Files

#### Task Group 2: `robots.ts` and `public/llms.txt` (Static)
**Dependencies:** Task Group 1

- [x] 2.0 Complete static SEO output files
  - [x] 2.1 Write 2-4 focused tests for the robots route
    - Test that `/admin/` is disallowed for all crawlers
    - Test that the sitemap URL in the output equals `${NEXT_PUBLIC_BASE_URL}/sitemap.xml`
    - Test that named AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `anthropic-ai`, `CCBot`, `ChatGPT-User`) are explicitly listed with no disallow rules
    - Keep tests in `app/robots/__tests__/robots.test.ts`; mock `process.env`
  - [x] 2.2 Create `app/robots.ts` returning `MetadataRoute.Robots`
    - Import `buildCanonicalUrl` from `lib/seo/metadata.ts` to construct the sitemap URL
    - Define a `rules` array with one entry per user agent: first a catch-all `*` entry disallowing `/admin/`, then explicit allow-only entries for each named AI crawler with `allow: '/'` and no disallow
    - Add the `sitemap` field: `buildCanonicalUrl('/sitemap.xml')`
    - No crawl-delay fields; keep the exported function minimal
    - Fail fast (log error, return empty object) if `NEXT_PUBLIC_BASE_URL` is missing
  - [x] 2.3 Create `public/llms.txt` as the initial static file for the pilot product
    - File opens with a 2-sentence German system description of LeadMonster
    - Follow the emerging llms.txt standard: `# LeadMonster` heading, then a brief description, then `## Produkte` section
    - Include a `### sterbegeld24plus` subsection containing:
      - Product name and canonical URL (`buildCanonicalUrl('/sterbegeld24plus')`)
      - One-sentence German description of the product
      - Bulleted list of available page types: Hauptseite, FAQ, Vergleich, Tarife, and any Ratgeber articles with their slugs
    - Write in plain text with Markdown-style headings; no HTML
    - Commit this file to the repo as the permanent fallback for Vercel deployments
  - [x] 2.4 Verify robots tests from 2.1 pass
    - Run only the tests from 2.1
    - Do not run the full test suite

**Acceptance Criteria:**
- All 2-4 robots tests pass
- `app/robots.ts` exports a valid `MetadataRoute.Robots` with all specified AI crawlers and `/admin/` disallowed
- `public/llms.txt` exists, is committed, and contains a well-formed entry for `sterbegeld24plus`
- No hardcoded base URLs — all absolute URLs go through `buildCanonicalUrl`

---

### Dynamic Sitemap

#### Task Group 3: `app/sitemap.ts` — Dynamic Sitemap Generation
**Dependencies:** Task Group 1

- [x] 3.0 Complete dynamic sitemap generation
  - [x] 3.1 Write 3-5 focused tests for the sitemap generator
    - Test that a published product generates entries for all four sub-routes: `/[slug]`, `/[slug]/faq`, `/[slug]/vergleich`, `/[slug]/tarife`
    - Test that `priority` and `changefreq` values match the spec per route type
    - Test that the homepage `/` is always included as a static entry with `priority: 0.9`
    - Test that a product with `status != 'publiziert'` is excluded
    - Test that ratgeber entries are generated from `generierter_content` where `page_type = 'ratgeber'` and `status = 'publiziert'`
    - Keep tests in `app/sitemap/__tests__/sitemap.test.ts`; mock the Supabase server client
  - [x] 3.2 Create `app/sitemap.ts` returning `MetadataRoute.Sitemap`
    - Import the Supabase server client from `lib/supabase/server.ts`
    - Import `buildCanonicalUrl` from `lib/seo/metadata.ts`
    - Fail fast at the top of the function: if `NEXT_PUBLIC_BASE_URL` is undefined, log a clear error and return `[]`
    - Query `produkte` filtered to `status = 'publiziert'`; select `id`, `slug`, `updated_at`
    - For each product, push four fixed route entries using the priority/changefreq table from the spec:
      - `/[slug]`: `priority: 1.0`, `changefreq: 'weekly'`, `lastModified: product.updated_at`
      - `/[slug]/faq`: `priority: 0.8`, `changefreq: 'monthly'`, `lastModified: product.updated_at`
      - `/[slug]/vergleich`: `priority: 0.8`, `changefreq: 'monthly'`, `lastModified: product.updated_at`
      - `/[slug]/tarife`: `priority: 0.7`, `changefreq: 'monthly'`, `lastModified: product.updated_at`
    - Query `generierter_content` joined by `produkt_id` where `page_type = 'ratgeber'` and `status = 'publiziert'`; generate `/[product-slug]/ratgeber/[content-slug]` entries with `priority: 0.6`, `changefreq: 'monthly'`, `lastModified: content.published_at`
    - Prepend a static homepage entry: `buildCanonicalUrl('/')`, `priority: 0.9`, `changefreq: 'weekly'`
    - All URLs constructed via `buildCanonicalUrl`
    - TypeScript strict mode; no `any`; async function
  - [x] 3.3 Verify sitemap tests from 3.1 pass
    - Run only the tests from 3.1
    - Do not run the full test suite

**Acceptance Criteria:**
- All 3-5 sitemap tests pass
- `app/sitemap.ts` is a valid Next.js App Router sitemap returning `MetadataRoute.Sitemap`
- Only products with `status = 'publiziert'` appear in the sitemap
- All five route types have correct `priority` and `changefreq` values per the spec
- Homepage is always present
- `lastModified` comes from `updated_at` (product routes) or `published_at` (ratgeber)
- Empty array returned (with console error) if `NEXT_PUBLIC_BASE_URL` is missing

---

### llms.txt Auto-Update Mechanism

#### Task Group 4: `app/api/seo/llms/route.ts` and Publish Trigger
**Dependencies:** Task Groups 1, 2, 3

- [x] 4.0 Complete llms.txt auto-update pipeline
  - [x] 4.1 Write 3-5 focused tests for the llms.txt API route and publish trigger
    - Test that POST `/api/seo/llms` without the correct `x-internal-secret` header returns 401
    - Test that a valid POST regenerates and overwrites `public/llms.txt` with current published product data
    - Test that the generated file contains the expected product name and canonical URL for a mocked published product
    - Test that the content publish route (`app/api/admin/content/route.ts`) fires a fetch to `/api/seo/llms` when status is set to `'publiziert'`
    - Keep tests in `app/api/seo/llms/__tests__/llms-route.test.ts`; mock Supabase client and `fs.writeFile`
  - [x] 4.2 Create `app/api/seo/llms/route.ts` — POST handler
    - Validate the `x-internal-secret` request header against `process.env.INTERNAL_SECRET`; return `401` immediately if missing or mismatched
    - Query Supabase for all rows in `produkte` where `status = 'publiziert'`; for each, also fetch associated `generierter_content` rows where `status = 'publiziert'`
    - Build the llms.txt content string using the same structure as the static file in Task 2.3:
      - System description header (German)
      - `## Produkte` section
      - One `### [product-name]` subsection per product with: canonical URL via `buildCanonicalUrl`, `meta_desc` as one-sentence description, list of available page types
    - Use Node.js `fs.writeFile` (or `fs/promises`) to overwrite `public/llms.txt`
    - Return `200` with `{ updated: true, productCount: N }` on success
    - Log a clear error and return `500` with `{ updated: false, error: message }` on file write or DB failure
    - Document the Vercel limitation in a code comment: on production, file writes are ephemeral — the route is called during the build step or post-deploy hook; the committed static file is the fallback
    - Add `INTERNAL_SECRET` to `.env.example` with comment `# Required — shared secret for internal API-to-API calls`
  - [x] 4.3 Extend `app/api/admin/content/route.ts` to trigger llms.txt regeneration on publish
    - After a successful DB update setting `generierter_content.status = 'publiziert'`, add a fire-and-forget `fetch` to `/api/seo/llms`
    - Pass the `x-internal-secret` header using `process.env.INTERNAL_SECRET`
    - Wrap the fetch in a try/catch; log a warning on failure but do not let it affect the main response — apply graceful degradation
    - Construct the internal URL as `buildCanonicalUrl('/api/seo/llms')` so it works in all environments
  - [x] 4.4 Verify tests from 4.1 pass
    - Run only the tests from 4.1
    - Do not run the full test suite

**Acceptance Criteria:**
- All 3-5 tests from 4.1 pass
- POST `/api/seo/llms` without the correct secret returns `401`
- POST with a valid secret overwrites `public/llms.txt` with current product data
- `app/api/admin/content/route.ts` fires the trigger on publish without blocking or breaking the main response
- `INTERNAL_SECRET` is documented in `.env.example`
- Vercel ephemeral-filesystem caveat is documented in a code comment inside the route

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1 — Environment Variable and Canonical URL Helper**
   Establishes `buildCanonicalUrl` and the `NEXT_PUBLIC_BASE_URL` contract that every subsequent task depends on.

2. **Task Group 2 — `robots.ts` and static `public/llms.txt`**
   Both files are purely output-based and depend only on `buildCanonicalUrl`; no DB queries required. The static llms.txt provides a committed fallback before the auto-update mechanism exists.

3. **Task Group 3 — `app/sitemap.ts`**
   Depends on `buildCanonicalUrl` and the Supabase server client. Can be built in parallel with Task Group 2 but is listed after it so the canonical URL helper is confirmed working before adding DB queries.

4. **Task Group 4 — `app/api/seo/llms/route.ts` and publish trigger**
   Must come last because it depends on `buildCanonicalUrl` (Group 1), the committed static llms.txt structure (Group 2), and extends the existing content route which is already in scope from earlier specs. The trigger in `app/api/admin/content/route.ts` can only be safely wired after the llms route itself exists.
