# Specification: Pilot Product — sterbegeld24plus End-to-End

## Goal
This is an integration and validation spec — not a new code feature. Its purpose is to prove the full LeadMonster system works end-to-end using `sterbegeld24plus` as the pilot product: admin setup → AI content generation → public pages live → lead form → Supabase → Confluence → Resend emails → published.

## User Stories
- As a sales admin, I want to configure the sterbegeld24plus product and generate all content so that the pilot product is live and generating leads.
- As a site visitor, I want to land on a complete, well-designed sterbegeld24plus page and submit a lead form so that I can request a personal offer.
- As a sales team member, I want to receive a Confluence page and email notification for every submitted lead so that I can follow up immediately.

## Specific Requirements

### 1. Admin Product Setup

Create the product record in the admin UI with these exact values:

**`produkte` table:**
- `name`: "Sterbegeld24Plus"
- `slug`: "sterbegeld24plus"
- `typ`: "sterbegeld"
- `status`: "entwurf" (will be set to `aktiv` at publish)

**`produkt_config` table:**
- `zielgruppe`: ["senioren_50plus", "familien"]
- `fokus`: "sicherheit"
- `anbieter`: ["Zurich", "Volkswohl Bund", "Barmenia", "Alte Leipziger", "Allianz", "AXA", "Concordia", "Gothaer"]
- `argumente`:
  ```json
  {
    "sofortschutz": "Sofortiger Versicherungsschutz ohne Wartezeit bei den meisten Anbietern",
    "garantierte_leistung": "Garantierte Auszahlung ohne Gesundheitsprüfung bis 15.000 €",
    "entlastung": "Entlastet Angehörige von Bestattungskosten (Ø 8.000–12.000 €)",
    "flexibel": "Flexible Laufzeiten und Beitragszahlungen",
    "transparent": "Keine versteckten Kosten, klare Leistungsübersicht"
  }
  ```

### 2. Wissensfundus Seeding

Create minimum 5 knowledge articles in `/admin/wissensfundus` with `kategorie = "sterbegeld"`:

| `thema` | Minimum content requirement |
|---|---|
| `was_ist_sterbegeld` | Definition, purpose, typical payout range (5.000–15.000 €), difference from life insurance |
| `fuer_wen_geeignet` | Target audience (senioren 50+, families), typical motivation (not burdening family), health restrictions common in this age group |
| `kosten_und_leistungen` | Monthly premium ranges by age bracket, what is covered (funeral costs, transport, burial), what is excluded |
| `anbieter_unterschiede` | Key differentiators between insurers: waiting periods, health questionnaire requirements, guaranteed acceptance, payout speed |
| `antragsprozess` | How to apply, required documents, online vs. paper application, acceptance timeline |

Each article must have at least 150 words of content in `inhalt` and at least 3 relevant `tags`.

### 3. Content Generation

Trigger "Content generieren" for the sterbegeld24plus product and verify all 5 page types are generated:

- `hauptseite`: hero + features + trust + faq + lead_form sections; `meta_title` ≤ 60 chars, `meta_desc` ≤ 160 chars
- `faq`: minimum 10 question-answer pairs; each answer begins with a direct factual sentence
- `vergleich`: comparison table with all 8 configured insurers as columns
- `tarif`: age brackets covering 40–85, all 5 sum tiers, mandatory disclaimer present
- `ratgeber` (3 articles): slugs approximately `was-ist-sterbegeld`, `fuer-wen`, `kosten-leistungen`; each article has minimum 4 body paragraphs

All generated rows must have `status = 'entwurf'` after generation.

### 4. Content Review

Admin review workflow:
- Review each of the 7 generated content rows in `/admin/produkte/[id]/content`
- Verify `meta_title` and `meta_desc` character limits are respected (character counters show green)
- Make at least one manual edit to the hauptseite hero headline to confirm inline editing works
- Advance all 7 rows from `entwurf` → `review`

### 5. Design Token Application

Verify the Navy + Gold palette from `sterbegeld24plus-recreation/styles.css` is correctly applied across all public pages:

- **Hero section**: Navy overlay `#1a365d` at 70% opacity over `public/images/hero-bg.jpg`; white headline text; Gold `#d4af37` CTA button
- **Feature cards**: white background, 12px border radius, Gold bottom border on hover
- **Trust bar**: full-width Navy `#1a365d` background, Gold stat values, white labels
- **CTA buttons**: Gold `#d4af37` background, hover to `#b8860b`, `translateY(-2px)` lift
- **Breadcrumbs**: muted text `#4a5568`, separator `/`

Design tokens must be applied via Tailwind config extension (`tailwind.config.ts`), not inline styles.

### 6. SEO Verification Checklist

Before publishing, verify all SEO/AEO requirements are met:

- [ ] `sitemap.xml` at `/sitemap.xml` includes all 7 routes: `/sterbegeld24plus`, `/sterbegeld24plus/faq`, `/sterbegeld24plus/vergleich`, `/sterbegeld24plus/tarife`, `/sterbegeld24plus/ratgeber`, and the 3 ratgeber article URLs
- [ ] `robots.txt` at `/robots.txt` allows: Googlebot, GPTBot, ClaudeBot, PerplexityBot, Google-Extended, anthropic-ai; disallows `/admin/`
- [ ] `public/llms.txt` contains sterbegeld24plus entry with name, description, URL, and list of available sub-pages
- [ ] Each page has correct `generateMetadata` output: unique title, description ≤ 160 chars, canonical URL set
- [ ] Each page has Schema.org JSON-LD injected: hauptseite (InsuranceAgency+Product+BreadcrumbList), faq (FAQPage), vergleich (ItemList+Product), ratgeber (Article+BreadcrumbList+HowTo), tarif (HowTo)
- [ ] All canonical URLs use `NEXT_PUBLIC_BASE_URL` as the domain base

### 7. End-to-End Lead Flow Test

Submit a test lead from the sterbegeld24plus public landing page and verify:

1. **Supabase row created:** new row in `leads` table with correct `produkt_id`, all submitted fields populated, `confluence_synced = false`, `resend_sent = false`
2. **Confluence page created:** page appears in the configured space; title matches format "Lead: [Vorname] [Nachname] — Sterbegeld24Plus — [Datum]"; page contains the data table; labels applied: `sterbegeld24plus`, `senioren_50plus` (or submitted `zielgruppe_tag`), `sicherheit` (or submitted `intent_tag`)
3. **`confluence_synced` updated:** lead row shows `confluence_synced = true` and `confluence_page_id` is populated
4. **Resend confirmation email sent:** test email address receives German confirmation email with lead's first name and product name
5. **Resend sales notification sent:** configured `sales_notification_email` receives notification with all lead fields and Confluence page link
6. **`resend_sent` updated:** lead row shows `resend_sent = true`

### 8. Tarifrechner Verification

On the `/sterbegeld24plus/tarife` page:
- Age slider shows range 40–85, default 55
- Wunschsumme defaults to 10.000 €
- Result shows a plausible monthly premium range with 2–3 insurer names from the configured `anbieter` list
- Disclaimer is always visible once result shown
- "Ihren genauen Beitrag jetzt anfragen" CTA reveals lead form with `intent_tag = "preis"` pre-set

### 9. Publish All Content

Final publish steps:
- Set all 7 `generierter_content` rows to `status = 'publiziert'` (via admin content page status toggles)
- Verify `published_at` is set for all 7 rows
- Set `produkte.status` to `aktiv` for sterbegeld24plus
- Verify all public URLs return HTTP 200: `/sterbegeld24plus`, `/sterbegeld24plus/faq`, `/sterbegeld24plus/vergleich`, `/sterbegeld24plus/tarife`, all 3 ratgeber article URLs
- Verify no broken internal links on any page

## Existing Code to Leverage

**`sterbegeld24plus-recreation/styles.css`** — Navy/Gold CSS variables and section patterns that define the target visual output; use as reference to verify design token application

**`sterbegeld24plus-recreation/assets/hero-bg.jpg`** — hero background image; must be present at `public/images/hero-bg.jpg`

**`design-tokens/tokens.json`** — brand colors, typography, spacing; Tailwind config extension must map these

**`CLAUDE.md` — content JSON schema** — the `sections` array format for each page type; generated content must conform to this structure for the public pages to render correctly

**`CLAUDE.md` — lead flow** — step-by-step lead flow (Supabase → Confluence → Resend) that is validated by requirement 7 in this spec

## Out of Scope
- Second product setup (any product beyond sterbegeld24plus)
- Live insurer API or real tariff data
- AI-generated images or per-product hero images
- Email drip automation (`delay_hours > 0` sequences)
- Custom domain configuration for sterbegeld24plus
- RLS policy changes beyond blanket deny-all
- Admin user management (additional admin accounts)
- A/B testing of any content or design
- Analytics integration (Google Analytics, Plausible, etc.)
- Any route not listed in the sitemap verification checklist
