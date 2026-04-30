-- Migration: VergleichsRechner — Anbieter-Tarife in tarife + gewuenschter_anbieter in leads
-- Date: 2026-04-30
-- Reason: Neuer VergleichsRechner-Baustein vergleicht konkrete Anbietertarife
-- (Allianz/DELA/Ideal/...) — bisherige tarife-Rows (anbieter_name = NULL) bleiben
-- als Marktkorridor für den TarifRechner. leads bekommt gewuenschter_anbieter
-- für CTAs aus der Vergleichstabelle.

-- 1. tarife: Anbieter-Spalten
ALTER TABLE tarife
  ADD COLUMN IF NOT EXISTS anbieter_name  text,
  ADD COLUMN IF NOT EXISTS tarif_name     text,
  ADD COLUMN IF NOT EXISTS besonderheiten jsonb DEFAULT '{}'::jsonb;

-- UNIQUE-Constraint für idempotenten Seed-UPSERT
-- (mehrere Rows pro Produkt+Anbieter sind erlaubt — eine pro Alter+Summe)
ALTER TABLE tarife DROP CONSTRAINT IF EXISTS tarife_vergleich_unique;
ALTER TABLE tarife
  ADD CONSTRAINT tarife_vergleich_unique
  UNIQUE (produkt_id, anbieter_name, alter_von, summe);

-- Partieller Index für schnelle VergleichsRechner-Lookups
CREATE INDEX IF NOT EXISTS idx_tarife_anbieter
  ON tarife(produkt_id, anbieter_name)
  WHERE anbieter_name IS NOT NULL;

-- 2. leads: Anbieter-Wunsch
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS gewuenschter_anbieter text;

CREATE INDEX IF NOT EXISTS idx_leads_gewuenschter_anbieter
  ON leads(gewuenschter_anbieter)
  WHERE gewuenschter_anbieter IS NOT NULL;
