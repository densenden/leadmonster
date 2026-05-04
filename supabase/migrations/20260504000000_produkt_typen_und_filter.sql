-- Migration: Versicherungsarten-Tabelle + Filter-Achsen + Berufsklasse + Lead-Filter-Felder
-- Date: 2026-05-04
-- Purpose:
--   1. Neue Tabelle `produkt_typen` ersetzt den hardcoded CHECK-Constraint auf produkte.typ
--      → Admin kann neue Versicherungsarten anlegen (z. B. "zahnzusatz", "hausrat")
--      → Pro Typ werden Summen-Optionen, Labels, Filter-Achsen, Brand-Look, Scenes konfiguriert
--   2. produkte.typ wird FK auf produkt_typen.slug (statt CHECK)
--   3. tarife.berufsklasse als 3. Strukturachse (für BU + erweiterbar)
--   4. UNIQUE-Constraint auf tarife erweitert um berufsklasse
--   5. leads bekommt akzeptierte_wartezeit_monate, berufsklasse, filter_kontext
--      für Convexa-Push der Filter-Auswahl


-- ============================================================
-- 1. PRODUKT_TYPEN — neue zentrale Versicherungsarten-Tabelle
-- ============================================================

CREATE TABLE IF NOT EXISTS produkt_typen (
  slug                  text PRIMARY KEY,
  name                  text NOT NULL,
  summen                jsonb NOT NULL,                    -- z.B. [5000,8000,10000,12500,15000]
  default_summe         integer NOT NULL,
  default_age           integer NOT NULL,
  min_age               integer NOT NULL,
  max_age               integer NOT NULL,
  summe_label           text NOT NULL,                     -- "Wunschsumme" / "Gewünschte BU-Rente"
  beitrag_label         text NOT NULL,                     -- "Beitrag / Monat"
  summe_suffix          text NOT NULL,                     -- "€" oder "€ / Monat"
  einheit               text NOT NULL CHECK (einheit IN ('eur_summe','eur_monat')),
  filter_axes           jsonb NOT NULL DEFAULT '[]'::jsonb, -- siehe lib/tarife/filter-config-schema.ts
  image_brand_look      jsonb,                             -- {palette, lighting, motifs}
  image_typ_scenes      text[],                            -- pro Typ ein/mehrere Scene-Beschreibungen
  wissensfundus_label   text NOT NULL,                     -- "Sterbegeld" für UI-Anzeige
  active                boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produkt_typen_active ON produkt_typen(active) WHERE active = true;

CREATE TRIGGER trg_produkt_typen_updated_at
  BEFORE UPDATE ON produkt_typen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE produkt_typen ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. SEED — die heute hardcoded 5 Typen aus lib/tarife/produkt-config.ts
--    + lib/openai/hero-prompt.ts in die DB übernehmen
-- ============================================================

INSERT INTO produkt_typen (
  slug, name, summen, default_summe, default_age, min_age, max_age,
  summe_label, beitrag_label, summe_suffix, einheit,
  filter_axes, image_brand_look, image_typ_scenes, wissensfundus_label, active
) VALUES
  (
    'sterbegeld',
    'Sterbegeldversicherung',
    '[5000,8000,10000,12500,15000]'::jsonb,
    8000, 65, 40, 86,
    'Wunschsumme', 'Beitrag / Monat', '€', 'eur_summe',
    '[
      {
        "key":"wartezeit_monate","label":"Akzeptable Wartezeit",
        "source":"besonderheiten","type":"enum_max",
        "options":[
          {"value":null,"label":"Egal"},
          {"value":0,"label":"Keine Wartezeit (mit Gesundheitsfragen)"},
          {"value":12,"label":"bis 12 Monate"},
          {"value":36,"label":"bis 36 Monate"}
        ],
        "default_value":null,"show_as_column":true,
        "lead_field":"akzeptierte_wartezeit_monate"
      }
    ]'::jsonb,
    '{"palette":"soft sage green, warm cream, dusty beige","lighting":"late golden afternoon light filtering through windows","motifs":"open hands resting on letters, a single candle, an unfinished cup of tea, family photo frames seen from behind"}'::jsonb,
    ARRAY['an intimate domestic German interior at golden hour — a kitchen table with an open envelope, soft sunlight on wooden surfaces — symbolic of dignified end-of-life planning'],
    'Sterbegeld', true
  ),
  (
    'pflege',
    'Pflegezusatzversicherung',
    '[500,1000,1500,2000,3000]'::jsonb,
    1000, 55, 30, 75,
    'Gewünschte Pflegerente', 'Beitrag / Monat', '€ / Monat', 'eur_monat',
    '[]'::jsonb,
    '{"palette":"warm amber, terracotta, soft cream","lighting":"morning sunlight in a sunlit kitchen or living room","motifs":"helping hands placing a teacup, a freshly folded blanket, walking-aid silhouette near a window, plants on a windowsill"}'::jsonb,
    ARRAY['a sunlit German home — a hand carefully placing a folded blanket on an armchair, an empty walking aid waiting nearby — symbolic of attentive care'],
    'Pflege', true
  ),
  (
    'leben',
    'Risikolebensversicherung',
    '[50000,100000,200000,350000,500000]'::jsonb,
    100000, 40, 18, 65,
    'Versicherungssumme', 'Beitrag / Monat', '€', 'eur_summe',
    '[]'::jsonb,
    '{"palette":"deep navy, soft sand, brushed gold accents","lighting":"late summer sunset over a quiet residential street","motifs":"an empty bicycle in front of a house, two coffee cups on a porch table, family keys in a wooden bowl, seedlings in a small pot"}'::jsonb,
    ARRAY['a quiet German residential street at sunset — a family bicycle leaning against a hedge, glowing windows in the background — symbolic of protective love'],
    'Lebensversicherung', true
  ),
  (
    'bu',
    'Berufsunfähigkeitsversicherung',
    '[1000,1500,2000,2500,3000]'::jsonb,
    1500, 30, 18, 55,
    'Gewünschte BU-Rente', 'Beitrag / Monat', '€ / Monat', 'eur_monat',
    '[
      {
        "key":"berufsklasse","label":"Berufsklasse",
        "source":"column","type":"enum_exact",
        "options":[
          {"value":"A","label":"A — Akademisch / Bürotätigkeit"},
          {"value":"B","label":"B — Leichte körperliche Arbeit"},
          {"value":"C","label":"C — Mittelschwere körperliche Arbeit"},
          {"value":"D","label":"D — Schwere körperliche Arbeit"}
        ],
        "default_value":"A","show_as_column":true,
        "lead_field":"berufsklasse"
      }
    ]'::jsonb,
    '{"palette":"cool industrial blue-grey, warm tool-belt brown","lighting":"overcast workshop daylight or focused desk lamp","motifs":"callused hands holding a clipboard, an idle workbench with carefully laid-out tools, an empty office chair seen from above, a thermos and notebook"}'::jsonb,
    ARRAY['a focused German workshop or office at end-of-day — a clipboard and tools resting on a clean workbench, single window light — symbolic of professional resilience'],
    'Berufsunfähigkeit', true
  ),
  (
    'unfall',
    'Unfallversicherung',
    '[50000,100000,200000,300000,500000]'::jsonb,
    100000, 45, 18, 75,
    'Invaliditätssumme', 'Beitrag / Monat', '€', 'eur_summe',
    '[]'::jsonb,
    '{"palette":"soft sky blue, neutral grey, accent orange","lighting":"crisp morning light after rain","motifs":"children''s bicycles on a quiet sidewalk, a helmet on a bench, hiking boots by an open door, a bandaged hand reaching for a coffee cup"}'::jsonb,
    ARRAY['a German residential courtyard after rain — bicycles, scooters, a fallen scarf on a bench — symbolic of safe everyday life'],
    'Unfall', true
  )
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 3. PRODUKTE.TYP — von CHECK auf FK umstellen
--    Bestehende Zeilen sind bereits kompatibel (Slugs identisch).
-- ============================================================

ALTER TABLE produkte DROP CONSTRAINT IF EXISTS produkte_typ_check;
ALTER TABLE produkte
  ADD CONSTRAINT produkte_typ_fkey
  FOREIGN KEY (typ) REFERENCES produkt_typen(slug) ON UPDATE CASCADE;


-- ============================================================
-- 4. TARIFE.BERUFSKLASSE — 3. Strukturachse
-- ============================================================

ALTER TABLE tarife ADD COLUMN IF NOT EXISTS berufsklasse text;

ALTER TABLE tarife DROP CONSTRAINT IF EXISTS tarife_vergleich_unique;
ALTER TABLE tarife
  ADD CONSTRAINT tarife_vergleich_unique
  UNIQUE (produkt_id, anbieter_name, alter_von, summe, berufsklasse);

CREATE INDEX IF NOT EXISTS idx_tarife_berufsklasse
  ON tarife(produkt_id, berufsklasse) WHERE berufsklasse IS NOT NULL;


-- ============================================================
-- 5. LEADS — Filter-Werte vom VergleichsRechner
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS akzeptierte_wartezeit_monate integer,
  ADD COLUMN IF NOT EXISTS berufsklasse                 text,
  ADD COLUMN IF NOT EXISTS filter_kontext               jsonb DEFAULT '{}'::jsonb;
