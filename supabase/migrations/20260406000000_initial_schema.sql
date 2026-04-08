-- Migration: Initial Schema
-- Date: 2026-04-06
-- Supabase CLI version: 2.33.9
-- Purpose: Create all 7 core tables, triggers, indexes, and enable RLS for LeadMonster


-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE produkte (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  typ         text NOT NULL CHECK (typ IN ('sterbegeld', 'pflege', 'leben', 'unfall')),
  status      text NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'aktiv', 'archiviert')),
  domain      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE produkt_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id  uuid NOT NULL REFERENCES produkte(id) ON DELETE CASCADE,
  zielgruppe  text[],
  fokus       text CHECK (fokus IN ('sicherheit', 'preis', 'sofortschutz')),
  anbieter    text[],
  argumente   jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE wissensfundus (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kategorie   text NOT NULL,
  thema       text NOT NULL,
  inhalt      text NOT NULL,
  tags        text[],
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE generierter_content (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id    uuid NOT NULL REFERENCES produkte(id) ON DELETE CASCADE,
  page_type     text NOT NULL CHECK (page_type IN ('hauptseite', 'faq', 'vergleich', 'tarif', 'ratgeber')),
  slug          text,
  title         text,
  meta_title    text,
  meta_desc     text,
  content       jsonb,
  schema_markup jsonb,
  status        text NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'review', 'publiziert')),
  generated_at  timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Note: intentionally no ON DELETE CASCADE — leads are retained after product deletion
  produkt_id          uuid REFERENCES produkte(id),
  vorname             text,
  nachname            text,
  email               text NOT NULL,
  telefon             text,
  interesse           text,
  zielgruppe_tag      text,
  intent_tag          text,
  confluence_page_id  text,
  confluence_synced   boolean NOT NULL DEFAULT false,
  resend_sent         boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE einstellungen (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schluessel    text UNIQUE NOT NULL,
  -- TODO: Encrypt wert column using AES/pgcrypto (Supabase Vault) before production deployment.
  wert          text,
  beschreibung  text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id)
);


CREATE TABLE email_sequenzen (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id  uuid NOT NULL REFERENCES produkte(id) ON DELETE CASCADE,
  trigger     text,
  betreff     text,
  html_body   text,
  delay_hours integer NOT NULL DEFAULT 0,
  aktiv       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

-- Supports slug-based page route lookups
CREATE UNIQUE INDEX idx_produkte_slug ON produkte(slug);

-- Composite index for content fetch per product and page type
CREATE INDEX idx_generierter_content_produkt_page_type ON generierter_content(produkt_id, page_type);

-- Admin dashboard filtering by content status
CREATE INDEX idx_generierter_content_status ON generierter_content(status);

-- Admin lead table filtered by product
CREATE INDEX idx_leads_produkt_id ON leads(produkt_id);

-- Chronological lead listing, most recent first
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Claude content generation filters by category
CREATE INDEX idx_wissensfundus_kategorie ON wissensfundus(kategorie);


-- ============================================================
-- TRIGGER FUNCTION + BINDINGS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_produkte_updated_at
  BEFORE UPDATE ON produkte
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_produkt_config_updated_at
  BEFORE UPDATE ON produkt_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_wissensfundus_updated_at
  BEFORE UPDATE ON wissensfundus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_generierter_content_updated_at
  BEFORE UPDATE ON generierter_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_einstellungen_updated_at
  BEFORE UPDATE ON einstellungen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_email_sequenzen_updated_at
  BEFORE UPDATE ON email_sequenzen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- All database access in LeadMonster is server-side via SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS entirely. Enabling RLS with no permissive policies ensures
-- that public/anon clients (e.g. browser Supabase client with anon key) have
-- zero access to any table. This is the intended blanket deny-all strategy.
-- Do NOT add permissive policies unless explicitly required and reviewed.
-- ============================================================

ALTER TABLE produkte ENABLE ROW LEVEL SECURITY;
ALTER TABLE produkt_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE wissensfundus ENABLE ROW LEVEL SECURITY;
ALTER TABLE generierter_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE einstellungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequenzen ENABLE ROW LEVEL SECURITY;
