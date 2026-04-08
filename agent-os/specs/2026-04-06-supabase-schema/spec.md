# Specification: Supabase Schema & Database Foundation

## Goal
Create all 7 PostgreSQL tables in Supabase with correct column types, foreign keys, indexes, RLS policies (blanket deny-all, service role only), and bootstrap the `lib/supabase/` folder with browser client, server client, and generated TypeScript types.

## User Stories
- As a developer, I want all database tables created via versioned migration files so that the schema is reproducible and tracked in version control.
- As a developer, I want TypeScript types generated from the schema so that all DB access is type-safe throughout the application.

## Specific Requirements

### Migration file

**File:** `supabase/migrations/20260406000000_initial_schema.sql`

Apply via Supabase CLI: `supabase db push` or `supabase migration up`.

---

### Table: `produkte`
```sql
create table produkte (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  typ           text not null check (typ in ('sterbegeld','pflege','leben','unfall')),
  status        text not null default 'entwurf' check (status in ('entwurf','aktiv','archiviert')),
  domain        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

### Table: `produkt_config`
```sql
create table produkt_config (
  id            uuid primary key default gen_random_uuid(),
  produkt_id    uuid not null references produkte(id) on delete cascade,
  zielgruppe    text[],
  fokus         text check (fokus in ('sicherheit','preis','sofortschutz')),
  anbieter      text[],
  argumente     jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

### Table: `wissensfundus`
```sql
create table wissensfundus (
  id            uuid primary key default gen_random_uuid(),
  kategorie     text not null,
  thema         text not null,
  inhalt        text not null,
  tags          text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

### Table: `generierter_content`
```sql
create table generierter_content (
  id            uuid primary key default gen_random_uuid(),
  produkt_id    uuid not null references produkte(id) on delete cascade,
  page_type     text not null check (page_type in ('hauptseite','faq','vergleich','tarif','ratgeber')),
  slug          text,
  title         text,
  meta_title    text,
  meta_desc     text,
  content       jsonb,
  schema_markup jsonb,
  status        text not null default 'entwurf' check (status in ('entwurf','review','publiziert')),
  generated_at  timestamptz not null default now(),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

### Table: `leads`
```sql
create table leads (
  id                  uuid primary key default gen_random_uuid(),
  produkt_id          uuid references produkte(id),  -- intentionally no CASCADE: leads survive product deletion
  vorname             text,
  nachname            text,
  email               text not null,
  telefon             text,
  interesse           text,
  zielgruppe_tag      text,
  intent_tag          text,
  confluence_page_id  text,
  confluence_synced   boolean not null default false,
  resend_sent         boolean not null default false,
  created_at          timestamptz not null default now()
);
```

> **Note:** `leads.produkt_id` has no `ON DELETE CASCADE` — leads are retained even if the product is deleted.

---

### Table: `einstellungen`
```sql
create table einstellungen (
  id            uuid primary key default gen_random_uuid(),
  schluessel    text unique not null,
  wert          text,  -- TODO: encrypt sensitive values (e.g. confluence_api_token) with AES/pgcrypto before going live
  beschreibung  text,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id)
);
```

---

### Table: `email_sequenzen`
```sql
create table email_sequenzen (
  id            uuid primary key default gen_random_uuid(),
  produkt_id    uuid references produkte(id) on delete cascade,
  trigger       text,
  betreff       text,
  html_body     text,
  delay_hours   integer not null default 0,
  aktiv         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

### `updated_at` auto-update trigger

Apply to all tables that have an `updated_at` column:

```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to each table:
create trigger trg_produkte_updated_at
  before update on produkte
  for each row execute function update_updated_at_column();

create trigger trg_produkt_config_updated_at
  before update on produkt_config
  for each row execute function update_updated_at_column();

create trigger trg_wissensfundus_updated_at
  before update on wissensfundus
  for each row execute function update_updated_at_column();

create trigger trg_generierter_content_updated_at
  before update on generierter_content
  for each row execute function update_updated_at_column();

create trigger trg_einstellungen_updated_at
  before update on einstellungen
  for each row execute function update_updated_at_column();

create trigger trg_email_sequenzen_updated_at
  before update on email_sequenzen
  for each row execute function update_updated_at_column();
```

---

### RLS Strategy — blanket deny-all, service role only

Enable RLS on all tables and add no permissive policies. All access goes through the Supabase service role key (bypasses RLS entirely):

```sql
alter table produkte enable row level security;
alter table produkt_config enable row level security;
alter table wissensfundus enable row level security;
alter table generierter_content enable row level security;
alter table leads enable row level security;
alter table einstellungen enable row level security;
alter table email_sequenzen enable row level security;
```

No `CREATE POLICY` statements. The service role used in `lib/supabase/server.ts` bypasses RLS for all server-side operations. Public/anon clients have zero access.

---

### Performance Indexes

```sql
-- produkte: slug is used in every public page route lookup
create unique index idx_produkte_slug on produkte(slug);

-- generierter_content: fetch all page types for a product
create index idx_generierter_content_produkt_page_type
  on generierter_content(produkt_id, page_type);

-- generierter_content: filter published content
create index idx_generierter_content_status
  on generierter_content(status);

-- leads: filter by product
create index idx_leads_produkt_id on leads(produkt_id);

-- leads: sort by creation time (admin lead table, newest first)
create index idx_leads_created_at on leads(created_at desc);

-- wissensfundus: fetch knowledge by category for AI generation
create index idx_wissensfundus_kategorie on wissensfundus(kategorie);
```

---

### `lib/supabase/` Bootstrap

**`lib/supabase/client.ts`** — browser client (anon key):
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`** — server client (service role):
```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**`lib/supabase/types.ts`** — generated types:
- Run: `supabase gen types typescript --project-id dwlopmxtiokdvjjowfke > lib/supabase/types.ts`
- Re-run after every schema migration
- Export `Database` as the default type, used as the generic param in both clients

---

### Supabase CLI Commands

```bash
# Apply migration
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id dwlopmxtiokdvjjowfke > lib/supabase/types.ts
```

## Existing Code to Leverage
- `design-tokens/tokens.json` — no direct dependency for this spec
- `CLAUDE.md` — authoritative schema definitions (this spec is derived from it)

## Out of Scope
- Seed data / initial content population
- AES/pgcrypto encryption for `einstellungen.wert` (TODO comment added, deferred)
- Supabase Auth setup (covered in admin-authentication spec)
- Any `lib/` files beyond `lib/supabase/` (anthropic, confluence, resend, seo)
- Next.js project setup (covered in nextjs-project-setup spec)
