-- Migration: Convexa-CRM, Blog, Tarif-Tabelle, BU-Produkttyp, Bild-Assets
-- Date: 2026-04-29
-- Purpose:
--   1. Produkttyp-Constraint um 'bu' erweitern (Berufsunfähigkeit)
--   2. Neue Tabelle `tarife` — pro Produkt/Alters-Bracket/Summe → Beitragsspanne (löst statisches lib/tarif-data.ts ab)
--   3. Neue Tabelle `blog_posts` — editierbare Markdown-Artikel (alte finanzteam26-Inhalte + neue)
--   4. Neue Tabelle `bilder` — generierte Bilder pro Produkt/Seite mit Alt-Text & Provider-Metadaten
--   5. leads-Tabelle: Convexa-Felder; Confluence-Felder bleiben für Migrationszeitraum erhalten
--   6. produkte: hero_image_url, og_image_url
--   7. wissensfundus: editierbares MD-Feld (inhalt) bleibt; neuer Slug-Index für Auto-Linking

-- ============================================================
-- 1. PRODUKTTYP: 'bu' aufnehmen
-- ============================================================

ALTER TABLE produkte DROP CONSTRAINT IF EXISTS produkte_typ_check;
ALTER TABLE produkte
  ADD CONSTRAINT produkte_typ_check
  CHECK (typ IN ('sterbegeld', 'pflege', 'leben', 'unfall', 'bu'));


-- ============================================================
-- 2. TARIFE — pro Produkt eigene Beitragstabelle
-- ============================================================

CREATE TABLE tarife (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id   uuid NOT NULL REFERENCES produkte(id) ON DELETE CASCADE,
  alter_von    integer NOT NULL CHECK (alter_von >= 0 AND alter_von <= 120),
  alter_bis    integer NOT NULL CHECK (alter_bis >= 0 AND alter_bis <= 120),
  summe        integer NOT NULL,                  -- gewünschte Versicherungssumme (EUR) ODER Monatsrente (BU)
  beitrag_low  numeric(8,2) NOT NULL,              -- monatlich, niedrigste Quote
  beitrag_high numeric(8,2) NOT NULL,              -- monatlich, höchste Quote
  einheit      text NOT NULL DEFAULT 'eur_summe',  -- eur_summe | eur_monat
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (alter_bis >= alter_von),
  CHECK (beitrag_high >= beitrag_low)
);

CREATE INDEX idx_tarife_produkt ON tarife(produkt_id);
CREATE INDEX idx_tarife_lookup ON tarife(produkt_id, alter_von, alter_bis, summe);

CREATE TRIGGER trg_tarife_updated_at
  BEFORE UPDATE ON tarife
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 3. BLOG_POSTS — Markdown-Artikel
-- ============================================================

CREATE TABLE blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  excerpt         text,                              -- Kurzbeschreibung für Listen / Schema
  content_md      text NOT NULL,                     -- Markdown-Body, editierbar
  cover_image_url text,                              -- Hauptbild (KI- oder Stock)
  cover_image_alt text,
  meta_title      text,
  meta_desc       text,
  schema_markup   jsonb,
  kategorien      text[],                            -- ['sterbegeld', 'allgemein', ...]
  tags            text[],
  produkt_id      uuid REFERENCES produkte(id) ON DELETE SET NULL,  -- optional verknüpft
  status          text NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf','review','publiziert')),
  source_url      text,                              -- Original-URL bei Re-Import (finanzteam26.de/...)
  source_origin   text,                              -- 'finanzteam26' | 'leadmonster' | 'manual'
  author          text DEFAULT 'finanzteam26 Redaktion',
  reading_time    integer,                           -- Minuten, vom Generator/Editor gesetzt
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_kategorien ON blog_posts USING GIN(kategorien);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 4. BILDER — generierte/zugeordnete Bilder
-- ============================================================

CREATE TABLE bilder (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id    uuid REFERENCES produkte(id) ON DELETE CASCADE,
  blog_post_id  uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  page_type     text,                                -- 'hauptseite' | 'ratgeber' | 'blog' | ...
  slot          text,                                -- 'hero' | 'feature' | 'inline' | 'og'
  url           text NOT NULL,                       -- absolute URL (Supabase Storage o.ä.)
  alt_text      text NOT NULL,
  prompt_used   text,                                -- Original-Prompt an Bild-API
  provider      text NOT NULL DEFAULT 'openai',      -- openai | replicate | unsplash | manual
  width         integer,
  height        integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bilder_produkt ON bilder(produkt_id);
CREATE INDEX idx_bilder_blog_post ON bilder(blog_post_id);
CREATE INDEX idx_bilder_slot ON bilder(produkt_id, page_type, slot);


-- ============================================================
-- 5. LEADS — Convexa-Felder
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS convexa_lead_id text,
  ADD COLUMN IF NOT EXISTS convexa_synced  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS convexa_error   text,
  ADD COLUMN IF NOT EXISTS source_url      text,    -- exakte Landingpage, von der der Lead kam
  ADD COLUMN IF NOT EXISTS utm_source      text,
  ADD COLUMN IF NOT EXISTS utm_medium      text,
  ADD COLUMN IF NOT EXISTS utm_campaign    text;

CREATE INDEX IF NOT EXISTS idx_leads_convexa_synced ON leads(convexa_synced);


-- ============================================================
-- 6. PRODUKTE — Hero-Bild & OG-Bild
-- ============================================================

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS hero_image_alt text,
  ADD COLUMN IF NOT EXISTS og_image_url   text,
  ADD COLUMN IF NOT EXISTS short_pitch    text;     -- 2-3-Satz-Definition für AEO


-- ============================================================
-- 7. WISSENSFUNDUS — Slug für Auto-Linking + Volltext
-- ============================================================

ALTER TABLE wissensfundus
  ADD COLUMN IF NOT EXISTS slug          text,
  ADD COLUMN IF NOT EXISTS link_phrases  text[],     -- Begriffe, die im Generator als Cross-Link erkannt werden
  ADD COLUMN IF NOT EXISTS published     boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wissensfundus_slug ON wissensfundus(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wissensfundus_link_phrases ON wissensfundus USING GIN(link_phrases);


-- ============================================================
-- 8. EINSTELLUNGEN — Convexa-Schlüssel registrieren
-- ============================================================

INSERT INTO einstellungen (schluessel, beschreibung) VALUES
  ('convexa_base_url',      'Convexa API Base-URL (Default: https://app.convexa.app)'),
  ('convexa_api_token',     'Convexa API-Token (Bearer)'),
  ('convexa_workspace_id',  'Convexa Workspace-/Mandanten-ID'),
  ('openai_api_key',        'OpenAI API-Key für Bildgenerierung (gpt-image-1)'),
  ('image_provider',        'Bild-Provider: openai | replicate | unsplash')
ON CONFLICT (schluessel) DO NOTHING;


-- ============================================================
-- ROW LEVEL SECURITY für neue Tabellen
-- ============================================================
ALTER TABLE tarife       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilder       ENABLE ROW LEVEL SECURITY;
