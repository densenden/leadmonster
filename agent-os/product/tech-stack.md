# Tech Stack

Complete technical stack for LeadMonster — the AI-powered insurance product website and lead generation system for Finanzteam 26.

---

## Framework & Runtime

| Layer | Choice | Notes |
|---|---|---|
| Application Framework | Next.js 14+ (App Router) | SSR/SSG required for SEO; `generateStaticParams` for product pages |
| Language | TypeScript (strict mode) | No `any` types without justification; types generated from Supabase schema |
| Runtime | Node.js 20+ | Required by Next.js 14+ |
| Package Manager | npm | Default for this project |

---

## Frontend

| Layer | Choice | Notes |
|---|---|---|
| React Version | React 18+ | Server Components preferred for SEO; Client Components only for interactivity |
| CSS Framework | Tailwind CSS | Extended with design tokens from `design-tokens/tokens.json` as theme config |
| Design Tokens | `design-tokens/tokens.json` | Source of truth for all colors, typography, spacing |
| UI Components | Custom components following token system | shadcn/ui (New York style) available for admin UI primitives |
| State Management | React Context (simple), Zustand (complex admin state), TanStack Query (server state / data fetching) | |
| Typography | Nunito Sans (body, 300/400), Roboto (headings, 400/700) | Defined in `design-tokens/tokens.json` |

### Design Token Color Palette (from `tokens.json`)

| Token | Hex | Usage |
|---|---|---|
| Primary (Brand Blue) | `#abd5f4` | Primary buttons, accents, icons |
| Secondary / Accent (Brand Orange) | `#ff9651` | Secondary buttons, highlights, CTA indicators |
| Link Base | `#36afeb` | Anchor text |
| Link Hover | `#1e85c8` | Anchor hover state |
| Heading Text | `#333333` | All heading elements |
| Body Text | `#666666` | Paragraph content |
| Page Background | `#ffffff` | Default page background |
| Muted Background | `#f8f8f8` | Section backgrounds |
| Primary Background | `#e1f0fb` | Highlighted/feature sections |
| Border Divider | `#e5e5e5` | Dividers, card borders |

Note: The pilot product `sterbegeld24plus` uses a Navy + Gold premium palette from `sterbegeld24plus-recreation/styles.css`. These values are to be added to the design token system as a product-specific theme extension.

---

## Database & Storage

| Layer | Choice | Notes |
|---|---|---|
| Database | Supabase (PostgreSQL) | Hosted Postgres; project URL: `https://dwlopmxtiokdvjjowfke.supabase.co` |
| ORM / Query | Supabase JS client (`@supabase/supabase-js`) | Browser client (`lib/supabase/client.ts`), server client with service role (`lib/supabase/server.ts`) |
| Type Generation | Supabase CLI (`supabase gen types`) | Types output to `lib/supabase/types.ts` |
| Row-Level Security | Enabled on all tables | Admin tables protected; `leads` and `generierter_content` write-accessible via service role only |

### Database Tables

| Table | Purpose |
|---|---|
| `produkte` | Insurance product registry (slug, name, type, status) |
| `produkt_config` | Per-product configuration (audience, focus, insurers, arguments) |
| `wissensfundus` | Knowledge base articles used as AI generation context |
| `generierter_content` | AI-generated page content stored as structured JSON |
| `leads` | Lead submissions with CRM sync status |
| `einstellungen` | System settings including encrypted Confluence credentials |
| `email_sequenzen` | Email templates and trigger configurations per product |

---

## Authentication

| Layer | Choice | Notes |
|---|---|---|
| Auth Provider | Supabase Auth | Email/password for admin users |
| Session Guard | `app/admin/layout.tsx` | Server-side session check; redirects to `/admin/login` if unauthenticated |
| Public Access | No auth required | All `/[produkt]/*` routes are fully public |

---

## AI Content Generation

| Layer | Choice | Notes |
|---|---|---|
| AI Provider | Anthropic Claude API | Primary content generation engine |
| Model | `claude-opus-4-6` | Used for all content generation (quality requirement) |
| Integration | `lib/anthropic/generator.ts` | Structured prompt builder + JSON output parser |
| Input | Product type + audience + focus + Wissensfundus context | Assembled server-side before API call |
| Output Format | Structured JSON (`sections[]` array) | Stored in `generierter_content.content` (jsonb) |
| Trigger | `/api/generate` POST route | Admin-triggered; never public-facing |

---

## Email

| Layer | Choice | Notes |
|---|---|---|
| Email Provider | Resend | Transactional email for lead confirmations and sales notifications |
| Integration | `lib/resend/mailer.ts` | Called from `/api/leads` after lead is saved |
| Templates | `email_sequenzen` table | HTML body + subject stored per product, trigger type, and delay |
| Triggers | `form_submit` (immediate), `manual` | `delay_hours` field supports future drip sequences |

---

## Lead CRM

| Layer | Choice | Notes |
|---|---|---|
| CRM Platform | Confluence (Atlassian) | Leads created as structured Confluence pages |
| Integration | `lib/confluence/client.ts` | Confluence REST API v2 |
| Credential Resolution | DB-first with env fallback | Reads `einstellungen` table first; falls back to `process.env.CONFLUENCE_*` |
| Page Format | Confluence table with lead fields + labels | Labels: product slug, audience tag, intent tag |
| Sync Status | `confluence_synced` boolean in `leads` table | Set to `true` after successful page creation |

---

## Images

| Layer | Choice | Notes |
|---|---|---|
| Image Source | Unsplash API | Stock photography only; no AI image generation |
| Integration | Unsplash API key via `UNSPLASH_ACCESS_KEY` | Fetched server-side during content generation |
| Existing Assets | `assets/logo.png`, `sterbegeld24plus-recreation/assets/hero-bg.jpg` | Used directly; committed to repository |

---

## SEO & AEO

| Layer | Choice | Notes |
|---|---|---|
| Metadata | Next.js `generateMetadata()` | Dynamic per-route; sourced from `generierter_content` DB fields |
| Sitemap | `app/sitemap.ts` | Auto-generated; covers all published product routes |
| Robots | `app/robots.ts` | AI crawlers (`GPTBot`, `PerplexityBot`, etc.) explicitly allowed |
| LLMs.txt | `public/llms.txt` | Structured plain-text product catalog for LLM crawlers; updated on publish |
| Structured Data | Schema.org JSON-LD | Per page type: `InsuranceAgency+Product` / `FAQPage` / `ItemList` / `Article+HowTo` |
| Canonical URLs | Always set | Via `generateMetadata` `alternates.canonical` |

---

## Deployment & Infrastructure

| Layer | Choice | Notes |
|---|---|---|
| Hosting | Vercel | Native Next.js deployment; Edge functions for API routes |
| CI/CD | GitHub Actions | Lint, type check, and build validation on pull requests |
| Environment Variables | Vercel environment variables (production), `.env.local` (development) | Never committed to repository |
| Env Template | `.env.example` | Committed with all variable names, empty values |

---

## Input Validation

| Layer | Choice | Notes |
|---|---|---|
| Schema Validation | Zod | All API route inputs validated with Zod schemas before processing |
| TypeScript | Strict mode | `tsc --noEmit` run in CI |
| Linting | ESLint + Prettier | Auto-format on save; errors block commits |

---

## Testing

| Layer | Choice | Notes |
|---|---|---|
| Unit Tests | Vitest | Utility functions, content generators, Zod schemas |
| End-to-End Tests | Playwright | Critical flows: admin product creation, lead form submission, Confluence sync |
| Test Coverage Priority | Lead flow, content generation pipeline, auth guard | These are the highest-risk paths |

---

## Environment Variables Reference

```
# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dwlopmxtiokdvjjowfke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# Confluence
CONFLUENCE_BASE_URL=
CONFLUENCE_EMAIL=
CONFLUENCE_API_TOKEN=
CONFLUENCE_SPACE_KEY=
CONFLUENCE_PARENT_PAGE_ID=

# Unsplash
UNSPLASH_ACCESS_KEY=
```

All values managed via Vercel environment variables in production. Locally via `.env.local` (gitignored).
