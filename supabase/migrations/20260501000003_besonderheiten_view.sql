-- Migration: View `tarife_besonderheiten_aggregiert`
-- Pivotierte Sicht auf die JSONB-Spalte `tarife.besonderheiten` — pro
-- (produkt_id, anbieter_name) gibt es eine Zeile mit den Marker-Flags.
-- Wird vom Marktdaten-Hub und den Anbieter-Landingpages konsumiert.

CREATE OR REPLACE VIEW tarife_besonderheiten_aggregiert AS
SELECT
  produkt_id,
  anbieter_name,
  -- Erster (oder beliebiger) tarif_name pro Anbieter — primärer Tarif
  (array_agg(tarif_name ORDER BY beitrag_low NULLS LAST))[1] AS tarif_name,
  MIN(beitrag_low) AS beitrag_min,
  MAX(beitrag_high) AS beitrag_max,
  COUNT(*) AS tarif_count,
  -- Pivotierte Marker — bool_or, weil mindestens 1 Tarif des Anbieters die Eigenschaft hat
  bool_or(COALESCE((besonderheiten->>'gp')::boolean, false))               AS gesundheitspruefung,
  bool_or(COALESCE((besonderheiten->>'doppelte_unfall')::boolean, false))  AS doppelte_unfall,
  bool_or(COALESCE((besonderheiten->>'rueckholung')::boolean, false))      AS rueckholung,
  bool_or(COALESCE((besonderheiten->>'lebenslang')::boolean, false))       AS lebenslang,
  bool_or(COALESCE((besonderheiten->>'kindermitversicherung')::boolean, false)) AS kindermitversicherung,
  -- Numerische: kürzeste Wartezeit
  MIN((besonderheiten->>'wartezeit_monate')::int) AS wartezeit_min_monate,
  MIN((besonderheiten->>'wartezeit')::int) AS wartezeit_alt_monate,
  -- Zahlung bis Alter X (höchstes ist am besten)
  MAX((besonderheiten->>'zahlung_bis')::int) AS zahlung_bis_alter,
  MIN(alter_von) AS alter_von_min,
  MAX(alter_bis) AS alter_bis_max,
  MIN(summe) AS summe_min,
  MAX(summe) AS summe_max
FROM tarife
WHERE anbieter_name IS NOT NULL
GROUP BY produkt_id, anbieter_name;

COMMENT ON VIEW tarife_besonderheiten_aggregiert IS
  'Pivotierte Sicht auf besonderheiten jsonb pro (produkt, anbieter). Konsumiert von /[produkt]/anbieter/[slug] und /marktdaten/[thema].';

-- Index-Hilfe (View ist read-only, der zugrundeliegende Index läuft auf tarife.produkt_id + tarife.anbieter_name)
CREATE INDEX IF NOT EXISTS idx_tarife_anbieter_produkt
  ON tarife(produkt_id, anbieter_name)
  WHERE anbieter_name IS NOT NULL;
