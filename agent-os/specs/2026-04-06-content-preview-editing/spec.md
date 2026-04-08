# Specification: Content Preview & Manual Editing

## Goal
Give admin editors a visual preview of all AI-generated content sections for a product alongside editable fields, so they can refine copy and advance content through the editorial workflow (entwurf → review → publiziert) before going live.

## User Stories
- As an admin editor, I want to preview all generated content sections for a product so that I can assess quality before publishing.
- As an admin editor, I want to edit any section text inline and save changes so that I can refine AI-generated copy without re-running generation.
- As an admin editor, I want to advance content status from draft to review to published so that I can control the publishing workflow.
- As an admin editor, I want to regenerate a single page type without affecting others so that I can refresh stale or poor-quality content selectively.

## Specific Requirements

**Content management page `app/admin/produkte/[id]/content/page.tsx`**
- Server Component — fetches all `generierter_content` rows for the given `produkt_id` via service-role client
- If no content exists yet: show "Noch kein Content generiert" message with a "Content generieren" button that calls `/api/generate`
- Organises content by `page_type` using tabs or an accordion: `hauptseite`, `faq`, `vergleich`, `tarif`, `ratgeber` (multiple rows possible for ratgeber)
- Each tab/section shows: current status badge, `generated_at` timestamp, `published_at` timestamp (if set), and the editor panel

**Content editor panel `components/admin/ContentPreview.tsx`**
- Client Component
- Left column: visual preview — renders the section JSON into a styled read-only preview (Hero, FeatureGrid, FAQ list, etc.) matching the public page layout
- Right column: editable fields
  - `title` (text input)
  - `meta_title` (text input, max 60 chars) with live character counter — turns red when over limit
  - `meta_desc` (textarea, max 160 chars) with live character counter — turns red when over limit
  - Per-section editors: for each item in `content.sections`, render appropriate text inputs (e.g. headline + subline for hero, question + answer for each FAQ item)
- "Speichern" button — sends PATCH to `/api/admin/content/[id]` with the updated fields
- Unsaved changes indicator (dirty state)

**Status toggle**
- Status pill button displayed prominently per content row
- Transitions: `entwurf` → `review` → `publiziert` (forward only via button click, back allowed via dropdown)
- When advancing to `publiziert`: sets `published_at = now()` in the DB
- Status change is a separate PATCH call from the content edit save — they do not need to be combined
- Visual: entwurf=gray, review=yellow, publiziert=green badge

**"Regenerieren" button**
- One per page_type — calls POST `/api/generate` with `{ produktId, pageType }` to regenerate only that page
- Shows loading spinner during generation (can take 5–15s)
- On completion: refreshes the content panel with new data
- Displays a warning: "Nicht gespeicherte Änderungen gehen verloren" before regenerating if dirty state is active

**API route `app/api/admin/content/[id]/route.ts`**
- PATCH — validates request body with Zod, updates `generierter_content` row by id
- Updatable fields: `title`, `meta_title`, `meta_desc`, `content` (full JSONB), `status`, `published_at`
- `meta_title` length enforced server-side: max 60 chars
- `meta_desc` length enforced server-side: max 160 chars
- Service role Supabase client only
- Returns updated row on success

**Zod validation**
```ts
z.object({
  title: z.string().min(1).optional(),
  meta_title: z.string().max(60).optional(),
  meta_desc: z.string().max(160).optional(),
  content: z.record(z.unknown()).optional(),
  status: z.enum(['entwurf', 'review', 'publiziert']).optional(),
  published_at: z.string().datetime().nullable().optional(),
})
```

**Character counters**
- `meta_title`: shows "X / 60 Zeichen" — red text + red border when X > 60
- `meta_desc`: shows "X / 160 Zeichen" — red text + red border when X > 160
- Implemented as controlled inputs in the Client Component

**Timestamps display**
- `generated_at`: "Generiert am: {date}" in small muted text
- `published_at`: "Veröffentlicht am: {date}" or "Noch nicht veröffentlicht"
- Date format: German locale `DD.MM.YYYY HH:mm`

## Visual Design
- Admin layout consistent with other admin pages (Tailwind + design tokens)
- Two-column layout on desktop (preview left, editor right); stacked on mobile
- Status badges use color-coded pill components consistent with product list
- Character counter color transitions: gray → orange (>80% limit) → red (>100%)

## Existing Code to Leverage

**`app/admin/layout.tsx`** — auth guard already in place

**`lib/supabase/server.ts`** — service role client for all DB reads/writes

**`/api/generate` route** — existing generation endpoint; content page calls it with optional `pageType` param for selective regeneration

**`components/sections/`** — Hero, FAQ, FeatureGrid etc. used in the preview column to render content JSON visually (same components as public pages, read-only mode)

**`design-tokens/tokens.json`** — color and typography tokens

## Out of Scope
- WYSIWYG rich-text editing — plain text inputs only
- Image upload or replacement within content sections
- Side-by-side diff view of original vs. edited content
- Multi-user collaborative editing or locking
- Content version history or rollback
- Bulk status changes across multiple products
- Public page preview in an iframe (preview is within the admin UI only)
- Scheduled publishing (published_at is always set to now() on status change)
