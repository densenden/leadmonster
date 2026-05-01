-- Migration: Redaktion (Autoren-Profile) + Trust-Bausteine + Author-Bindings + Review-Felder
-- Date: 2026-05-01
-- Purpose:
--   1. Tabelle `redaktion` — Autoren-Profile mit allen E-E-A-T-relevanten Feldern
--      (Foto, Bio, § 34d-Reg-Nr, IHK, LinkedIn, Schema-Person-JSON-LD)
--   2. Tabelle `trust_baustein` — Pressezitate, Siegel, Reviews, Partner-Logos, Zahlen
--      pro Produkt oder global einsetzbar.
--   3. produkte.standard_autor_id — pro Projekt/Produkt EIN Standard-Autor
--   4. autor_id + reviewed_at/by an generierter_content, blog_posts, wissensfundus
--   5. Erweiterte Imprint-Einstellungen mit allen finanzteam26-Pflichtangaben
--      (§ 34d, IHK München, Vermittlerregister-Nrn, Berufshaftpflicht)
--   6. RLS für die neuen Tabellen

-- ============================================================
-- 1. REDAKTION
-- ============================================================

CREATE TABLE redaktion (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE NOT NULL,            -- /redaktion/<slug>, Schema-Person-URL
  vorname               text NOT NULL,
  nachname              text NOT NULL,
  titel                 text,                            -- akadem. Titel ("Dipl.-Kfm.")
  rolle                 text NOT NULL,                   -- "Versicherungsmakler & Inhaber"
  kurz_bio              text NOT NULL,                   -- 200-300 Zeichen, für Cards/Sidebar/Schema
  lang_bio_md           text NOT NULL,                   -- Markdown-Langform für /redaktion/<slug>
  expertise             text[],                          -- ['sterbegeld','bu','handwerker']
  qualifikationen       text[],                          -- ['§ 34d GewO','BKV-Experte','IHK-Sachkundenachweis']
  vermittlerregister_nr text,                            -- "D-F-155-HL9G-55"
  ihk_kammer            text,                            -- "IHK für München und Oberbayern"
  paragraph_34d         text,                            -- "§ 34d Abs. 1 GewO Versicherungsmakler"
  jahre_erfahrung       integer,
  -- Foto + Storage
  foto_url              text,                            -- public URL (Bucket: redaktion-fotos)
  foto_alt              text,
  -- Kontakt
  email                 text,
  telefon               text,
  linkedin_url          text,
  xing_url              text,
  website_url           text,                            -- z. B. eigene Maklerseite
  -- Sichtbarkeit
  public                boolean NOT NULL DEFAULT true,   -- darf öffentlich angezeigt werden
  -- Vorberechnetes Schema.org/Person für instant Embed in JSON-LD
  schema_person         jsonb,
  -- Telemetrie
  artikel_anzahl        integer NOT NULL DEFAULT 0,      -- Artikel als author_id
  reviewed_anzahl       integer NOT NULL DEFAULT 0,      -- Artikel als reviewed_by
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_redaktion_public ON redaktion(public) WHERE public = true;
CREATE INDEX idx_redaktion_expertise ON redaktion USING GIN(expertise);

CREATE TRIGGER trg_redaktion_updated_at
  BEFORE UPDATE ON redaktion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 2. TRUST_BAUSTEIN — Pressezitate, Siegel, Reviews, Logos, Zahlen
-- ============================================================

CREATE TABLE trust_baustein (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  typ          text NOT NULL CHECK (typ IN (
    'pressezitat',    -- "FOCUS Money: Bester Sterbegeldtarif 2025"
    'siegel',         -- TÜV/IVFP/Franke-und-Bornberg-Logo + Jahr + Score
    'kunden_review',  -- echte Kundenstimme (idealerweise aus Convexa zurück)
    'partner_logo',   -- Anbieter-Logo (Allianz, DELA, Ideal, LV1871, ...)
    'zahl',           -- "Seit 2008", "12.847 zufriedene Kunden", "125 Mio EUR vermittelte VS"
    'auszeichnung',   -- "Top Versicherungsmakler 2025 (ProContra)"
    'verband'         -- BVK, AfW, ggf. IHK
  )),
  titel        text NOT NULL,                            -- "FOCUS Money 11/2025"
  body         text,                                     -- Zitat / Beschreibung / Review-Text
  bild_url     text,                                     -- Logo / Siegel / Avatar
  bild_alt     text,
  quelle_url   text,                                     -- für Klick-Verifikation (Pflicht bei Siegel/Pressezitat)
  quelle_name  text,                                     -- "FOCUS Money"
  jahr         integer,
  score        text,                                     -- "1,3", "★★★★★", "98/100"
  -- Verfasser einer Kundenstimme
  autor_name   text,                                     -- "M. Berger, Köln"
  autor_alter  text,                                     -- "63 Jahre"
  -- Zuordnung
  produkt_id   uuid REFERENCES produkte(id) ON DELETE CASCADE, -- NULL = global, sonst nur für 1 Produkt
  reihenfolge  integer NOT NULL DEFAULT 100,             -- Sortierung im Frontend
  aktiv        boolean NOT NULL DEFAULT true,
  -- Compliance: jeder Trust-Baustein braucht Beleg / Verifizierbarkeit
  belegt_durch text,                                     -- "Scan in Drive: …", "Zertifikat-PDF in /docs/"
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trust_aktiv ON trust_baustein(aktiv, reihenfolge) WHERE aktiv = true;
CREATE INDEX idx_trust_produkt ON trust_baustein(produkt_id, typ) WHERE produkt_id IS NOT NULL;
CREATE INDEX idx_trust_typ ON trust_baustein(typ, aktiv);

CREATE TRIGGER trg_trust_baustein_updated_at
  BEFORE UPDATE ON trust_baustein
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 3. PRODUKTE — Standard-Autor (1 Autor pro Projekt)
-- ============================================================

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS standard_autor_id uuid REFERENCES redaktion(id) ON DELETE SET NULL;

COMMENT ON COLUMN produkte.standard_autor_id IS
  'Pro Projekt/Produkt EIN Standard-Autor. Wird auf Hauptseite, Subpages, in Schema.org und unter jedem generierten Artikel angezeigt, sofern dort kein eigener autor_id gesetzt ist.';


-- ============================================================
-- 4. AUTOR-BINDINGS + REVIEW-METADATEN
-- ============================================================

-- 4a) generierter_content
ALTER TABLE generierter_content
  ADD COLUMN IF NOT EXISTS autor_id    uuid REFERENCES redaktion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES redaktion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz,                     -- Re-Review fällig?
  ADD COLUMN IF NOT EXISTS freshness_score integer;                        -- 0-100, vom Cron berechnet

CREATE INDEX IF NOT EXISTS idx_genc_next_review
  ON generierter_content(next_review_at)
  WHERE status = 'publiziert';

-- 4b) blog_posts
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS autor_id      uuid REFERENCES redaktion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by   uuid REFERENCES redaktion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS freshness_score integer;

CREATE INDEX IF NOT EXISTS idx_blog_next_review
  ON blog_posts(next_review_at)
  WHERE status = 'publiziert';

-- 4c) wissensfundus
ALTER TABLE wissensfundus
  ADD COLUMN IF NOT EXISTS autor_id      uuid REFERENCES redaktion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by   uuid REFERENCES redaktion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS wortzahl      integer,
  ADD COLUMN IF NOT EXISTS freshness_score integer;

CREATE INDEX IF NOT EXISTS idx_wissen_next_review
  ON wissensfundus(next_review_at)
  WHERE published = true;


-- ============================================================
-- 5. EINSTELLUNGEN — vollständige Imprint-Pflichtangaben (finanzteam26)
-- ============================================================

INSERT INTO einstellungen (schluessel, wert, beschreibung) VALUES
  ('firma_name',                'finanzteam26 GmbH & Co. KG',                        'Vollständiger Firmenname (Impressum § 5 TMG)'),
  ('firma_strasse',             'Hauptstr. 26',                                      'Anschrift Straße + Nr'),
  ('firma_plz_ort',             '89233 Neu-Ulm',                                     'PLZ + Ort'),
  ('firma_telefon',             '+49 731 9727093',                                   'Hauptrufnummer'),
  ('firma_telefax',             '+49 3212 3460344',                                  'Fax'),
  ('firma_email',               'service@finanzteam26.de',                           'Geschäftliche E-Mail-Adresse'),
  ('firma_geschaeftsfuehrer',   'Gudrun Judith Schmied, Kai Alexander Schmied',      'Geschäftsführer Verwaltungs-GmbH'),
  ('firma_handelsregister',     'HRA 14193 (Amtsgericht Memmingen) — vertreten durch finanzteam26 Verwaltungs-GmbH, HRB 21312, Amtsgericht Memmingen', 'Handelsregister-Eintrag mit vertretender GmbH'),
  ('firma_redaktion_v_i_s_d_p', 'Kai Alexander Schmied, Hauptstr. 26, 89233 Neu-Ulm', 'Verantwortlich nach § 18 Abs. 2 MStV'),
  ('firma_aufsicht',            'IHK für München und Oberbayern, 80323 München, https://www.muenchen.ihk.de', 'Zuständige Aufsichtsbehörde'),
  ('firma_paragraph_34d',       '§ 34d Abs. 1 GewO Versicherungsmakler / § 34f Abs. 1 S. 1 GewO Finanzanlagenvermittler — Bundesland: Bayern', 'Berufsrechtliche Zulassung'),
  ('firma_vermittlerregister',  'D-F-155-HL9G-55 · D-W-155-1Q56-86 · D-TBHQ-AMZAU-43', 'Vermittlerregister-Nummern (vermittlerregister.info)'),
  ('firma_berufshaftpflicht',   'ERGO Versicherung AG, 40198 Düsseldorf — Geltungsbereich: Deutschland', 'Vermögensschadenhaftpflicht-Versicherer'),
  ('firma_streitschlichtung',   'Versicherungsombudsmann e. V., Postfach 08 06 32, 10006 Berlin, https://www.versicherungsombudsmann.de · OS-Plattform: https://ec.europa.eu/consumers/odr/', 'Verbraucherstreitschlichtung'),
  -- Datenschutz / DSGVO
  ('dsgvo_av_anbieter',         'Anthropic PBC (USA, EU-Standardvertragsklauseln) für Textgenerierung; OpenAI Ireland Ltd. für Bildgenerierung; Convexa GmbH (DE) für Lead-Verarbeitung; Resend Inc. (USA, SCC) für E-Mail-Versand; Supabase Inc. (Hosting EU-Region)', 'Auftragsverarbeiter — wird in Datenschutzerklärung referenziert'),
  -- E-E-A-T Standard-Cadence
  ('redaktion_review_intervall_tage', '180', 'Default-Intervall in Tagen, nach dem Inhalte zur Re-Review markiert werden')
ON CONFLICT (schluessel) DO UPDATE
  SET wert = EXCLUDED.wert,
      beschreibung = EXCLUDED.beschreibung;


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE redaktion      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_baustein ENABLE ROW LEVEL SECURITY;

-- Public Read für sichtbare Autoren / aktive Trust-Bausteine
DROP POLICY IF EXISTS p_redaktion_public_read ON redaktion;
CREATE POLICY p_redaktion_public_read ON redaktion
  FOR SELECT USING (public = true);

DROP POLICY IF EXISTS p_trust_public_read ON trust_baustein;
CREATE POLICY p_trust_public_read ON trust_baustein
  FOR SELECT USING (aktiv = true);

-- Authenticated Full Access (Admin)
DROP POLICY IF EXISTS p_redaktion_admin_all ON redaktion;
CREATE POLICY p_redaktion_admin_all ON redaktion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_trust_admin_all ON trust_baustein;
CREATE POLICY p_trust_admin_all ON trust_baustein
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
