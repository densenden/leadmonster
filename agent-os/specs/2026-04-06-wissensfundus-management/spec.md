# Specification: Wissensfundus Management

## Goal
Provide admins with a full CRUD interface at `/admin/wissensfundus` to manage the knowledge base articles that feed the AI content-generation pipeline, stored in the `wissensfundus` Supabase table.

## User Stories
- As an admin, I want to create, edit, and delete knowledge articles grouped by insurance category so that the AI content engine has accurate, curated context for each product type.
- As an admin, I want to filter articles by category so that I can quickly review and maintain the knowledge base for a specific product type.

## Specific Requirements

**Article list page (`app/admin/wissensfundus/page.tsx`)**
- Server Component that fetches all `wissensfundus` rows from Supabase using the service-role client (`lib/supabase/server.ts`)
- Render articles in a sortable table: columns for `kategorie`, `thema`, truncated `inhalt` preview (~100 chars), `tags` (rendered as Badge chips), and action buttons (Edit, Delete)
- Category filter rendered as a tab bar or select above the table; filter state managed via URL search param `?kategorie=sterbegeld` so the page remains a Server Component
- Empty state message when no articles match the selected filter
- "Neuen Artikel anlegen" button linking to a create form (modal or `/admin/wissensfundus/neu`)

**Create / Edit form (`components/admin/WissensfundusForm.tsx`)**
- Client Component with controlled inputs for all four fields: `kategorie` (select), `thema` (text input), `inhalt` (textarea supporting Markdown), `tags` (comma-separated text input, split to `text[]` on submit)
- `kategorie` select options: `sterbegeld`, `pflege`, `leben`, `unfall`, `allgemein`
- Character count hint on `inhalt` textarea; no hard max, but helper text "Markdown wird unterstützt"
- `tags` field displays current value as comma-separated string; parsed to array before submission
- Inline field-level error messages driven by Zod validation results returned from the server action
- Submit and Cancel buttons; Cancel navigates back to the list

**Zod validation schema**
- `kategorie`: `z.enum(['sterbegeld', 'pflege', 'leben', 'unfall', 'allgemein'])`
- `thema`: `z.string().min(3).max(120)` — must be a short slug-style label
- `inhalt`: `z.string().min(20)` — meaningful content required
- `tags`: `z.array(z.string().min(1)).max(10)` — derived from splitting the comma-separated input, filtering empty strings
- Validated server-side first; client-side mirrors the same schema for immediate UX feedback

**Server Actions for CRUD**
- Use Next.js Server Actions (not a separate API route) defined in `app/admin/wissensfundus/actions.ts`
- `createArtikel(formData)` — inserts a new row; revalidates the list path via `revalidatePath`
- `updateArtikel(id, formData)` — updates an existing row by `id`; revalidates list and detail paths
- `deleteArtikel(id)` — deletes a row by `id`; revalidates list
- All actions use the Supabase service-role server client; never the anon client
- Return a typed result object `{ success: boolean, error?: string, fieldErrors?: Record<string, string[]> }` so the Client Component can display errors without a page reload

**Delete confirmation**
- Clicking Delete shows an inline confirmation prompt (no full modal required): "Artikel wirklich löschen?" with Confirm and Abbrechen buttons
- Confirmation state managed locally in the list row; no global state needed
- On confirm, calls `deleteArtikel(id)` server action; on error shows a toast/inline error message

**Admin-only access**
- The page lives under `app/admin/` which is already protected by the auth guard in `app/admin/layout.tsx`
- No additional auth logic needed inside the wissensfundus page or actions — the layout redirect handles unauthenticated access
- Server Actions must also verify the Supabase session server-side before executing any DB mutation to prevent direct POST attacks

**AI generation read-path (fetch by category)**
- In `lib/anthropic/generator.ts`, before calling Claude, query the `wissensfundus` table filtered by `kategorie = produkt.typ` plus `kategorie = 'allgemein'`
- Select only `thema` and `inhalt` columns (not `id` or `tags`) to keep context payloads lean
- Concatenate the results as a Markdown-formatted context block injected into the system prompt
- If the query returns no rows, log a warning and proceed without knowledge context rather than throwing

**TypeScript types**
- Define a `Wissensfundus` interface in `lib/supabase/types.ts` (or the generated Supabase types file) matching the DB schema: `id: string`, `kategorie: string`, `thema: string`, `inhalt: string`, `tags: string[]`
- Use this type throughout the list page, form component, and server actions — no `any` types

## Visual Design
No mockups provided for this feature. Follow the established admin UI patterns:
- Use Tailwind utility classes driven by design tokens from `design-tokens/tokens.json`
- Admin pages use a clean table layout with the Navy + Gold color system from `sterbegeld24plus-recreation/styles.css` as reference
- Badge chips for tags use a small, rounded pill style consistent with other admin list views
- Form inputs styled with `border`, `rounded-lg`, `focus:ring` utilities matching the project design language

## Existing Code to Leverage

**`lib/supabase/server.ts` — Supabase service-role client**
- Already planned as the server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY`
- Import and use in all server actions and the list page fetch — do not use the browser client for admin mutations

**`app/admin/layout.tsx` — Auth guard**
- Already enforces Supabase Auth session check and redirects unauthenticated users to `/admin/login`
- No additional auth wiring needed inside the wissensfundus page; rely on the layout's guard entirely

**`components/admin/LeadTable.tsx` — Admin table pattern**
- Planned component that establishes the table + row + action-button pattern for admin list views
- Replicate the same column/row/badge structure for the wissensfundus list rather than introducing a new pattern

**`components/ui/Badge.tsx` — Tag chip rendering**
- Planned atomic component for rendering label chips
- Use for rendering `tags` arrays as visual pills in both the list table and the article detail/edit view

**`design-tokens/tokens.json` — Design token source**
- Existing file; all color, spacing, and typography decisions must reference these tokens via Tailwind config extension, not hardcoded values

## Out of Scope
- Public-facing display of knowledge base articles (articles are internal AI context only)
- Full Markdown preview / WYSIWYG editor — plain textarea with helper text is sufficient
- Bulk import or export of articles (CSV upload, etc.)
- Search/full-text search within article content — category filter only
- Version history or audit log for article edits
- Role-based access levels beyond "authenticated admin vs. unauthenticated"
- Pagination on the list page — total article count is expected to remain small (<200 rows)
- Tagging taxonomy management (no separate tag management UI)
- AI-assisted article generation from within the wissensfundus UI
