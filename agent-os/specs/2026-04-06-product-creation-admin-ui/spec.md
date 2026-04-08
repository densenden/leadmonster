# Specification: Product Creation & Configuration Admin UI

## Goal
Give sales staff an admin UI to create and manage insurance products. Product data is stored across two tables: `produkte` (identity) and `produkt_config` (sales configuration). The UI handles the full lifecycle: create, edit, and view products with their current status.

## User Stories
- As a sales admin, I want to create a new insurance product with all configuration in a single form so that content generation can start immediately.
- As a sales admin, I want to edit an existing product's configuration so that I can update insurer lists and sales focus without technical help.
- As a sales admin, I want to see all products and their statuses on a list page so that I can manage the entire product portfolio at a glance.

## Specific Requirements

**Product list page `app/admin/produkte/page.tsx`**
- Server Component, fetches all rows from `produkte` table via service role client
- Table columns: Name, Typ, Status badge (entwurf=gray / aktiv=green / archiviert=red), created_at (formatted DD.MM.YYYY), action links
- Two action links per row: "Bearbeiten" → `/admin/produkte/[id]`, "Content" → `/admin/produkte/[id]/content`
- "Neues Produkt" button in the page header links to `/admin/produkte/neu`
- Empty state: "Noch keine Produkte angelegt. Erstellen Sie Ihr erstes Produkt."
- Auth guard inherited from `app/admin/layout.tsx`

**New product page `app/admin/produkte/neu/page.tsx`**
- Server Component that renders `ProduktForm` in create mode with empty initial values
- On successful save: redirect to `/admin/produkte/[newId]`

**Edit product page `app/admin/produkte/[id]/page.tsx`**
- Server Component that fetches existing `produkte` row + `produkt_config` row by product id
- Calls `notFound()` if no product found for the given id
- Passes loaded data to `ProduktForm` in edit mode

**Shared form component `components/admin/ProduktForm.tsx`**
- Client Component (`'use client'`)
- Props: `mode: 'create' | 'edit'`, `initialData?: ProduktWithConfig`
- Fields:
  - **Produktname** (text input, required) — maps to `produkte.name`
  - **URL-Slug** (text input, required) — auto-generated from name via `slugify` (lowercase, hyphens), editable, unique; validated on blur
  - **Produkttyp** (select, required) — options: `sterbegeld` / `pflege` / `leben` / `unfall`; German labels: "Sterbegeldversicherung", "Pflegeversicherung", "Lebensversicherung", "Unfallversicherung"
  - **Zielgruppe** (multi-select checkboxes) — options: `senioren_50plus` / `familien` / `alleinstehende` / `paare` / `berufstaetige`; German labels
  - **Vertriebsfokus** (radio group, required) — options: `sicherheit` / `preis` / `sofortschutz`; German labels: "Sicherheit & Verlässlichkeit", "Bester Preis", "Sofortschutz"
  - **Anbieter** (dynamic tag input) — user types insurer name and presses Enter to add to list; × button to remove; stored as `text[]`
  - **Verkaufsargumente** (key-value editor) — add/remove rows of `{ key: string, value: string }` pairs; serialised to JSONB on submit
  - **Status** (select, edit mode only) — options: `entwurf` / `aktiv` / `archiviert`; German labels
- Submit button label: "Produkt speichern" (create) / "Änderungen speichern" (edit)
- Inline field-level error messages in German on validation failure
- Disabled + loading state on submit button while request is in flight

**Slug auto-generation**
- When the user types in the name field and the slug field is still untouched (pristine), auto-populate slug using: `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`
- Once the user manually edits the slug field, disable auto-population
- Slug field shows a preview: `/{slug}` in muted text below the input

**API route `app/api/admin/produkte/route.ts`**
- **POST** (create): validate body with Zod, check slug uniqueness in `produkte` table (return 409 with `{ error: { code: 'SLUG_EXISTS' } }` if duplicate), insert into `produkte`, then insert into `produkt_config` using the new `produkt.id`; return `201` with `{ data: { id } }`
- **PATCH** (update): validate body with Zod including `id` field, update `produkte` row, upsert `produkt_config` row by `produkt_id`; return `200` with `{ data: { id } }`
- Protected: verify Supabase Auth session from cookie before any DB access; return `401` if no session
- Service role client only — never anon client
- Never return raw Supabase error messages to the client; map to safe error envelopes

**Zod validation schema**
```ts
z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  typ: z.enum(['sterbegeld', 'pflege', 'leben', 'unfall']),
  status: z.enum(['entwurf', 'aktiv', 'archiviert']).optional(),
  zielgruppe: z.array(z.string()).optional(),
  fokus: z.enum(['sicherheit', 'preis', 'sofortschutz']).optional(),
  anbieter: z.array(z.string().min(1)).optional(),
  argumente: z.record(z.string()).optional(),
})
```

**Data write strategy**
- `produkte` inserted first (generates UUID via `gen_random_uuid()`)
- `produkt_config` inserted second with `produkt_id = produkte.id`
- `produkt_config.argumente` stored as JSONB derived from the key-value pairs
- `produkt_config.zielgruppe` stored as `text[]`
- `produkt_config.anbieter` stored as `text[]`
- On update: `produkte` updated first, then `produkt_config` upserted (insert or update) on `produkt_id` conflict

**Status badge component**
- Use `components/ui/Badge.tsx` with `variant` prop: `entwurf=neutral`, `aktiv=success`, `archiviert=danger`

## Visual Design

Design follows the admin patterns established in other admin specs:
- **Colors**: Brand Blue `#abd5f4` for focus rings and primary button; Navy `#1a365d` for admin sidebar and table header backgrounds (from `sterbegeld24plus-recreation/styles.css` palette)
- **Border radius**: `0px` (from `design-tokens/tokens.json` `borders.radius`) — no rounded corners on inputs
- **Typography**: Nunito Sans body (weight 300/400), Roboto headings — loaded via `next/font/google` in root layout
- **Form layout**: single-column on mobile, max-width `2xl` container on desktop
- **Tailwind only**: no custom CSS files; all tokens mapped via `tailwind.config.ts` extension

## Existing Code to Leverage

**`lib/supabase/server.ts`** — service role client for all DB reads/writes in the page Server Components and API route

**`lib/supabase/types.ts`** — Supabase-generated types; define `ProduktWithConfig` as a combined type for the edit form initial data

**`app/admin/layout.tsx`** — auth guard already protects all `/admin` routes; no additional session check needed in page components (API route still checks independently)

**`design-tokens/tokens.json`** — source of truth for colors, spacing, typography; reference via Tailwind config extension classes, not hardcoded values

**`components/ui/Badge.tsx`** — planned atomic badge component; use for status display in the product list table

## Out of Scope
- Content generation triggering (covered in `ai-content-generation-engine` spec)
- Product deletion (not part of Phase 1)
- Lead management
- Public-facing product pages
- Image or file uploads for products
- Bulk operations (bulk status change, bulk delete)
- Product duplication / clone feature
- Full audit log of product edits
- Supabase Auth setup (covered in `admin-authentication` spec)
