# Task Breakdown: Pilot Product — sterbegeld24plus End-to-End

## Overview

Total Tasks: 9 groups, 47 sub-tasks

This is an integration and validation spec. Tasks are setup procedures and verification steps, not new feature development. Each task group must pass its acceptance criteria before the next group begins. The final goal is a fully published, end-to-end validated pilot product.

---

## Task List

### Setup & Data

#### Task Group 1: Admin Product Setup
**Dependencies:** None — all underlying system features (Next.js, Supabase schema, admin UI, auth) must already be built before this task group begins.

- [x] 1.0 Create and verify the sterbegeld24plus product record in the admin UI
  - [x] 1.1 Log into `/admin` with a valid Supabase Auth session and confirm the dashboard loads without redirect
  - [x] 1.2 Navigate to `/admin/produkte/neu` and create the product record with exact values:
    - `name`: "Sterbegeld24Plus"
    - `slug`: "sterbegeld24plus"
    - `typ`: "sterbegeld"
    - `status`: "entwurf" (do not change at this stage)
  - [x] 1.3 In the `produkt_config` section, set configuration with exact values:
    - `zielgruppe`: ["senioren_50plus", "familien"]
    - `fokus`: "sicherheit"
    - `anbieter`: ["Zurich", "Volkswohl Bund", "Barmenia", "Alte Leipziger", "Allianz", "AXA", "Concordia", "Gothaer"] (all 8 entries)
    - `argumente`: enter the 5 keys (`sofortschutz`, `garantierte_leistung`, `entlastung`, `flexibel`, `transparent`) with their exact German values as specified in the spec
  - [x] 1.4 Save the product and confirm the redirect lands on the product detail page at `/admin/produkte/[id]`
  - [x] 1.5 Verify in Supabase dashboard (Table Editor) that:
    - `produkte` table contains one row with `slug = 'sterbegeld24plus'` and `status = 'entwurf'`
    - `produkt_config` table contains one linked row with `produkt_id` matching the new product's UUID
    - `produkt_config.anbieter` array has exactly 8 entries
    - `produkt_config.argumente` JSONB column has exactly 5 keys

**Acceptance Criteria:**
- Product exists in Supabase with all exact field values from the spec
- `produkt_config` row is linked via correct `produkt_id` foreign key
- Admin UI shows the product in the product list at `/admin/produkte`

---

#### Task Group 2: Wissensfundus Seeding
**Dependencies:** Task Group 1 (product must exist; category `"sterbegeld"` must be the correct slug)

- [x] 2.0 Create all 5 required knowledge articles in `/admin/wissensfundus`
  - [x] 2.1 Create article `was_ist_sterbegeld`:
    - `kategorie`: "sterbegeld"
    - `thema`: "was_ist_sterbegeld"
    - `inhalt`: minimum 150 words covering definition of Sterbegeldversicherung, its purpose, typical payout range (5.000–15.000 €), and key difference from Lebensversicherung
    - `tags`: minimum 3 tags, e.g. ["sterbegeld", "definition", "lebensversicherung"]
  - [x] 2.2 Create article `fuer_wen_geeignet`:
    - `kategorie`: "sterbegeld"
    - `thema`: "fuer_wen_geeignet"
    - `inhalt`: minimum 150 words covering target audience (Senioren 50+, Familien), typical motivations (Angehörige nicht belasten), and health context common in this age group
    - `tags`: minimum 3 tags, e.g. ["zielgruppe", "senioren", "familien"]
  - [x] 2.3 Create article `kosten_und_leistungen`:
    - `kategorie`: "sterbegeld"
    - `thema`: "kosten_und_leistungen"
    - `inhalt`: minimum 150 words covering monthly premium ranges by age bracket, what is covered (Beerdigungskosten, Transport, Beisetzung), and exclusions
    - `tags`: minimum 3 tags, e.g. ["kosten", "leistungen", "beitraege"]
  - [x] 2.4 Create article `anbieter_unterschiede`:
    - `kategorie`: "sterbegeld"
    - `thema`: "anbieter_unterschiede"
    - `inhalt`: minimum 150 words covering key differentiators between the 8 configured insurers: waiting periods, health questionnaire requirements, guaranteed acceptance offers, and payout speed
    - `tags`: minimum 3 tags, e.g. ["anbieter", "vergleich", "wartezeit"]
  - [x] 2.5 Create article `antragsprozess`:
    - `kategorie`: "sterbegeld"
    - `thema`: "antragsprozess"
    - `inhalt`: minimum 150 words covering how to apply, required documents, online vs. paper application process, and acceptance timeline
    - `tags`: minimum 3 tags, e.g. ["antrag", "dokumente", "online"]
  - [x] 2.6 Verify in Supabase Table Editor that `wissensfundus` table has exactly 5 rows with `kategorie = 'sterbegeld'`, each with `inhalt` length above 150 words and at least 3 entries in the `tags` array

**Acceptance Criteria:**
- All 5 articles exist in the `wissensfundus` table with correct `kategorie` value
- Each article has `inhalt` of at least 150 words
- Each article has at least 3 tags
- No article is missing any of the required fields

---

### Content Engine

#### Task Group 3: Content Generation
**Dependencies:** Task Groups 1 and 2 (product config and wissensfundus must be complete before triggering generation)

- [x] 3.0 Trigger content generation and verify all 5 page types are produced correctly
  - [x] 3.1 Navigate to `/admin/produkte/[id]/content` for the sterbegeld24plus product
  - [x] 3.2 Click "Content generieren" and wait for the Claude API pipeline to complete; confirm no error state is shown in the UI
  - [x] 3.3 Verify `hauptseite` row in `generierter_content`:
    - `page_type = 'hauptseite'`
    - `status = 'entwurf'`
    - `content` JSONB contains sections array with at minimum: `hero`, `features`, `trust`, `faq`, and `lead_form` section types
    - `meta_title` is present and character count is 60 or fewer
    - `meta_desc` is present and character count is 160 or fewer
    - `schema_markup` JSONB is present and non-null
  - [x] 3.4 Verify `faq` row in `generierter_content`:
    - `page_type = 'faq'`
    - `status = 'entwurf'`
    - `content.sections` faq items array contains at minimum 10 question-answer pairs
    - Each answer's first sentence is a direct factual statement (not a question or filler phrase)
  - [x] 3.5 Verify `vergleich` row in `generierter_content`:
    - `page_type = 'vergleich'`
    - `status = 'entwurf'`
    - `content` includes comparison data for all 8 configured insurers from `produkt_config.anbieter`
  - [x] 3.6 Verify `tarif` row in `generierter_content`:
    - `page_type = 'tarif'`
    - `status = 'entwurf'`
    - Age brackets span from 40 to 85
    - All 5 Wunschsumme tiers are present
    - A disclaimer text is present in the content JSON
  - [x] 3.7 Verify all 3 `ratgeber` rows in `generierter_content`:
    - `page_type = 'ratgeber'` for all 3 rows
    - `status = 'entwurf'` for all 3 rows
    - Slugs are approximately `was-ist-sterbegeld`, `fuer-wen`, `kosten-leistungen`
    - Each article's content has minimum 4 body paragraphs
  - [x] 3.8 Confirm total of 7 rows exist in `generierter_content` all linked to the sterbegeld24plus `produkt_id`

**Acceptance Criteria:**
- All 7 content rows exist in `generierter_content` with `status = 'entwurf'`
- `hauptseite` meta fields respect character limits
- `faq` has minimum 10 pairs with direct answers
- `vergleich` covers all 8 configured insurers
- `tarif` covers age range 40–85 and includes disclaimer
- 3 ratgeber articles each have minimum 4 body paragraphs

---

#### Task Group 4: Content Review Workflow
**Dependencies:** Task Group 3 (all 7 content rows must be in `entwurf` status)

- [x] 4.0 Review all generated content in the admin and advance status to `review`
  - [x] 4.1 Open `/admin/produkte/[id]/content` and confirm all 7 content rows are listed with status indicators showing `entwurf`
  - [x] 4.2 Open the `hauptseite` content row in the inline editor:
    - Verify the `meta_title` character counter shows green (within 60 chars)
    - Verify the `meta_desc` character counter shows green (within 160 chars)
    - Make at least one manual edit to the hero headline text (e.g. refine the wording) and save — confirm the change is persisted in the database
  - [x] 4.3 Open the `faq` content row:
    - Verify at least 10 FAQ pairs are displayed
    - Spot-check 3 answers to confirm each begins with a direct factual sentence
  - [x] 4.4 Open the `vergleich` content row:
    - Confirm all 8 insurer names from `produkt_config.anbieter` appear as columns or entries
  - [x] 4.5 Open the `tarif` content row:
    - Confirm the disclaimer text is visible in the preview
  - [x] 4.6 Open each of the 3 `ratgeber` content rows:
    - Confirm at least 4 body paragraphs are visible in each preview
  - [x] 4.7 Advance all 7 content rows from `entwurf` to `review` using the status toggle in the admin UI
  - [x] 4.8 Verify in Supabase Table Editor that all 7 rows in `generierter_content` now show `status = 'review'`

**Acceptance Criteria:**
- At least one manual edit to the hauptseite hero headline is saved successfully
- Character counters for `meta_title` and `meta_desc` display green on the hauptseite row
- All 7 content rows have `status = 'review'` in Supabase

---

### Frontend & Design

#### Task Group 5: Design Token Verification
**Dependencies:** Task Group 3 (public pages must render generated content to verify design application)

- [x] 5.0 Verify the Navy + Gold design system is correctly applied across all public pages
  - [x] 5.1 Confirm `design-tokens/tokens.json` Navy (`#1a365d`) and Gold (`#d4af37`) values are mapped in `tailwind.config.ts` as named color extensions (not as inline styles in component files)
  - [x] 5.2 Verify `public/images/hero-bg.jpg` exists (copied from `sterbegeld24plus-recreation/assets/hero-bg.jpg`)
  - [x] 5.3 Load `/sterbegeld24plus` in the browser and verify the hero section:
    - Hero background image is present
    - Navy overlay `#1a365d` at approximately 70% opacity is visible over the image
    - Headline text is white
    - CTA button renders in Gold `#d4af37`
  - [x] 5.4 Verify feature cards on the `/sterbegeld24plus` page:
    - Cards have white background
    - Border radius is approximately 12px
    - On hover, a Gold bottom border appears
  - [x] 5.5 Verify the trust bar on `/sterbegeld24plus`:
    - Full-width section with Navy `#1a365d` background
    - Stat values render in Gold `#d4af37`
    - Stat labels render in white
  - [x] 5.6 Verify CTA button states across all public pages:
    - Default background is Gold `#d4af37`
    - Hover state shifts to `#b8860b`
    - Hover triggers `translateY(-2px)` lift (visible in browser DevTools computed styles or visual inspection)
  - [x] 5.7 Verify breadcrumbs on subpages (faq, vergleich, tarife, ratgeber articles):
    - Text color is muted (`#4a5568`)
    - Separator character is `/`
  - [x] 5.8 Open browser DevTools on each of the 5 route types and confirm no inline `style=` attributes are used for the above color/design values — all must come from Tailwind utility classes derived from the token config

**Acceptance Criteria:**
- `tailwind.config.ts` contains explicit color extensions for Navy and Gold tokens
- Hero image, overlay, headline, and CTA match the spec values on `/sterbegeld24plus`
- Trust bar, feature cards, CTA button, and breadcrumbs match spec values on all relevant pages
- No inline style overrides for brand colors — all design applied via Tailwind config extension

---

### SEO & AEO

#### Task Group 6: SEO Verification Checklist
**Dependencies:** Task Group 5 (pages must be rendering correctly before SEO metadata is verified)

- [x] 6.0 Verify all SEO and AEO requirements before publish
  - [x] 6.1 Fetch `/sitemap.xml` in the browser and confirm all 7 required URLs are present:
    - `/sterbegeld24plus`
    - `/sterbegeld24plus/faq`
    - `/sterbegeld24plus/vergleich`
    - `/sterbegeld24plus/tarife`
    - `/sterbegeld24plus/ratgeber`
    - `/sterbegeld24plus/ratgeber/was-ist-sterbegeld`
    - `/sterbegeld24plus/ratgeber/fuer-wen`
    - `/sterbegeld24plus/ratgeber/kosten-leistungen`
  - [x] 6.2 Fetch `/robots.txt` and confirm:
    - `Allow` or no `Disallow` rules for: Googlebot, GPTBot, ClaudeBot, PerplexityBot, Google-Extended, anthropic-ai (or global `User-agent: *` Allow with only /admin disallowed)
    - `Disallow: /admin/` is present for all user agents
  - [x] 6.3 Fetch `/llms.txt` (served from `public/llms.txt`) and confirm:
    - An entry for `sterbegeld24plus` exists
    - Entry contains: product name, a description, the canonical URL, and a list of available sub-pages
  - [x] 6.4 For each of the 7 public routes, use browser DevTools (View Source or Elements) to verify `<head>` metadata:
    - `<title>` is unique per page and matches the `meta_title` from `generierter_content`
    - `<meta name="description">` is present and 160 characters or fewer
    - `<link rel="canonical">` is present and uses `NEXT_PUBLIC_BASE_URL` as the domain base
  - [x] 6.5 For each of the 5 route types, use browser DevTools to verify `<script type="application/ld+json">` Schema.org markup is injected:
    - `/sterbegeld24plus`: contains `InsuranceAgency`, `Product`, and `BreadcrumbList` types
    - `/sterbegeld24plus/faq`: contains `FAQPage` with `Question` and `Answer` types
    - `/sterbegeld24plus/vergleich`: contains `ItemList` and `Product` types
    - `/sterbegeld24plus/ratgeber/[thema]`: contains `Article`, `BreadcrumbList`, and `HowTo` types
    - `/sterbegeld24plus/tarife`: contains `HowTo` type
  - [x] 6.6 Validate Schema.org markup for the hauptseite and faq page using Google's Rich Results Test (https://search.google.com/test/rich-results) or schema.org validator — confirm no critical errors

**Acceptance Criteria:**
- All 7 (or 8, depending on ratgeber count) sitemap entries are present and correct
- `robots.txt` allows all specified AI crawlers and blocks `/admin/`
- `llms.txt` contains a complete sterbegeld24plus entry
- All pages have unique titles, descriptions within 160 chars, and canonical URLs
- All Schema.org markup is present per page type and passes validation

---

### Integration Testing

#### Task Group 7: End-to-End Lead Flow Test
**Dependencies:** Task Group 5 (public pages must be rendering and accessible; lead form component must be visible on the hauptseite)

- [x] 7.0 Submit a test lead and verify the full pipeline from form to CRM
  - [x] 7.1 Navigate to `/sterbegeld24plus` in the browser; confirm the lead form is visible and fields are rendered correctly (Vorname, Nachname, E-Mail, Telefon, Interesse textarea)
  - [x] 7.2 Submit a test lead with clearly identifiable test data, for example:
    - Vorname: "Test"
    - Nachname: "Pilot"
    - E-Mail: a real email address you can check
    - Telefon: "0151 0000000"
    - Interesse: "Testanfrage für Pilot-Lead-Flow"
  - [x] 7.3 Verify Supabase `leads` table immediately after submit:
    - New row exists with correct `produkt_id` pointing to sterbegeld24plus
    - All submitted fields are populated
    - `zielgruppe_tag` is set (e.g. "senioren_50plus" from product config default)
    - `intent_tag` is set (e.g. "sicherheit" from product fokus)
    - `confluence_synced = false` at this stage
    - `resend_sent = false` at this stage
  - [x] 7.4 Wait for async Confluence sync to complete (up to 30 seconds) then verify in Confluence:
    - Page appears in the configured space under the parent page (CONFLUENCE_PARENT_PAGE_ID)
    - Page title matches format: "Lead: Test Pilot — Sterbegeld24Plus — [Datum today]"
    - Page body contains a table with all submitted lead fields
    - Page has labels applied: `sterbegeld24plus`, and at least one of the zielgruppe/intent tags
  - [x] 7.5 Verify Supabase `leads` row is updated after Confluence sync:
    - `confluence_synced = true`
    - `confluence_page_id` is a non-empty string matching the Confluence page ID
  - [x] 7.6 Check the test email inbox for the lead confirmation email:
    - Email is in German
    - Subject line and/or body includes the lead's Vorname ("Test")
    - Product name "Sterbegeld24Plus" or equivalent is mentioned
  - [x] 7.7 Check the configured sales notification email address for the notification:
    - Email contains all submitted lead fields
    - Email includes the Confluence page link (`confluence_page_id` or direct URL)
  - [x] 7.8 Verify Supabase `leads` row shows `resend_sent = true` after email dispatch
  - [x] 7.9 Write up to 3 focused Playwright or Vitest integration tests covering the critical path:
    - Test 1: POST to `/api/leads` with valid data returns 201 and creates a Supabase row
    - Test 2: Lead row fields are correctly mapped (produkt_id, intent_tag, zielgruppe_tag)
    - Test 3: `confluence_synced` and `resend_sent` flags update to true within a timeout window (mock Confluence and Resend in test environment)
  - [x] 7.10 Run only the 3 tests written in 7.9 and confirm all pass

**Acceptance Criteria:**
- Supabase `leads` row is created with all correct field values
- Confluence page exists with correct title format, data table, and labels
- `confluence_synced = true` and `confluence_page_id` is populated
- Lead confirmation email received at the test address in German
- Sales notification email received with all fields and Confluence link
- `resend_sent = true` in Supabase
- The 3 integration tests from 7.9 pass

---

#### Task Group 8: Tarifrechner Verification
**Dependencies:** Task Group 5 (tarife page must be rendering correctly with design tokens applied)

- [x] 8.0 Verify all Tarifrechner behaviors on `/sterbegeld24plus/tarife`
  - [x] 8.1 Load `/sterbegeld24plus/tarife` and confirm the page renders without console errors
  - [x] 8.2 Verify the age slider:
    - Minimum value is 40
    - Maximum value is 85
    - Default/initial position is at 55
    - Dragging the slider updates the displayed age value in real time
  - [x] 8.3 Verify the Wunschsumme input or selector:
    - Default value is 10.000 €
    - All 5 Wunschsumme tiers are selectable
  - [x] 8.4 Trigger a calculation (submit or automatic update) and verify the result display:
    - A monthly premium range is shown (two numbers with a dash or "–" between them)
    - 2 to 3 insurer names from the configured `anbieter` list appear in the result (e.g. "Zurich", "Barmenia")
    - The result is plausible (not obviously wrong, e.g. not 0 € or 9999 €)
  - [x] 8.5 Verify the disclaimer is visible in the result area — must be shown any time a result is displayed, not hidden or collapsed
  - [x] 8.6 Click the "Ihren genauen Beitrag jetzt anfragen" CTA and verify:
    - A lead form is revealed on the same page (not a redirect)
    - The form's hidden `intent_tag` field is pre-set to `"preis"` (check via DevTools or form submit network payload)
  - [x] 8.7 Submit the Tarifrechner lead form with test data and verify in Supabase that the resulting `leads` row has `intent_tag = 'preis'`

**Acceptance Criteria:**
- Age slider range is exactly 40–85 with default at 55
- Wunschsumme defaults to 10.000 € with all 5 tiers accessible
- Result shows a plausible monthly premium range with 2–3 named insurers
- Disclaimer is always visible when a result is shown
- Tarifrechner CTA reveals the lead form with `intent_tag = 'preis'` pre-set
- Supabase confirms `intent_tag = 'preis'` on the submitted lead

---

### Publication

#### Task Group 9: Publish All Content
**Dependencies:** Task Groups 4, 6, 7, and 8 (all review, SEO, lead flow, and tarifrechner checks must pass before publishing)

- [x] 9.0 Publish all content and verify public availability
  - [x] 9.1 Navigate to `/admin/produkte/[id]/content` and advance all 7 content rows from `review` to `publiziert` using the status toggle (do not skip the toggle — each row must be changed individually to confirm the UI control works)
  - [x] 9.2 Verify in Supabase Table Editor that all 7 rows in `generierter_content` have:
    - `status = 'publiziert'`
    - `published_at` is a non-null timestamp set to approximately the time of toggle action
  - [x] 9.3 Navigate to `/admin/produkte` and set `produkte.status` to `aktiv` for the sterbegeld24plus product
  - [x] 9.4 Verify in Supabase Table Editor that the `produkte` row has `status = 'aktiv'`
  - [x] 9.5 Verify all public URLs return HTTP 200 (test in browser and/or via `curl -I`):
    - `GET /sterbegeld24plus` → 200
    - `GET /sterbegeld24plus/faq` → 200
    - `GET /sterbegeld24plus/vergleich` → 200
    - `GET /sterbegeld24plus/tarife` → 200
    - `GET /sterbegeld24plus/ratgeber/was-ist-sterbegeld` → 200
    - `GET /sterbegeld24plus/ratgeber/fuer-wen` → 200
    - `GET /sterbegeld24plus/ratgeber/kosten-leistungen` → 200
  - [x] 9.6 Manually click through all internal links on the hauptseite (`/sterbegeld24plus`) and confirm:
    - Navigation links to `/faq`, `/vergleich`, `/tarife`, `/ratgeber` all resolve correctly (no 404)
    - CTA button anchor (`#formular`) scrolls to the lead form section
    - No browser console errors (404, JS exceptions) appear during navigation
  - [x] 9.7 Manually click through at least one ratgeber article's internal links to confirm breadcrumb links resolve correctly
  - [x] 9.8 Confirm the homepage at `/` (Produktübersicht) lists sterbegeld24plus with a working link to `/sterbegeld24plus`

**Acceptance Criteria:**
- All 7 `generierter_content` rows have `status = 'publiziert'` and a non-null `published_at`
- `produkte.status = 'aktiv'` for sterbegeld24plus
- All 7 public routes return HTTP 200
- No broken internal links on any page
- Homepage lists sterbegeld24plus and the link resolves

---

## Execution Order

Implement and verify in this exact sequence:

1. Admin Product Setup (Task Group 1) — establish the data foundation
2. Wissensfundus Seeding (Task Group 2) — provide knowledge context for AI generation
3. Content Generation (Task Group 3) — trigger and verify all 7 content rows
4. Content Review Workflow (Task Group 4) — review content, make a manual edit, advance to `review`
5. Design Token Verification (Task Group 5) — confirm visual design is correct on rendered pages
6. SEO Verification Checklist (Task Group 6) — validate all metadata, sitemaps, and Schema.org markup
7. End-to-End Lead Flow Test (Task Group 7) — prove the full pipeline works from form to CRM
8. Tarifrechner Verification (Task Group 8) — validate the pseudo-calculator and its lead integration
9. Publish All Content (Task Group 9) — advance all content to `publiziert` and set product to `aktiv`

**Do not proceed to the next group until all acceptance criteria for the current group are met.**
