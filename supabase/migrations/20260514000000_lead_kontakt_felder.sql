-- Lead-Kontakt-Felder für „blinde" Angebotsversendung durch Christian.
-- Motivation: O-Ton Christian (Besprechung 2026-05-13, 52:49) — „Ich brauch
-- Geburtsdatum, Adresse, Sterbegeldsumme und Wartezeit." Ohne diese Felder
-- kann er nach Lead-Eingang nicht ohne Rückruf ein Angebot aufsetzen.
--
-- `wartezeit_monate` ist bereits als `akzeptierte_wartezeit_monate` (Migration
-- 20260504000000) vorhanden. `sterbegeld_summe` ergänzt die VergleichsRechner-
-- Auswahl, die bisher nur in `interesse` als Text landete.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS geburtsdatum date,
  ADD COLUMN IF NOT EXISTS strasse text,
  ADD COLUMN IF NOT EXISTS plz text,
  ADD COLUMN IF NOT EXISTS ort text,
  ADD COLUMN IF NOT EXISTS sterbegeld_summe integer;

COMMENT ON COLUMN leads.geburtsdatum IS 'Vollständiges Geburtsdatum (DATE), volljährig + plausibler Bereich (Zod-Range im API-Schema).';
COMMENT ON COLUMN leads.strasse IS 'Straße + Hausnummer (1 String).';
COMMENT ON COLUMN leads.plz IS 'Postleitzahl (DE 5-stellig, Validierung in Zod-Schema).';
COMMENT ON COLUMN leads.ort IS 'Stadt / Wohnort.';
COMMENT ON COLUMN leads.sterbegeld_summe IS 'Vom Lead gewünschte Versicherungssumme (Vorgriff aus Rechner-Prefill).';
