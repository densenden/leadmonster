# Specification: SEO Automation (Sitemap, Robots, llms.txt)

## Goal
Implement fully automated SEO infrastructure — dynamic sitemap.xml, AI-crawler-permissive robots.txt, and a structured llms.txt file — so that every published product page is immediately discoverable by classic search engines and LLM-based AI crawlers without any manual intervention.

## User Stories
- As a search engine or AI crawler, I want to discover all published product pages and sub-routes via a canonical sitemap so that I can index them correctly and completely.
- As an admin, I want llms.txt to be updated automatically when content is published so that LLM crawlers always reflect the current product landscape without manual file edits.

## Specific Requirements

**`app/sitemap.ts` — Dynamic Sitemap Generation**
- Implement as a Next.js App Router sitemap route returning `MetadataRoute.Sitemap`
- Fetch all rows from `produkte` where `status = 'publiziert'` using the Supabase server client (`lib/supabase/server.ts`)
- For each published product, generate entries for: `/[slug]`, `/[slug]/faq`, `/[slug]/vergleich`, `/[slug]/tarife`
- For ratgeber articles, join `generierter_content` where `page_type = 'ratgeber'` and `status = 'publiziert'` to generate `/[slug]/ratgeber/[thema]` entries
- All URLs must be absolute, constructed from `process.env.NEXT_PUBLIC_BASE_URL` — throw a build-time error if this variable is missing
- `lastModified` for product-level pages comes from the product's `updated_at` column; for ratgeber entries, from the `published_at` column in `generierter_content`

**Priority and `changefreq` Values per Route Type**
- `/[slug]` (Hauptseite): `priority: 1.0`, `changefreq: 'weekly'`
- `/[slug]/faq`: `priority: 0.8`, `changefreq: 'monthly'`
- `/[slug]/vergleich`: `priority: 0.8`, `changefreq: 'monthly'`
- `/[slug]/tarife`: `priority: 0.7`, `changefreq: 'monthly'`
- `/[slug]/ratgeber/[thema]`: `priority: 0.6`, `changefreq: 'monthly'`
- Homepage `/`: `priority: 0.9`, `changefreq: 'weekly'`; always included as a static entry

**`app/robots.ts` — Robots.txt with AI Crawler Permissions**
- Implement as a Next.js App Router robots route returning `MetadataRoute.Robots`
- Rules must explicitly allow the following user agents: `*` (all), `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `anthropic-ai`, `CCBot`, `ChatGPT-User`
- Disallow `/admin/` for all bots to prevent indexing of the protected admin area
- Include `Sitemap` field pointing to `${NEXT_PUBLIC_BASE_URL}/sitemap.xml`
- No crawl delays; keep the file minimal and spec-compliant

**`public/llms.txt` — LLM Crawler Structured Description**
- Static plain-text file at `public/llms.txt`, served directly by Next.js/Vercel as a static asset
- File structure follows the emerging llms.txt standard: begin with a brief system description (1-2 sentences), followed by a `# Products` section listing each published product
- Per product entry: product name, slug, canonical URL, a one-sentence description derived from `meta_desc`, and a list of available page types (Hauptseite, FAQ, Vergleich, Tarife, Ratgeber with article slugs)
- File is written in German for user-facing content, using plain text with Markdown-style headings (`#`, `##`)
- Initial static version committed to the repo covering `sterbegeld24plus` as the pilot product

**Auto-Update Mechanism for `llms.txt`**
- Create a server action or internal API route at `app/api/seo/llms/route.ts` (POST, protected by a secret header `x-internal-secret`) that regenerates and overwrites `public/llms.txt` by fetching all published products and their published content from Supabase
- This route is called from the existing content status-change flow: whenever `generierter_content.status` is set to `'publiziert'`, the content API route (`app/api/admin/content/route.ts`) triggers a fetch to `/api/seo/llms` after the DB update
- On Vercel, file system writes to `public/` are not persistent across deployments; therefore the auto-update strategy on production is to call this route during build (via `next build` lifecycle or a post-deploy hook), keeping the committed file as the fallback

**Canonical URL Strategy**
- All absolute URLs throughout sitemap, robots, llms.txt, and page metadata are built from `NEXT_PUBLIC_BASE_URL` (e.g. `https://leadmonster.de`)
- `NEXT_PUBLIC_BASE_URL` must be added to `.env.example` and documented as required
- In `lib/seo/metadata.ts`, export a `buildCanonicalUrl(path: string): string` helper that prepends `NEXT_PUBLIC_BASE_URL` and normalises trailing slashes; all sitemap and metadata generators use this helper
- Next.js `generateMetadata()` on every public page must set `alternates.canonical` using this helper

**Environment Variable Requirements**
- `NEXT_PUBLIC_BASE_URL` is the only new variable introduced by this spec
- Add to `.env.example` alongside existing keys
- Sitemap and robots routes must fail fast (log a clear error and return an empty response) if the variable is undefined, avoiding silent misconfiguration

## Visual Design
No visual mockups provided for this spec. SEO automation files are non-visual infrastructure.

## Existing Code to Leverage

**`lib/supabase/server.ts` — Supabase Server Client**
- Already defined in the project architecture as the service-role server client
- Use this client in `app/sitemap.ts` and `app/api/seo/llms/route.ts` to query `produkte` and `generierter_content` without auth restrictions

**`lib/seo/metadata.ts` — Metadata Generator**
- Defined in the project architecture; the `buildCanonicalUrl` helper should be added here to keep all SEO URL logic in one place and avoid duplication across sitemap, robots, and `generateMetadata()` calls

**`app/api/admin/content/route.ts` — Content Status Change Route**
- The existing content management API route is the correct trigger point for calling the llms.txt regeneration endpoint after a status change to `'publiziert'`; extend it with a fire-and-forget fetch to `/api/seo/llms`

**`produkte` and `generierter_content` DB Tables**
- `produkte.status`, `produkte.slug`, `produkte.updated_at` are the primary fields for sitemap filtering and URL generation
- `generierter_content.page_type`, `generierter_content.slug`, `generierter_content.status`, `generierter_content.published_at`, `generierter_content.meta_desc` drive both ratgeber sitemap entries and llms.txt descriptions

## Out of Scope
- Schema.org JSON-LD structured data (specified separately in `lib/seo/schema.ts`)
- `generateMetadata()` implementation for individual product pages (covered by the public landing page spec)
- Any UI in the admin area for triggering or previewing sitemap/robots/llms.txt content
- Per-page `<link rel="canonical">` component rendering (handled by Next.js metadata API, not a custom component)
- Sitemap index files or multi-sitemap splitting (not needed at this product scale)
- Paid or third-party sitemap submission services
- Image sitemap entries
- Hreflang or multi-language sitemap entries (system is German-only)
