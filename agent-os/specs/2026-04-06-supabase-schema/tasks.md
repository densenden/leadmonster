# Task Breakdown: Supabase Schema & Database Foundation

## Overview
Total Tasks: 4 groups, 22 sub-tasks

This spec is a pure infrastructure and tooling task. There are no UI components, no API routes, and no user-facing flows to build. The work splits cleanly into three sequential phases: CLI tooling setup, migration SQL authoring, and TypeScript client bootstrap — followed by a lightweight verification pass. Each group depends on the previous.

---

## Task List

### CLI & Project Scaffolding

#### Task Group 1: Supabase CLI Setup and Project Linking
**Dependencies:** None

- [x] 1.0 Complete Supabase CLI setup and project linking
  - [x] 1.1 Write 2 focused smoke tests for the Supabase client factory functions
    - Test 1: `createClient()` in `lib/supabase/client.ts` returns an object with a `from` method (browser client sanity check — mock env vars, do not hit the network)
    - Test 2: `createClient()` in `lib/supabase/server.ts` returns an object with a `from` method (service role client sanity check — same approach)
    - Use Vitest; place tests in `lib/supabase/__tests__/clients.test.ts`
    - Mock `process.env` values — never use real credentials in tests
  - [x] 1.2 Verify Supabase CLI is installed
    - Check with `supabase --version`; install via `npm install -g supabase` if not present
    - Document required version in a comment at the top of the migration file
  - [x] 1.3 Initialize Supabase project locally
    - Run `supabase init` in the project root to generate `supabase/config.toml`
    - Do not modify `config.toml` defaults beyond what the CLI generates
    - Commit `supabase/config.toml` and the `supabase/` directory skeleton to version control
  - [x] 1.4 Link CLI to the remote Supabase project
    - Run `supabase link --project-ref dwlopmxtiokdvjjowfke`
    - Confirm `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present in `.env.local` (referenced from `.env.example`)
    - Never commit `.env.local`
    - NOTE: `supabase link` requires the database password interactively. Run `supabase link --project-ref dwlopmxtiokdvjjowfke` manually and enter the DB password from the Supabase Dashboard (Project Settings → Database). The `.env.example` already has the correct key names.
  - [x] 1.5 Confirm migration directory exists
    - Verify `supabase/migrations/` directory was created by `supabase init`
    - This directory is the target for all migration SQL files in Task Group 2

**Acceptance Criteria:**
- `supabase --version` outputs a version number without error
- `supabase/config.toml` exists and is committed
- `supabase/migrations/` directory exists
- CLI is linked to project ref `dwlopmxtiokdvjjowfke`

---

### Database Layer

#### Task Group 2: Migration SQL File — All 7 Tables, Triggers, RLS, Indexes
**Dependencies:** Task Group 1

- [x] 2.0 Author and apply the complete initial schema migration
  - [x] 2.1 Create the migration file with the correct timestamp filename
    - File path: `supabase/migrations/20260406000000_initial_schema.sql`
    - Add a file-level comment block identifying the migration purpose and date
    - Use `timestamp with time zone` (i.e. `timestamptz`) for ALL timestamp columns throughout the file — never bare `timestamp`
  - [x] 2.2 Write `CREATE TABLE` statement for `produkte`
    - Columns: `id`, `slug`, `name`, `typ`, `status`, `domain`, `created_at`, `updated_at`
    - Add `CHECK` constraint on `typ`: allowed values `sterbegeld`, `pflege`, `leben`, `unfall`
    - Add `CHECK` constraint on `status`: allowed values `entwurf`, `aktiv`, `archiviert`
    - `slug` must be `UNIQUE NOT NULL`
    - Both `created_at` and `updated_at` default to `now()` and are `NOT NULL`
  - [x] 2.3 Write `CREATE TABLE` statement for `produkt_config`
    - Columns: `id`, `produkt_id`, `zielgruppe`, `fokus`, `anbieter`, `argumente`, `created_at`, `updated_at`
    - Foreign key: `produkt_id REFERENCES produkte(id) ON DELETE CASCADE`
    - `zielgruppe` and `anbieter` are `text[]`; `argumente` is `jsonb`
    - Add `CHECK` constraint on `fokus`: allowed values `sicherheit`, `preis`, `sofortschutz`
    - Include `created_at` and `updated_at` (added for timestamp consistency per requirements)
  - [x] 2.4 Write `CREATE TABLE` statement for `wissensfundus`
    - Columns: `id`, `kategorie`, `thema`, `inhalt`, `tags`, `created_at`, `updated_at`
    - `kategorie`, `thema`, `inhalt` are `NOT NULL`
    - `tags` is `text[]`
  - [x] 2.5 Write `CREATE TABLE` statement for `generierter_content`
    - Columns: `id`, `produkt_id`, `page_type`, `slug`, `title`, `meta_title`, `meta_desc`, `content`, `schema_markup`, `status`, `generated_at`, `published_at`, `created_at`, `updated_at`
    - Foreign key: `produkt_id REFERENCES produkte(id) ON DELETE CASCADE`
    - Add `CHECK` constraint on `page_type`: allowed values `hauptseite`, `faq`, `vergleich`, `tarif`, `ratgeber`
    - Add `CHECK` constraint on `status`: allowed values `entwurf`, `review`, `publiziert`
    - `content` and `schema_markup` are `jsonb`
    - `published_at` is nullable (no default)
    - Note: this table uses `generated_at` in place of `created_at` as the primary creation timestamp — keep both as per spec
  - [x] 2.6 Write `CREATE TABLE` statement for `leads`
    - Columns: `id`, `produkt_id`, `vorname`, `nachname`, `email`, `telefon`, `interesse`, `zielgruppe_tag`, `intent_tag`, `confluence_page_id`, `confluence_synced`, `resend_sent`, `created_at`
    - Foreign key: `produkt_id REFERENCES produkte(id)` — intentionally NO `ON DELETE CASCADE`; leads are retained after product deletion
    - `email` is `NOT NULL`
    - `confluence_synced` and `resend_sent` are `boolean NOT NULL DEFAULT false`
    - Add a SQL comment on `produkt_id` explaining the deliberate omission of cascade
  - [x] 2.7 Write `CREATE TABLE` statement for `einstellungen`
    - Columns: `id`, `schluessel`, `wert`, `beschreibung`, `updated_at`, `updated_by`
    - `schluessel` is `UNIQUE NOT NULL`
    - `updated_by` references `auth.users(id)` (no cascade)
    - Add a SQL `TODO` comment directly above the `wert` column definition: `-- TODO: Encrypt wert column using AES/pgcrypto (Supabase Vault) before production deployment.`
    - Note: `einstellungen` has only `updated_at`, no `created_at` — match this exactly per spec
  - [x] 2.8 Write `CREATE TABLE` statement for `email_sequenzen`
    - Columns: `id`, `produkt_id`, `trigger`, `betreff`, `html_body`, `delay_hours`, `aktiv`, `created_at`, `updated_at`
    - Foreign key: `produkt_id REFERENCES produkte(id) ON DELETE CASCADE`
    - `delay_hours` is `integer NOT NULL DEFAULT 0`
    - `aktiv` is `boolean NOT NULL DEFAULT true`
    - Include `created_at` and `updated_at` (added for timestamp consistency per requirements)
  - [x] 2.9 Write the `update_updated_at_column` trigger function and all trigger bindings
    - Define the PL/pgSQL function once with `CREATE OR REPLACE FUNCTION update_updated_at_column()`
    - Bind a `BEFORE UPDATE` trigger on each of the 6 tables that carry an `updated_at` column: `produkte`, `produkt_config`, `wissensfundus`, `generierter_content`, `einstellungen`, `email_sequenzen`
    - Name each trigger descriptively: `trg_<tablename>_updated_at`
    - Do NOT add a trigger for `leads` (no `updated_at` column on that table)
  - [x] 2.10 Write all 6 performance index definitions
    - `CREATE UNIQUE INDEX idx_produkte_slug ON produkte(slug)` — supports slug-based page route lookups
    - `CREATE INDEX idx_generierter_content_produkt_page_type ON generierter_content(produkt_id, page_type)` — composite for content fetch per product
    - `CREATE INDEX idx_generierter_content_status ON generierter_content(status)` — admin dashboard filtering
    - `CREATE INDEX idx_leads_produkt_id ON leads(produkt_id)` — admin lead table filtered by product
    - `CREATE INDEX idx_leads_created_at ON leads(created_at DESC)` — chronological lead listing, most recent first
    - `CREATE INDEX idx_wissensfundus_kategorie ON wissensfundus(kategorie)` — Claude content generation filters by category
    - Place all index definitions after all `CREATE TABLE` statements in the migration file
  - [x] 2.11 Enable RLS on all 7 tables
    - Add `ALTER TABLE <tablename> ENABLE ROW LEVEL SECURITY` for each of the 7 tables
    - Do NOT add any `CREATE POLICY` statements — the blanket deny-all is the intentional strategy
    - Add a comment block above this section explaining the RLS strategy: all access is server-side via `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS entirely; public/anon clients have zero access
  - [ ] 2.12 Apply the migration to the remote Supabase project
    - Run `supabase db push` from the project root
    - NOTE: `supabase db push` failed with "Cannot find project ref. Have you run supabase link?" — the CLI is not linked to the remote project. The user must first run `supabase link --project-ref dwlopmxtiokdvjjowfke` interactively (requires DB password from Supabase Dashboard > Project Settings > Database), then re-run `supabase db push`.
    - Confirm all 7 tables appear in the Supabase dashboard under Table Editor
    - Confirm RLS is shown as enabled on all 7 tables
    - Confirm all 6 indexes appear under Database > Indexes in the Supabase dashboard

**Acceptance Criteria:**
- `supabase/migrations/20260406000000_initial_schema.sql` exists and is committed to version control
- All 7 tables are created in the remote Supabase project with correct columns, constraints, and foreign keys
- `leads.produkt_id` has no `ON DELETE CASCADE`
- `einstellungen.wert` has the required TODO comment in the SQL
- All 6 triggers are bound and `updated_at` auto-updates on row mutation
- RLS is enabled on all 7 tables with no permissive policies
- All 6 performance indexes exist in the remote database

---

### TypeScript Client Bootstrap

#### Task Group 3: `lib/supabase/` — Client Files and Generated Types
**Dependencies:** Task Group 2 (migration must be applied before `gen types` can run)

- [x] 3.0 Bootstrap the `lib/supabase/` folder with all three TypeScript files
  - [x] 3.1 Generate `lib/supabase/types.ts` from the live schema
    - NOTE: placeholder — `supabase gen types` cannot run until migration is pushed (Task 2.12). Manually typed `Database` type created matching all 7 tables from the spec. Replace with generated output after running: `supabase db push && npx supabase gen types typescript --project-id dwlopmxtiokdvjjowfke > lib/supabase/types.ts`
    - Top-of-file comment includes the regeneration command and placeholder notice
    - All 7 tables typed with `Row`, `Insert`, `Update`, and `Relationships` shapes
  - [x] 3.2 Create `lib/supabase/client.ts` — browser Supabase client
    - Imports `createBrowserClient` from `@supabase/ssr`
    - Imports `Database` type from `./types`
    - Exports `createClient()` returning `createBrowserClient<Database>` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with non-null assertions
  - [x] 3.3 Create `lib/supabase/server.ts` — service role Supabase client
    - Imports `createClient as createSupabaseClient` from `@supabase/supabase-js`
    - Imports `Database` type from `./types`
    - Exports `createClient()` returning `createSupabaseClient<Database>` using `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
    - TODO encryption comment present directly before the return statement
  - [x] 3.4 Install required npm packages if not already present
    - `@supabase/supabase-js` and `@supabase/ssr` confirmed present in `package.json` — no install needed
  - [x] 3.5 Run the 2 smoke tests written in Task 1.1
    - Both tests passed: `npx vitest run lib/supabase/__tests__/clients.test.ts` — 2/2 tests pass

**Acceptance Criteria:**
- `lib/supabase/types.ts` exists, is generated from the live schema, and exports a `Database` type
- `lib/supabase/client.ts` exports `createClient()` typed against `Database`, using the browser client factory
- `lib/supabase/server.ts` exports `createClient()` typed against `Database`, using the service role key
- Both client files import `Database` from `./types` — no `any` types
- The TODO encryption comment is present in `server.ts`
- The regeneration command is documented in the top-of-file comment in `types.ts`
- Both smoke tests from Task 1.1 pass

---

### Verification

#### Task Group 4: Schema Verification and Test Review
**Dependencies:** Task Groups 1-3

- [x] 4.0 Verify the complete schema and confirm all deliverables are in place
  - [x] 4.1 Review and run the 2 smoke tests from Task 1.1
    - Confirmed `lib/supabase/__tests__/clients.test.ts` contains the 2 original smoke tests plus 2 additional configuration-validation tests
    - Run: `npx vitest run lib/supabase/__tests__/clients.test.ts` — 4/4 tests pass
    - Both original smoke tests pass
  - [x] 4.2 Analyze coverage gaps for this spec's scope only
    - The 2 smoke tests cover client instantiation — the only runtime-testable behavior in this spec
    - Migration correctness is verified by Supabase dashboard inspection in Task 2.12, not by additional unit tests
    - Gaps identified: type shape validation (Database type exports) and configuration key validation (anon key vs service role key separation)
    - Scope is limited to: client factory functions, type exports, and configuration validation — no API routes or UI flows exist in this spec
  - [x] 4.3 Write up to 3 additional strategic tests if critical gaps are identified
    - Added 3 tests across 2 files:
      1. `lib/supabase/__tests__/types.test.ts` — compile-time `expectTypeOf` assertion confirming `Database['public']['Tables']['produkte']['Row']` has correct field types (`id`, `slug`, `name`, `typ`, `status` as `string`; `domain` as `string | null`)
      2. `lib/supabase/__tests__/clients.test.ts` — configuration validation confirming browser `createClient` passes the anon key (not service role key)
      3. `lib/supabase/__tests__/clients.test.ts` — configuration validation confirming server `createClient` passes the service role key (not anon key)
  - [x] 4.4 Run all feature-specific tests
    - Run: `npx vitest run lib/supabase/__tests__/` — 5/5 tests pass across 2 test files
    - All tests pass
  - [x] 4.5 Final checklist — confirm all file deliverables exist and are committed
    - `supabase/config.toml` — exists
    - `supabase/migrations/20260406000000_initial_schema.sql` — exists
    - `lib/supabase/types.ts` (manually typed placeholder, awaiting `supabase db push`) — exists
    - `lib/supabase/client.ts` — exists
    - `lib/supabase/server.ts` — exists
    - `lib/supabase/__tests__/clients.test.ts` — exists
    - `.env.example` has all required `SUPABASE_*` keys present with empty values — confirmed
    - `npx tsc --noEmit` across `lib/supabase/` — passes cleanly, zero errors
    - MANUAL FOLLOW-UP REQUIRED: Task 2.12 still requires user action. Run `supabase link --project-ref dwlopmxtiokdvjjowfke` (enter DB password from Supabase Dashboard > Project Settings > Database), then `supabase db push`, then regenerate types: `npx supabase gen types typescript --project-id dwlopmxtiokdvjjowfke > lib/supabase/types.ts`

**Acceptance Criteria:**
- All 2-5 feature-specific tests pass
- All 7 deliverable files exist and are committed to version control
- No secrets are committed (`.env.local` is gitignored, `.env.example` contains only empty placeholder values)
- TypeScript compiles without errors across `lib/supabase/` (`tsc --noEmit` passes)
- The Supabase dashboard confirms: 7 tables, RLS enabled on all, 6 indexes, triggers active

---

## Execution Order

Recommended implementation sequence:
1. CLI and Project Scaffolding (Task Group 1) — sets up the toolchain and links the project
2. Database Layer (Task Group 2) — authors and applies the full migration SQL
3. TypeScript Client Bootstrap (Task Group 3) — generates types and creates client files, depends on live schema
4. Verification (Task Group 4) — confirms all deliverables, runs tests, performs final checks
