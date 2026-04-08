# Product Mission

## Pitch

LeadMonster is a SaaS content automation system that helps insurance sales teams (Finanzteam 26) scale their digital lead generation by turning a simple product configuration into a fully published, SEO- and AEO-optimized insurance website — complete with landing pages, FAQs, comparison pages, and working lead forms — in minutes instead of weeks.

---

## Users

### Primary Customers

- **Insurance Sales Teams (Vertrieb):** Non-technical sales staff who need to launch product-specific websites quickly without involving developers or agencies for every new insurance product.
- **Admin Users:** System configurators who manage API credentials, Confluence workspaces, email sequences, and overall platform settings.

### User Personas

**Sales Manager / Vertriebsmitarbeiter** (35–55)
- **Role:** Insurance product manager or field sales lead at Finanzteam 26
- **Context:** Responsible for multiple insurance products across different target audiences; currently spends days coordinating with external agencies to build each product's web presence
- **Pain Points:** Every new product requires a full manual build cycle; no consistency between product pages; no visibility into leads generated per product; content updates require external help
- **Goals:** Launch a new product website the same day a product is configured; see all leads in one place; hand off lead details to Confluence automatically without manual data entry

**Insurance Prospect / End User** (50+, families, individuals)
- **Role:** Person researching insurance options online or via AI search
- **Context:** May arrive via Google search, AI assistant recommendation, or a direct link from the sales team
- **Pain Points:** Confusing insurance jargon; difficulty comparing providers; uncertainty about costs before speaking to an agent
- **Goals:** Quickly understand what the product covers, get a cost estimate, and request a personal consultation with minimal friction

---

## The Problem

### Manual Product Website Creation Does Not Scale

Each new insurance product today requires building a standalone website from scratch — writing copy, structuring pages, handling SEO, setting up forms, and wiring lead delivery to the CRM. This takes days to weeks per product and produces inconsistent quality with no reuse across campaigns.

**Our Solution:** A configuration-driven system where entering a product type, target audience, and sales focus triggers automatic generation of a complete, high-quality website via Claude AI — stored in a database, rendered with SSG for SEO, and connected to lead capture and CRM delivery from day one.

### Lead Capture is Disconnected from CRM Workflows

Leads collected via web forms are either lost in email inboxes or require manual re-entry into the sales team's Confluence workspace, creating delays and errors in follow-up.

**Our Solution:** Every submitted lead is automatically saved to Supabase, creates a structured Confluence page in the correct space, and triggers both a prospect confirmation email and a sales team notification — with zero manual steps.

---

## Differentiators

### AI-Powered, Not Template-Based

Unlike page builders or CMS platforms, LeadMonster uses Claude AI to generate context-aware content tailored to a specific product type, target audience, and sales focus. The output is not a filled-in template — it is audience-appropriate copy with SEO metadata, Schema.org markup, and conversion-optimized CTAs built in.

### AEO-First: Built for AI Search

Unlike traditional SEO tools, LeadMonster generates content structured for AI-powered search engines (ChatGPT, Perplexity, Gemini) from the ground up. Every page starts with a direct definitional answer, every FAQ mirrors natural language queries, and an `llms.txt` file makes the entire product catalog machine-readable for LLM crawlers. This results in visibility in both classical and AI-driven search surfaces.

### Confluence as the Sales CRM

Unlike systems that require a separate CRM purchase or integration layer, LeadMonster writes leads directly into the sales team's existing Confluence workspace as structured, labeled pages — fitting seamlessly into the workflow Finanzteam 26 already uses.

---

## Key Features

### Core Features

- **AI Content Generation:** Enter product type, audience, and focus — Claude generates complete page content (hero, features, FAQ, comparison, guides), SEO metadata, and Schema.org markup as structured JSON, ready to publish.
- **Admin Dashboard:** A protected, role-based UI where the sales team creates products, triggers generation, previews content, reviews leads, and manages system settings — no developer required for daily operations.
- **Dynamic Public Pages:** Every product automatically gets a full set of SSG-rendered pages (`/[produkt]`, `/faq`, `/vergleich`, `/tarife`, `/ratgeber/[thema]`) optimized for both Google and AI search engines.

### Lead Capture Features

- **Lead Forms with Intent Tagging:** Every form submission is tagged with the product, target audience segment, and sales intent (security / price / instant coverage) derived from how the user navigated the site.
- **Automated Confluence CRM Sync:** Leads are written to the team's Confluence space as structured pages with all contact data, intent signals, and timestamps — immediately accessible to the sales team.
- **Email Automation via Resend:** Prospects receive an instant confirmation email; the sales team receives a notification with lead details — both triggered automatically on form submission.

### Advanced Features

- **Knowledge Base (Wissensfundus):** A managed library of categorized insurance knowledge articles that serve as factual grounding context for every AI generation request — ensuring accuracy and consistency across products.
- **Pseudo-Tariff Calculator:** A conversion-optimized cost estimator using pre-loaded example data that gives prospects a realistic price range and channels them into the lead form with the intent tag `preis` pre-set.
- **SEO/AEO Automation:** Auto-generated `sitemap.xml`, `robots.txt`, `llms.txt`, and per-page Schema.org JSON-LD ensure every published product is immediately indexable by both search engines and AI crawlers.
