-- Migration: Remove duplicate Anbietertarife + fix UNIQUE for NULL berufsklasse
-- Date: 2026-07-06
-- Reason: PostgreSQL UNIQUE treats NULL != NULL, so sterbegeld rows (berufsklasse NULL)
-- were re-seeded multiple times. Keep oldest row per logical tariff key.

-- 1. Delete duplicates (keep row with smallest id)
DELETE FROM tarife t
USING tarife t2
WHERE t.anbieter_name IS NOT NULL
  AND t2.anbieter_name IS NOT NULL
  AND t.id > t2.id
  AND t.produkt_id = t2.produkt_id
  AND t.anbieter_name = t2.anbieter_name
  AND t.alter_von = t2.alter_von
  AND t.alter_bis = t2.alter_bis
  AND t.summe = t2.summe
  AND COALESCE(t.berufsklasse, '') = COALESCE(t2.berufsklasse, '')
  AND t.wartezeit_monate = t2.wartezeit_monate;

-- 2. Normalized berufsklasse column (NULL → '') so UNIQUE + upsert work with PostgREST
ALTER TABLE tarife ADD COLUMN IF NOT EXISTS berufsklasse_norm text NOT NULL DEFAULT '';

UPDATE tarife
SET berufsklasse_norm = COALESCE(berufsklasse, '')
WHERE berufsklasse_norm = '' OR berufsklasse_norm IS DISTINCT FROM COALESCE(berufsklasse, '');

CREATE OR REPLACE FUNCTION tarife_sync_berufsklasse_norm()
RETURNS TRIGGER AS $$
BEGIN
  NEW.berufsklasse_norm := COALESCE(NEW.berufsklasse, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tarife_berufsklasse_norm_trg ON tarife;
CREATE TRIGGER tarife_berufsklasse_norm_trg
  BEFORE INSERT OR UPDATE OF berufsklasse ON tarife
  FOR EACH ROW EXECUTE FUNCTION tarife_sync_berufsklasse_norm();

-- 3. Replace broken UNIQUE constraint / expression index with NULL-safe partial index
ALTER TABLE tarife DROP CONSTRAINT IF EXISTS tarife_vergleich_unique;
DROP INDEX IF EXISTS tarife_vergleich_anbieter_unique;

CREATE UNIQUE INDEX IF NOT EXISTS tarife_vergleich_anbieter_unique
  ON tarife (
    produkt_id,
    anbieter_name,
    alter_von,
    summe,
    berufsklasse_norm,
    wartezeit_monate
  );
