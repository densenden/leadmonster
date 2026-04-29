# Product Roadmap

> Phased delivery plan for LeadMonster. Phases 1–5 are largely complete (per recent commit `Initial LeadMonster-System: vollständige Implementierung aller 19 Specs`). Phases 6–8 define the path forward. See `CLAUDE.md` for the technical contract behind each item.

---

## Phase 1 — Foundation `[Done]`

Goal: Deliver the runtime, persistence, auth, and design system that everything else builds on.

1. [x] **Next.js 14 App Router scaffold** — TypeScript strict, design tokens wired into Tailwind config, Nunito Sans + Roboto via `next/font/google`. `M`
2. [x] **Supabase schema** — `produkte`, `produkt_config`, `wissensfundus`, `generierter_content`, `leads`, `einstellungen`, `email_sequenzen` migrated. `M`
3. [x] **Supabase Auth** — Admin login route, session guard in `app/admin/layout.tsx`, redirect to `/admin/login` when unauthenticated. `S`
4. [x] **Design system bring-up** — `design-tokens/tokens.json` aligned to finanzteam26.de brand (cyan #02a9e6, navy #1a3252, orange #f26522); shared `Button`, `Card`, `Badge`, `MonsterLogo` primitives. `S`
5. [x] **Environment + secrets convention** — `.env.local` wired, `.env.example` committed, no secrets in repo. `XS`

---

## Phase 2 — Content Engine `[Done]`

Goal: Generate a complete microsite from a 5-field admin form.

6. [x] **Anthropic Claude integration** — `lib/anthropic/generator.ts` with structured JSON output, Zod schemas in `lib/anthropic/schemas.ts`. Model: `claude-opus-4-6`. `L`
7. [x] **Admin Produkt-CRUD** — Create / edit / list / archive products; status workflow Entwurf → Review → Publiziert. `M`
8. [x] **Content generation pipeline** — Generates landing sections, 10 FAQs, 3 Ratgeber articles, comparison data, meta tags, Schema.org markup per product. `L`
9. [x] **Content preview & manual editor** — Section-by-section preview with persistence of manual edits alongside generated JSON; reset-content escape hatch. `M`
10. [x] **Wissensfundus admin** — CRUD over reusable insurance domain content with category + theme uniqueness constraint. `S`

---

## Phase 3 — Public Pages (SEO / AEO) `[Done]`

Goal: Every microsite is search-engine and AI-assistant ready out of the box.

11. [x] **Dynamic product subsite routes** — `/[produkt]`, `/[produkt]/faq`, `/[produkt]/vergleich`, `/[produkt]/tarife`, `/[produkt]/ratgeber/[thema]`. `L`
12. [x] **Pseudo-Tarifrechner** — `TarifRechner.tsx` + `CovomoRechner.tsx`, age + sum inputs → ballpark range → lead-form handoff with intent="preis". Vitest coverage. `M`
13. [x] **Per-product legal pages** — Impressum, Datenschutz, AGB, Kontakt auto-rendered with `LegalText.tsx` and migration `20260409000001_accent_color_legal_pages.sql`. `S`
14. [x] **SEO infrastructure** — `app/sitemap.ts`, `app/robots.ts`, `lib/seo/schema.ts`, `lib/seo/metadata.ts`; per-page `generateMetadata`. `M`
15. [x] **AEO infrastructure** — `llms.txt`, AI-crawler-allow `robots.txt`, FAQ direct-answer phrasing enforced in Claude prompts. `S`
16. [x] **Per-product accent color** — `lib/utils/accent.ts` plus DB column; each microsite renders with its own accent while inheriting the brand. `S`

---

## Phase 4 — Lead Flow `[Done]`

Goal: Every form submission becomes a structured CRM record with confirmation + notification, end-to-end.

17. [x] **LeadForm component** — Brand-consistent, Zod-validated, embeddable across all microsite pages. `S`
18. [x] **`/api/leads` endpoint** — Persist to Supabase, sync to Confluence, fire Resend emails, return confirmation. `M`
19. [x] **Confluence integration** — `lib/confluence/client.ts`; each lead becomes a labeled page under the configured parent; credentials read from `einstellungen` table with `.env` fallback. `M`
20. [x] **Resend integration** — `lib/resend/mailer.ts`; lead confirmation email + sales notification, customizable via `email_sequenzen`. `S`
21. [x] **Admin Lead-Inbox** — Lead list with product context and sync status indicators. `S`

---

## Phase 5 — Pilot Product Live (sterbegeld24plus) `[Done]`

Goal: Prove the full system end-to-end with the first real product.

22. [x] **Wissensfundus seeding** — `scripts/seed-wissensfundus-expanded.ts` populates Sterbegeld domain content. `S`
23. [x] **sterbegeld24plus product seed** — `scripts/seed-sterbegeld24plus.ts` creates the product, config, and triggers content generation. `S`
24. [x] **Web scraper for reference content** — `lib/scraper/` plus admin UI at `app/admin/(protected)/scraper/` and CLI `scripts/scrape-sterbegeld24plus.ts` to ingest reference site content into Wissensfundus. `M`
25. [x] **End-to-end lead-flow test** — Form submit → Supabase row → Confluence page created → Resend confirmation delivered. `XS`

---

## Phase 6 — Multi-Product Expansion `[Next]`

Goal: Move from one pilot product to a true product portfolio across all four insurance types.

26. [ ] **Pflegezusatzversicherung product launch** — Full product config + Wissensfundus seed + generated microsite reviewed and published. `M`
27. [ ] **Lebensversicherung product launch** — Full product config + seed + microsite. `M`
28. [ ] **Unfallversicherung product launch** — Full product config + seed + microsite. `M`
29. [ ] **Per-product lead routing** — Route Confluence parent page and Resend notification recipients dynamically based on `produkt.id`, configurable in admin Einstellungen. `S`
30. [ ] **Wissensfundus cross-product reuse audit** — Identify shared themes (e.g. "Was kostet eine Versicherung?") and refactor for reuse across all four product types. `S`
31. [ ] **Content quality review tooling** — Admin diff view between generated and edited content; flag stale generations for re-run. `M`

---

## Phase 7 — Analytics & Conversion Optimization `[Future]`

Goal: Measure what works and let the sales team iterate without engineering.

32. [ ] **Conversion tracking** — Server-side event tracking for page-view → calculator-use → form-submit funnel; per-product dashboard in admin. `M`
33. [ ] **A/B testing framework** — Variant column on `generierter_content` plus middleware-based traffic split; admin UI for declaring variants. `L`
34. [ ] **Lead-quality feedback loop** — Advisors flag lead quality in Confluence; pull labels back into Supabase to weight Claude prompts. `M`
35. [ ] **AEO performance monitoring** — Track AI-assistant referrals (User-Agent + Referer signals from known LLM crawlers); report which pages surface in AI answers. `M`

---

## Phase 8 — Integrations & Multi-Tenant `[Future]`

Goal: Open LeadMonster beyond Finanzteam 26's internal Confluence-only setup.

36. [ ] **Custom domain per product** — Wire `produkte.domain` column to Vercel domain configuration; per-product canonical URLs. `M`
37. [ ] **HubSpot CRM connector** — Alternative lead destination alongside Confluence, configurable per product. `M`
38. [ ] **Salesforce CRM connector** — Same pattern; configurable per product. `M`
39. [ ] **Generic webhook output** — Allow per-product webhook URLs to receive lead payloads for arbitrary integrations. `S`
40. [ ] **Multi-tenant isolation** — Tenant column on every table, Supabase RLS policies, separated admin spaces — only if a second client emerges. `XL`

---

> **Notes**
> - Items are ordered by technical dependency: data model → content engine → public pages → lead flow → pilot → expansion → optimization → integrations.
> - Each item is intended as an end-to-end (frontend + backend + DB) functional and testable feature, not a sub-task.
> - Effort scale: `XS` = 1 day, `S` = 2–3 days, `M` = 1 week, `L` = 2 weeks, `XL` = 3+ weeks.
> - Phases 1–5 reflect the current state of the codebase as of 2026-04-28 (commit `65fc688`). Mark items off as they are verified by automated tests or staging review.
