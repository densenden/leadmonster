# Tech Stack

> Comprehensive technology inventory for LeadMonster. This document complements `CLAUDE.md`, which holds the full system specification, schema, and prompt architecture. When choices conflict, `CLAUDE.md` is authoritative.

---

## Architectural Layers

LeadMonster is a single Next.js application that exposes a public, SSR/SSG product microsite per insurance product and a Supabase-Auth-protected admin section for content generation, content review, lead intake, and Wissensfundus management. Persistence is Supabase Postgres; AI content comes from Anthropic Claude; lead intake goes out to Confluence and Resend.

---

## Application & Runtime

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR/SSG required for SEO/AEO; file-based dynamic routes (`[produkt]`); server components by default. |
| Language | **TypeScript (strict mode)** | Type safety across DB, API, and component boundaries; aligns with global standards. |
| Runtime | **Node.js (LTS)** | Required by Next.js; matches Vercel default. |
| Module system | **ESM** | Next.js App Router native. |
| Package manager | **npm** | `package-lock.json` committed; matches CI default on Vercel. |

---

## Frontend

| Layer | Choice | Why |
|---|---|---|
| Rendering | **React Server Components (default)** + Client Components only for interactivity | Maximizes SEO surface; minimizes client JS. |
| Styling | **Tailwind CSS** | Utility-first; pairs cleanly with design tokens. |
| Design tokens | **Custom JSON in `design-tokens/tokens.json`** + `tailwind-config-snippet.js` | Single source of truth for color, spacing, type. Aligned with finanzteam26.de brand: cyan `#02a9e6`, navy `#1a3252`, orange `#f26522`. |
| CSS variables | **Per-product accent via CSS custom properties** | Each product microsite reads its accent color from `lib/utils/accent.ts` and applies it through CSS vars. |
| Fonts | **Nunito Sans (body) + Roboto (headings)** via `next/font/google` | Matches Finanzteam 26 brand; self-hosted by Next for performance. |
| Iconography | **Custom SVG components** (`MonsterLogo.tsx`) + static SVGs in `public/icons/` | Brand-specific; no icon library bloat. |
| Component primitives | **In-house** (`components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`) | Tight coupling to design tokens; no third-party UI kit. |

---

## Backend & Data

| Layer | Choice | Why |
|---|---|---|
| Database | **Supabase (PostgreSQL)** | Managed Postgres with built-in Auth, REST, and Realtime; matches global standard. |
| Schema migrations | **Supabase migrations** in `supabase/migrations/` | Versioned SQL, replayable. |
| Auth | **Supabase Auth** | Email/password for admin users; session checked in `app/admin/layout.tsx`. |
| Server-side DB client | **`lib/supabase/server.ts`** (service role) | Used in API routes and server components. |
| Browser DB client | **`lib/supabase/client.ts`** (anon key) | Used in admin client components only. |
| Generated types | **`lib/supabase/types.ts`** | Generated from schema; keeps TS strictness end-to-end. |
| API routes | **Next.js Route Handlers (`app/api/*/route.ts`)** | Co-located with the app; no separate API server. |
| Input validation | **Zod** (`lib/validations/*`) | Required by global standards; every API route validates inputs. |

---

## Content Generation (AI)

| Layer | Choice | Why |
|---|---|---|
| LLM | **Anthropic Claude (`claude-opus-4-6`)** | Highest content quality for German-language SEO copy; structured JSON output mode. |
| Generator module | **`lib/anthropic/generator.ts`** | Encapsulates system prompt, Wissensfundus context assembly, target-group/focus injection, and JSON parse. |
| Output schemas | **`lib/anthropic/schemas.ts`** (Zod) | Validates Claude's JSON before persisting to `generierter_content`. |
| Persistence | **`generierter_content` table** (JSONB column) | Structured sections survive prompt evolution; manual edits coexist with generated structure. |

---

## Lead Flow & Communications

| Layer | Choice | Why |
|---|---|---|
| Lead CRM | **Atlassian Confluence REST API** | Sales team already lives in Confluence; each lead becomes a labeled page under a configured parent. |
| Confluence client | **`lib/confluence/client.ts`** | Reads credentials from `einstellungen` table first, falls back to `.env`. |
| Transactional email | **Resend** | Lead confirmation to prospect + notification to sales; modern API, easy DKIM. |
| Email module | **`lib/resend/mailer.ts`** | Templated emails; per-product overrides via `email_sequenzen` table. |
| Lead validation | **Zod** | Same validation surface as the rest of the app. |

---

## SEO / AEO Infrastructure

| Layer | Choice | Why |
|---|---|---|
| Per-page metadata | **Next.js `generateMetadata()`** | Dynamic per-product titles, descriptions, OpenGraph. |
| Sitemap | **`app/sitemap.ts`** | Auto-emitted from DB. |
| Robots | **`app/robots.ts`** | Explicitly allows AI crawlers (GPTBot, PerplexityBot, ClaudeBot, etc.). |
| LLM directive | **`llms.txt`** at site root | Describes the system and content scope for AI crawlers. |
| Structured data | **Schema.org JSON-LD** generated by `lib/seo/schema.ts` | Per page type: `FAQPage`, `Product`, `InsuranceAgency`, `Article`, `BreadcrumbList`, `HowTo`, `ItemList`. |
| Canonical URLs | **Set on every route via metadata** | Prevents duplicate-content penalties on alternate domains. |

---

## Auxiliary Services

| Layer | Choice | Why |
|---|---|---|
| Stock images | **Unsplash API** | Free commercial-use stock photography; no AI image generation. |
| Web scraping | **Cheerio** in `lib/scraper/` | Server-side HTML parsing; pulls reference content from competitor / source sites into Wissensfundus. Exposed as CLI script (`scripts/scrape-*.ts`) and admin UI (`app/admin/(protected)/scraper/`). |
| Encryption (settings) | **pgcrypto / Supabase Vault** for `einstellungen.wert` | Confluence API tokens stored encrypted at rest. |

---

## Testing & Quality

| Layer | Choice | Why |
|---|---|---|
| Unit / component tests | **Vitest** | Tests live next to components in `__tests__/` (e.g. `components/sections/__tests__/TarifRechner.test.tsx`). |
| TypeScript checking | **`tsc --noEmit`** | Strict mode enforced in CI. |
| Linting | **ESLint** (Next.js + TypeScript config) | Standard Next.js preset. |
| Pre-commit | Local hooks (no `--no-verify` bypasses) | Per global standards. |

---

## Deployment & Infrastructure

| Layer | Choice | Why |
|---|---|---|
| Hosting | **Vercel** | Native Next.js; ISR + Edge Functions; preview deployments per PR. |
| Database hosting | **Supabase Cloud** | Managed Postgres + Auth + Storage. |
| Domain & DNS | **Vercel Domains** (managed) + per-product custom domain (Phase 8) | Each product can later get its own domain via the `produkte.domain` column. |
| Secrets | **Vercel env vars** for build/runtime + **Supabase `einstellungen` table** for in-app rotatable secrets | API tokens (Confluence) can be rotated without redeploy. |
| Logs | **Vercel runtime logs** + **Supabase logs** | No third-party log aggregator yet. |

---

## Environment Variables

All managed in `.env.local` (local) and Vercel (production). See `CLAUDE.md` for the canonical list. Categories:

- **Anthropic:** `ANTHROPIC_API_KEY`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Resend:** `RESEND_API_KEY`
- **Confluence:** `CONFLUENCE_BASE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_API_TOKEN`, `CONFLUENCE_SPACE_KEY`, `CONFLUENCE_PARENT_PAGE_ID` (each overridable from the `einstellungen` DB table)
- **Unsplash:** `UNSPLASH_ACCESS_KEY`

`.env.example` is committed; real values never are.

---

## Conventions Cross-Reference

| Concern | Source of truth |
|---|---|
| Coding style | `agent-os/standards/global/coding-style.md` |
| Comments | `agent-os/standards/global/commenting.md` |
| Naming / file conventions | `agent-os/standards/global/conventions.md` |
| Error handling | `agent-os/standards/global/error-handling.md` |
| Validation | `agent-os/standards/global/validation.md` |
| Brand compliance | `agent-os/standards/global/brand-compliance.md` |
| Tech stack defaults | `agent-os/standards/global/tech-stack.md` |
| System spec | `CLAUDE.md` (root) |

---

## Out of Scope (Explicitly Not Used)

- **AI image generation** — Stock photos only (Unsplash); brand-illustrative SVGs in-house.
- **Headless CMS** (Sanity, Contentful, Strapi, etc.) — Replaced by `generierter_content` JSONB + admin Content Preview.
- **Third-party UI libraries** (MUI, Chakra, shadcn) — Custom primitives bound to design tokens.
- **External CSS-in-JS** (styled-components, Emotion) — Tailwind only.
- **Live tariff rate engines** — Pseudo-Tarifrechner with disclaimer; goal is conversion, not real quoting.
- **Multi-tenant infrastructure** — Single tenant (Finanzteam 26) until Phase 8 demand emerges.
