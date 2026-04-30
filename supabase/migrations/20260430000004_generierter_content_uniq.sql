-- Migration: UNIQUE-Constraint für generierter_content (produkt_id, page_type, slug)
-- Date: 2026-04-30
-- Reason: Der Generator nutzt seit jeher onConflict: 'produkt_id,page_type,slug'
-- bei den Upserts (lib/anthropic/generator.ts), aber es gab nie einen passenden
-- UNIQUE-Constraint. Postgres liefert deshalb stillschweigend einen Error im
-- error-Feld zurück; der Generator hat ihn ignoriert und das Frontend hat
-- "Ratgeber wird generiert" angezeigt, obwohl nichts gespeichert wurde.

-- 1. Bestehende NULL/leere Slugs auf page_type setzen, damit der UNIQUE-Constraint
--    den Backfill nicht blockiert. Die UI-Komponenten zeigen Ratgeber-Slugs sowieso
--    schon an; für Hauptseite/FAQ/Vergleich/Tarif reicht der page_type-Name.
UPDATE generierter_content
   SET slug = page_type
 WHERE slug IS NULL OR slug = '';

-- 2. UNIQUE-Constraint hinzufügen
ALTER TABLE generierter_content
  DROP CONSTRAINT IF EXISTS generierter_content_pps_uniq;
ALTER TABLE generierter_content
  ADD CONSTRAINT generierter_content_pps_uniq
  UNIQUE (produkt_id, page_type, slug);
