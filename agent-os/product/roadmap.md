# Product Roadmap

1. [ ] Supabase Schema & Database Foundation — All six database tables (`produkte`, `produkt_config`, `wissensfundus`, `generierter_content`, `leads`, `einstellungen`, `email_sequenzen`) are created in Supabase with correct types, foreign keys, RLS policies, and generated TypeScript types exported to `lib/supabase/types.ts`. `S`

2. [ ] Next.js Project Setup with Design Tokens — The existing Vite boilerplate is replaced by a Next.js 14+ App Router project; Tailwind CSS is configured with the design token values from `design-tokens/tokens.json` as theme extensions; the `assets/logo.png` and `sterbegeld24plus-recreation/styles.css` Navy/Gold palette are reflected in the token integration. `S`

3. [ ] Admin Authentication (Supabase Auth) — The `/admin` route group is protected by a Supabase Auth session guard in `app/admin/layout.tsx`; a `/admin/login` page allows email/password sign-in; unauthenticated users are redirected to the login page; authenticated sessions persist across page navigations. `S`

4. [ ] Knowledge Base Management (Wissensfundus) — The `/admin/wissensfundus` page allows admins to create, edit, and delete knowledge articles with category, topic, content (Markdown), and tags; articles are stored in the `wissensfundus` table and retrievable by category for use in generation prompts. `M`

5. [ ] Product Creation & Configuration Admin UI — The `/admin/produkte/neu` form allows sales staff to enter product name, slug, type (Sterbegeld / Pflege / Leben / Unfall), target audiences (multi-select), sales focus (Sicherheit / Preis / Sofortschutz), and insurer list; data is saved to `produkte` and `produkt_config` tables; the product list at `/admin/produkte` shows all products with their current status. `M`

6. [ ] AI Content Generation Engine — The `lib/anthropic/generator.ts` module calls the Claude API (`claude-opus-4-6`) with a structured prompt composed of system role, relevant Wissensfundus entries, product DNA, and sales focus; the `/api/generate` route triggers generation and saves the resulting structured JSON (sections, meta_title, meta_desc, schema_markup) to the `generierter_content` table with status `entwurf`. `L`

7. [ ] Content Preview & Manual Editing — The `/admin/produkte/[id]/content` page renders a visual preview of all generated content sections alongside editable fields; editors can modify any section text and save changes back to the `generierter_content` table; status can be advanced from `entwurf` to `review` to `publiziert` via a status toggle. `M`

8. [ ] Public Landing Page with SSG — The `app/[produkt]/page.tsx` route renders the published `generierter_content` for a product using Next.js `generateStaticParams` and `generateMetadata`; hero, feature grid, trust bar, and lead form sections are rendered from the stored JSON; canonical URLs and Schema.org `InsuranceAgency + Product` JSON-LD are included in the page head. `M`

9. [ ] FAQ Public Page with Schema Markup — The `app/[produkt]/faq/page.tsx` renders all FAQ items from `generierter_content` with `FAQPage` Schema.org JSON-LD; each question/answer pair is formatted for AEO (direct answer in first sentence); the page has its own `generateMetadata` output with FAQ-specific meta title and description. `S`

10. [ ] Insurer Comparison Page — The `app/[produkt]/vergleich/page.tsx` renders a comparison table of insurers from the product config using `ItemList + Product` Schema.org markup; content is pulled from the `vergleich` section of `generierter_content`; the page ends with a lead form CTA. `S`

11. [ ] Pseudo-Tariff Calculator — The `app/[produkt]/tarife/page.tsx` presents an interactive age + desired-sum input form that returns an illustrative monthly premium range from pre-configured example data; a prominent disclaimer marks the output as indicative; submitting the follow-up form sets the `intent_tag` to `preis` and opens the lead form. `M`

12. [ ] Ratgeber Guide Pages — The `app/[produkt]/ratgeber/[thema]/page.tsx` renders long-form decision guide articles from `generierter_content` with `Article + BreadcrumbList + HowTo` Schema.org markup and `generateMetadata` per article; the admin content page lists all generated guide slugs and allows triggering generation of additional guides. `M`

13. [ ] Lead Form & Lead Capture API — The `LeadForm` component collects Vorname, Nachname, E-Mail, Telefon, and Interesse; on submit it calls `/api/leads` (POST) which validates input with Zod, saves the lead to the `leads` table with product, audience, and intent tags, and returns a success state; the form is embeddable on any public page. `S`

14. [ ] Confluence CRM Integration — The `/api/leads` route (after saving to Supabase) calls `lib/confluence/client.ts` to create a labeled Confluence page in the configured space with the lead data formatted as a table; credentials are read first from the `einstellungen` table and fall back to `process.env.CONFLUENCE_*`; `confluence_synced` is set to `true` on success. `M`

15. [ ] Resend Email Automation — After a lead is saved and Confluence-synced, `lib/resend/mailer.ts` sends a confirmation email to the prospect and a notification email to the sales team using templates from the `email_sequenzen` table; `resend_sent` is set to `true` on success; failed sends are logged without blocking the lead save. `S`

16. [ ] Admin Settings Page (Confluence & API Credentials) — The `/admin/einstellungen` page allows admins to view and update Confluence credentials (`base_url`, `email`, `api_token`, `space_key`, `parent_page_id`) stored in the `einstellungen` table; the `api_token` field is masked in the UI and stored encrypted; a test-connection button validates the current credentials. `M`

17. [ ] Admin Lead Overview — The `/admin/leads` page renders a paginated, filterable table of all leads across all products showing name, email, product, intent tag, Confluence sync status, and timestamp; each row links to the corresponding Confluence page; the table is server-rendered with Supabase server client. `S`

18. [ ] SEO Automation (Sitemap, Robots, llms.txt) — `app/sitemap.ts` generates a dynamic `sitemap.xml` covering all published product pages and their sub-routes; `app/robots.ts` produces a `robots.txt` that explicitly allows AI crawlers; `public/llms.txt` provides a structured plain-text description of all published products for LLM crawlers, auto-updated on content publish. `S`

19. [ ] Pilot Product: sterbegeld24plus End-to-End — The `sterbegeld24plus` product is fully configured in the admin, all content sections generated and reviewed, the Navy/Gold design from `sterbegeld24plus-recreation/` is applied via design tokens, the lead flow is tested end-to-end (form submit → Supabase → Confluence page → Resend emails), and the product is set to `publiziert` status. `L`

> Notes
> - Items are ordered by technical dependency: database and auth before UI, core engine before public pages, lead API before integrations, pilot launch last.
> - Each item represents a complete, testable end-to-end feature (frontend + backend where applicable).
> - SEO and AEO correctness should be verified at every public page step — do not defer Schema.org or metadata to a later pass.
> - The `einstellungen` table credential read logic must be in place before Confluence and Resend integrations are tested.
