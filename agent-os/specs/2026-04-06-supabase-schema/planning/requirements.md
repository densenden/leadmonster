# Spec Requirements: Supabase Schema

## Initial Description

Set up the complete Supabase PostgreSQL schema for LeadMonster. This covers all 7 tables defined in CLAUDE.md, RLS policies, performance indexes, migration file structure via the Supabase CLI, and the bootstrapping of `lib/supabase/` (browser client, server/service-role client, and generated TypeScript types).

---

## Requirements Discussion

### First Round Questions

**Q1:** Should all tables be fully private with no public RLS selects, or do any tables (e.g. `generierter_content` for published pages) need public read access?
**Answer:** All tables fully private — accessed only via service role server-side. No public RLS selects.

**Q2:** Should this spec include bootstrapping the `lib/supabase/` folder (client.ts, server.ts, types.ts) alongside the schema, or is that a separate spec?
**Answer:** Yes, this spec SHOULD include bootstrapping the `lib/supabase/` folder structure (client.ts, server.ts, types.ts) along with the schema and the `supabase gen types` command.

**Q3:** What migration approach should we use — Supabase CLI migration files, the Supabase dashboard, or a schema.sql dump?
**Answer:** Supabase CLI migration files (`supabase/migrations/*.sql`) committed to version control.

**Q4:** The `einstellungen` table stores sensitive credentials (Confluence API token) in a `wert` column described as "verschlüsselt gespeichert." Should encryption (AES via pgcrypto) be implemented now, or deferred?
**Answer:** Plain text for now with a clear TODO comment — encryption (AES/pgcrypto) deferred to a later phase.

**Q5:** Which performance indexes should be created in this spec?
**Answer:** Implement ALL proposed indexes: `produkte(slug)`, `generierter_content(produkt_id, page_type)`, `generierter_content(status)`, `leads(produkt_id)`, `leads(created_at DESC)`, `wissensfundus(kategorie)`.

**Q6:** Should `produkt_config` and `email_sequenzen` have `created_at` / `updated_at` timestamps added for consistency with the rest of the schema?
**Answer:** Yes (assumed from no objection) — add `created_at` and `updated_at` to both tables for consistency.

**Q7:** Should seed data (e.g. a default `sterbegeld24plus` product row) be included in this spec?
**Answer:** Out of scope for this spec.

**Q8:** Is there any existing Supabase setup in the codebase we should build on top of?
**Answer:** No existing Supabase setup — this is greenfield.

---

### Existing Code to Reference

No similar existing features identified for reference. This is a greenfield Supabase setup.

---

### Follow-up Questions

None required. All answers were clear and complete.

---

## Visual Assets

No visual assets provided. Visual check performed — no files found in `planning/visuals/`.

---

## Requirements Summary

### Functional Requirements

- Create all 7 database tables in a single Supabase CLI migration file: `produkte`, `produkt_config`, `wissensfundus`, `generierter_content`, `leads`, `einstellungen`, `email_sequenzen`.
- All tables must have UUID primary keys using `gen_random_uuid()`.
- All foreign keys referencing `produkte(id)` must use `ON DELETE CASCADE` where data is owned by the product (config, content, sequences) and no cascade where leads should be retained independently.
- All 7 tables must have RLS enabled with a blanket deny-all policy for public access. All data access happens server-side via the service role key, which bypasses RLS entirely.
- Create 6 performance indexes as specified.
- Bootstrap `lib/supabase/` with three files: browser client, server/service-role client, and a types file referencing the generated types output.
- Document the `supabase gen types typescript` command for regenerating `types.ts` after schema changes.
- The `einstellungen.wert` column stores plain text for now. A TODO comment must be added in both the migration SQL and in `lib/supabase/server.ts` noting that AES encryption via pgcrypto should be added in a future phase before production use.
- Add `created_at` and `updated_at` timestamps to `produkt_config` and `email_sequenzen` to match the convention established in `produkte` and `einstellungen`.

### Table Definitions (Final, Including Amendments)

**`produkte`**
```sql
id          uuid primary key default gen_random_uuid()
slug        text unique not null          -- e.g. "sterbegeld24plus"
name        text not null                 -- e.g. "Sterbegeld24Plus"
typ         text not null                 -- sterbegeld | pflege | leben | unfall
status      text default 'entwurf'        -- entwurf | aktiv | archiviert
domain      text                          -- optional: custom domain for later
created_at  timestamp with time zone default now()
updated_at  timestamp with time zone default now()
```

**`produkt_config`** (amended: added `created_at`, `updated_at`)
```sql
id          uuid primary key default gen_random_uuid()
produkt_id  uuid references produkte(id) on delete cascade
zielgruppe  text[]                         -- ["senioren_50plus", "familien"]
fokus       text                           -- sicherheit | preis | sofortschutz
anbieter    text[]                         -- list of insurers
argumente   jsonb                          -- key selling points as JSON
created_at  timestamp with time zone default now()
updated_at  timestamp with time zone default now()
```

**`wissensfundus`**
```sql
id          uuid primary key default gen_random_uuid()
kategorie   text not null                  -- product type as category
thema       text not null                  -- e.g. "was_ist_sterbegeld"
inhalt      text not null                  -- expert content, Markdown
tags        text[]
created_at  timestamp with time zone default now()
updated_at  timestamp with time zone default now()
```
Note: `wissensfundus` does not appear in CLAUDE.md with timestamps, but consistency requires adding them. The spec writer should add these.

**`generierter_content`**
```sql
id            uuid primary key default gen_random_uuid()
produkt_id    uuid references produkte(id) on delete cascade
page_type     text not null                  -- hauptseite | faq | vergleich | ratgeber | tarif
slug          text                           -- URL segment
title         text
meta_title    text                           -- SEO max 60 chars
meta_desc     text                           -- SEO max 160 chars
content       jsonb                          -- structured content (sections)
schema_markup jsonb                          -- Schema.org JSON-LD
status        text default 'entwurf'         -- entwurf | review | publiziert
generated_at  timestamp with time zone default now()
published_at  timestamp with time zone
```
Note: This table uses `generated_at` instead of `created_at` — keep as-is per CLAUDE.md.

**`leads`**
```sql
id                 uuid primary key default gen_random_uuid()
produkt_id         uuid references produkte(id)   -- intentionally no cascade: leads are retained
vorname            text
nachname           text
email              text not null
telefon            text
interesse          text                     -- free text or selection
zielgruppe_tag     text                     -- from product config
intent_tag         text                     -- sicherheit | preis | sofortschutz
confluence_page_id text                     -- ID of created Confluence page
confluence_synced  boolean default false
resend_sent        boolean default false
created_at         timestamp with time zone default now()
```

**`einstellungen`**
```sql
id           uuid primary key default gen_random_uuid()
schluessel   text unique not null               -- e.g. "confluence_base_url"
wert         text                               -- plain text for now
                                                -- TODO: encrypt with AES/pgcrypto before production
beschreibung text
updated_at   timestamp with time zone default now()
updated_by   uuid references auth.users(id)
```
Credentials stored here override `.env` fallbacks. Reading logic belongs in `lib/confluence/client.ts` (not in scope for this spec, noted for reference).

**`email_sequenzen`** (amended: added `created_at`, `updated_at`)
```sql
id           uuid primary key default gen_random_uuid()
produkt_id   uuid references produkte(id)
trigger      text                           -- form_submit | manual
betreff      text
html_body    text
delay_hours  integer default 0
aktiv        boolean default true
created_at   timestamp with time zone default now()
updated_at   timestamp with time zone default now()
```

### RLS Strategy

- RLS must be **enabled** on every table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- No permissive public-read policies are created on any table.
- All application data access is server-side using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. This is the only access pattern for this system.
- The `auth.users` reference in `einstellungen.updated_by` is for audit-trail use via the admin session — this is an authenticated reference, not public access.

### Index Strategy

All 6 indexes to be created in the migration file:

| Index | Rationale |
|---|---|
| `produkte(slug)` | Slug lookups on every page render |
| `generierter_content(produkt_id, page_type)` | Content lookup per product and page type |
| `generierter_content(status)` | Admin dashboard filtering published vs. draft |
| `leads(produkt_id)` | Lead table filtered by product in admin view |
| `leads(created_at DESC)` | Chronological lead listing (most recent first) |
| `wissensfundus(kategorie)` | Claude content generation filters by category |

### `lib/supabase/` Bootstrap

Three files to be created:

**`lib/supabase/client.ts`** — browser client (uses `NEXT_PUBLIC_*` keys, suitable for Client Components)
**`lib/supabase/server.ts`** — server client using service role key (for API routes, Server Components, server actions)
**`lib/supabase/types.ts`** — re-exports the auto-generated Supabase types; regenerated via:
```bash
npx supabase gen types typescript --project-id dwlopmxtiokdvjjowfke > lib/supabase/types.ts
```

Both clients must be typed against the generated `Database` type from `types.ts`. TypeScript strict mode is required per `CLAUDE.md` coding rules.

### Encryption Decision

`einstellungen.wert` is stored as plain text in this phase. A `TODO` comment must appear:
- In the migration SQL above the column definition.
- In `lib/supabase/server.ts` in any helper that reads/writes `einstellungen.wert`.

The TODO should read: `// TODO: Encrypt wert column using AES/pgcrypto (Supabase Vault) before production deployment.`

### Migration File Approach

- One migration file: `supabase/migrations/<timestamp>_initial_schema.sql`
- File contains: all `CREATE TABLE` statements, all `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statements, all `CREATE INDEX` statements, and any `CREATE TRIGGER` needed for `updated_at` auto-update if desired.
- Migration is committed to version control.
- The `supabase/` folder should also include `supabase/config.toml` (generated by CLI init) — the spec writer should note this but not specify its contents in detail.

### Reusability Opportunities

No existing components, backend patterns, or similar features to model after. This is a greenfield implementation.

### Scope Boundaries

**In Scope:**
- `supabase/migrations/<timestamp>_initial_schema.sql` with all 7 tables, RLS, and indexes
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server/service-role Supabase client
- `lib/supabase/types.ts` — generated types file and documentation of the `supabase gen types` command
- TODO comments for deferred encryption on `einstellungen.wert`
- Timestamp columns added to `produkt_config` and `email_sequenzen`

**Out of Scope:**
- Seed data for any table (deferred to pilot-product spec)
- Encryption implementation for `einstellungen.wert` (deferred to a security hardening phase)
- Next.js project setup beyond the `lib/supabase/` folder (separate Phase 1 spec)
- Auth setup and admin route protection (separate spec)
- `lib/confluence/client.ts` read-logic for `einstellungen` (separate spec)
- Any other `lib/` folders (`anthropic/`, `resend/`, `seo/`)
- Schema changes for future product types beyond the 4 defined (`sterbegeld | pflege | leben | unfall`)

### Technical Considerations

- Use `timestamp with time zone` (not bare `timestamp`) for all timestamp columns — this is PostgreSQL best practice and ensures correct behaviour across timezones.
- The `content` and `schema_markup` columns in `generierter_content` and `argumente` in `produkt_config` are `jsonb` — queries against these fields (e.g. by Claude content generator) will use GIN indexes in the future if needed; no GIN indexes are in scope now.
- `supabase gen types` requires the Supabase CLI to be installed and the project linked. The migration file approach means the CLI must be set up locally with `supabase link --project-ref dwlopmxtiokdvjjowfke`.
- The project Supabase URL is `https://dwlopmxtiokdvjjowfke.supabase.co` (from CLAUDE.md). Credentials are in `.env.local`, never committed.
- TypeScript strict mode is required. Both Supabase client files must import and use the `Database` generic type from `types.ts`.
- Per `CLAUDE.md` coding rules: all code in English, user-facing text in German. Comments in migration SQL may be in German for domain clarity (matching CLAUDE.md conventions).
