# Product Mission

> Companion document to `CLAUDE.md` (full technical spec). This file defines the product vision; CLAUDE.md defines the implementation contract.

## Pitch

**LeadMonster** is a scalable sales-content platform that helps insurance sales teams at **Finanzteam 26** turn weeks of bespoke product launches into a minutes-long admin workflow — by auto-generating fully SEO- and AEO-optimized product microsites (landing page, FAQs, comparisons, pseudo tariff calculator, advisor articles, lead form) from a few configuration inputs, with built-in lead capture flowing directly into Confluence as the CRM.

## Users

### Primary Customers

- **Finanzteam 26 — Vertrieb (Sales / Marketing Lead):** The internal operator who configures new insurance products in the admin, generates content via Claude, reviews and publishes. Wants speed and consistency without an engineering ticket per product.
- **End Consumers (Insurance Prospects, DE market):** Individuals searching Google or asking AI assistants (ChatGPT, Perplexity, Gemini) for insurance information — Sterbegeld, Pflege, Lebensversicherung, Unfall. They land on a LeadMonster microsite, find the answer fast, and submit a lead.
- **Finanzteam 26 — Insurance Advisors (Sales Follow-up):** The advisors who receive each new lead as a structured Confluence page, complete with target-group and intent tags, and call the prospect.

### User Personas

**Sales Lead at Finanzteam 26** (35–55)
- **Role:** Sales / Marketing Manager responsible for product launches.
- **Context:** Needs to launch new insurance products quickly. Today: every product is a manual project with engineering, copywriting, design, and CRM-wiring effort.
- **Pain Points:** Time-to-market is weeks; copy is inconsistent across products; FAQs are written by hand; lead forms are wired bespoke each time; no SEO/AEO baseline.
- **Goals:** Add a new product in under an hour; ship a publishable microsite the same day; trust that lead intake just works.

**Insurance Prospect — Sterbegeld / Pflege Buyer** (45–70)
- **Role:** Private individual researching financial protection for themselves or family.
- **Context:** Found the page via Google search or asked an AI assistant a question; wants clear, trustworthy answers in German, no marketing jargon.
- **Pain Points:** Insurance topics feel opaque; comparison sites are noisy; unsure who to trust.
- **Goals:** Understand the product in 60 seconds; see a price ballpark; submit interest without a 20-field form.

**Insurance Advisor — Sales Follow-up** (30–55)
- **Role:** Telephone advisor at Finanzteam 26.
- **Context:** Works from a Confluence space ("Leads 2026"). Each new lead arrives as a structured page with all context pre-filled.
- **Pain Points:** Generic CRM leads with no context — no idea why the prospect submitted; no intent signal.
- **Goals:** Open the lead, see product / target-group / intent tags / message at a glance, call within minutes.

## The Problem

### Every Insurance Product Is a One-Off Project
Launching a new insurance product traditionally means manual landing pages, hand-written FAQs, bespoke comparison tables, and one-off lead-form wiring. A single product can take **2–4 weeks** of cross-team effort. Brand consistency drifts and SEO/AEO baselines are inconsistent.

**Our Solution:** A structured admin where the sales lead configures Product + Target Group + Focus, and the Content Engine (Anthropic Claude) generates a complete microsite in JSON, ready to review, edit, and publish — same brand DNA, same SEO/AEO standard, distinct accent color per product.

### Lead Intake Is Disconnected from Content
Leads from product pages typically land in a generic mailbox, an Excel sheet, or a CRM with no product or intent context. Advisors waste time on cold outreach.

**Our Solution:** Every lead flows automatically into Confluence as a fully-formatted page in the team's existing workspace — labeled with product slug, target-group tag, and intent tag — plus an instant Resend confirmation to the prospect and notification to sales.

### AI Search Is a New Distribution Channel That Generic Sites Ignore
ChatGPT, Perplexity, and Gemini are increasingly answering insurance questions directly. Most insurance sites are optimized only for classic Google SEO and are invisible to AI crawlers.

**Our Solution:** Every page ships with AEO-grade structure: 2–3-sentence opening definition, FAQ phrasing matching real user queries, complete Schema.org JSON-LD (FAQPage, Product, InsuranceAgency, Article), an `llms.txt` describing the system, and AI-crawler-friendly `robots.txt`.

## Differentiators

### Minutes, Not Weeks, From Idea to Live Microsite
Unlike traditional WordPress or hand-coded landing pages, LeadMonster generates an entire SEO/AEO-optimized microsite — landing, FAQ, comparison, pseudo tariff calculator, advisor articles — from a 5-field admin form. **Result:** time-to-market drops from weeks to under a day per product.

### AEO-Native, Not Just SEO-Bolted-On
Unlike SEO plugins added to generic CMSs, LeadMonster bakes AEO into the content model itself — Claude prompts enforce direct-answer FAQ phrasing, every page emits Schema.org JSON-LD, and `llms.txt` describes the full system to AI crawlers. **Result:** product pages surface in both Google and AI-assistant answers.

### CRM Built In — No Integration Project
Unlike landing-page tools that hand off leads to email or third-party CRMs, LeadMonster turns each lead into a fully-tagged Confluence page in the team's existing workspace, with Resend confirming the prospect and notifying the advisor in the same request. **Result:** zero CRM-integration work per product.

### Brand-Consistent, Yet Distinct Per Product
Unlike multi-tenant SaaS landing builders, every LeadMonster microsite shares the Finanzteam 26 design system (Nunito Sans + Roboto, cyan/navy/orange palette, MonsterLogo) but each product gets its own accent color. **Result:** trust-building consistency without monotony.

### Editable After Generation — No AI Lock-In
Unlike fully-generative AI website builders, every Claude-generated page is stored as structured JSON in Supabase and editable in the admin Content Preview. **Result:** the sales team owns the final word, not the model.

## Key Features

### Core Features (Content Engine)

- **Produkt-Konfigurator:** Sales enters product name, type (Sterbegeld / Pflege / Leben / Unfall), target groups, focus tag (Sicherheit / Preis / Sofortschutz), and providers. The Produkt-DNA is stored in Supabase.
- **KI-Content-Generierung:** Anthropic Claude (`claude-opus-4-6`) consumes the Wissensfundus knowledge base + Produkt-DNA + Vertriebssteuerung and emits structured JSON for every page type.
- **Content Preview & Editor:** Generated content is reviewable section-by-section in the admin. Manual edits persist alongside the generated structure — no AI lock-in.
- **Wissensfundus-Verwaltung:** A first-class admin section to maintain reusable insurance domain content (definitions, regulatory facts, comparisons) that informs every Claude generation.
- **Web-Scraper:** Pulls reference content from competitor and source sites (e.g. sterbegeld24plus origin) into the Wissensfundus, available both as CLI script and admin UI.

### Public-Facing Features (Per Product Microsite)

- **Hauptseite (Landing):** Hero, feature grid, trust bar, integrated lead form. Server-rendered for SEO.
- **FAQ-Seite:** AEO-optimized question-and-answer format with FAQPage Schema.org markup.
- **Vergleichsseite:** Provider comparison table with ItemList + Product schema.
- **Pseudo-Tarifrechner:** Conversion-optimized example calculator (age + sum input → ballpark range → CTA to lead form). Auto-tags lead intent as "preis".
- **Ratgeber-Artikel:** Long-form advisor articles with Article + HowTo schema, addressing target-group-specific decisions.
- **Rechtsseiten:** Per-product Impressum, Datenschutz, AGB, Kontakt — auto-generated and customizable.

### Lead-Flow Features

- **Lead-Formular:** Brand-consistent React component embedded across every microsite page. Validated with Zod.
- **Confluence-Sync:** Each submitted lead becomes a structured Confluence page with title, table of fields, and labels (product slug, target-group tag, intent tag) under the configured parent page.
- **Resend-E-Mails:** Instant confirmation to the prospect and notification to the sales team — both customizable per product via the Email-Sequenzen table.
- **Lead-Inbox:** Admin view listing all leads with sync status and product context.

### SEO / AEO Features

- **generateMetadata pro Route:** Dynamic per-page meta titles and descriptions sourced from the database.
- **Schema.org JSON-LD:** Auto-emitted per page type (FAQPage, Product, InsuranceAgency, Article, BreadcrumbList).
- **sitemap.xml + robots.txt + llms.txt:** Auto-generated; AI crawlers explicitly welcomed.
- **Per-Produkt-Akzentfarbe:** Each product receives a distinct accent color while inheriting the Finanzteam 26 brand system.

### Admin Platform Features

- **Supabase-Auth-geschützter Admin-Bereich:** Login required; all admin routes guarded.
- **Produkt-CRUD + Status-Workflow:** Entwurf → Review → Publiziert state machine.
- **Einstellungen:** Confluence credentials and other secrets are managed in-DB (encrypted) with `.env` fallbacks — rotatable without redeploy.
