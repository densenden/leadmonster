-- Migration: wartezeit_monate as tariff discriminator + 24-month filter option
-- Date: 2026-07-06
-- Reason: Hannoversche Sterbegeld Plus ships 12/24/36-month variants at the same
-- age+sum. UNIQUE must include wartezeit_monate so all three rows can coexist.

ALTER TABLE tarife
  ADD COLUMN IF NOT EXISTS wartezeit_monate integer NOT NULL DEFAULT 0;

-- Backfill from besonderheiten JSON (existing VergleichsRechner rows).
UPDATE tarife
SET wartezeit_monate = COALESCE((besonderheiten->>'wartezeit_monate')::integer, 0)
WHERE wartezeit_monate = 0
  AND besonderheiten ? 'wartezeit_monate';

ALTER TABLE tarife DROP CONSTRAINT IF EXISTS tarife_vergleich_unique;
ALTER TABLE tarife
  ADD CONSTRAINT tarife_vergleich_unique
  UNIQUE (produkt_id, anbieter_name, alter_von, summe, berufsklasse, wartezeit_monate);

CREATE INDEX IF NOT EXISTS idx_tarife_wartezeit_monate
  ON tarife(produkt_id, wartezeit_monate)
  WHERE anbieter_name IS NOT NULL;

-- Sterbegeld filter: add "bis 24 Monate" between 12 and 36.
UPDATE produkt_typen
SET filter_axes = '[
  {
    "key":"wartezeit_monate","label":"Akzeptable Wartezeit",
    "source":"besonderheiten","type":"enum_max",
    "options":[
      {"value":null,"label":"Egal"},
      {"value":0,"label":"Keine Wartezeit (mit Gesundheitsfragen)"},
      {"value":12,"label":"bis 12 Monate"},
      {"value":24,"label":"bis 24 Monate"},
      {"value":36,"label":"bis 36 Monate"}
    ],
    "default_value":null,"show_as_column":true,
    "lead_field":"akzeptierte_wartezeit_monate"
  }
]'::jsonb,
    min_age = 40,
    max_age = 86,
    updated_at = now()
WHERE slug = 'sterbegeld';
