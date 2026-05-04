-- Migration: Domain-Redirects für Single-Domain-Strategie (§ 8)
-- Date: 2026-05-04
-- Purpose:
--   Erlaubt Vertrieb / Admin, 301/302-Redirects ohne Re-Deployment zu pflegen.
--   Wird von middleware.ts gelesen, mit unstable_cache + revalidateTag('redirects')
--   invalidiert. Initiales Mapping aus § 8 wird via seed-redirects.ts eingespielt.
--
--   Die Tabelle ist bewusst isoliert (kein FK auf produkte, generierter_content
--   o. ä.) — Vertrieb soll auch alte HTML-Pfade (`/ueber-uns/`) freihändig
--   einpflegen können, ohne dass die Ziel-Route bereits existiert.
--
-- Konflikt-Schutz: idempotent via IF NOT EXISTS. Sub-Sequence 000010+ vermeidet
-- Kollision mit parallelen Migrations (Sterbegeld-Rechner, Produktart-Konfigurator).

-- ============================================================
-- 1. REDIRECTS-TABELLE
-- ============================================================

CREATE TABLE IF NOT EXISTS redirects (
  legacy_path  text PRIMARY KEY,
  target_path  text NOT NULL,
  status       int  NOT NULL DEFAULT 301 CHECK (status IN (301, 302)),
  notiz        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE redirects IS
  'Per-Pfad-Redirects, gepflegt im Admin-UI. Gelesen von middleware.ts.';
COMMENT ON COLUMN redirects.legacy_path IS
  'Alter Pfad ohne Domain (mit führendem /). z. B. "/ueber-uns/".';
COMMENT ON COLUMN redirects.target_path IS
  'Ziel-Pfad ohne Domain (mit führendem /). z. B. "/redaktion/christian-wimmer".';
COMMENT ON COLUMN redirects.status IS
  '301 = permanent (Default, vererbt Link-Equity), 302 = temporary.';

-- ============================================================
-- 2. UPDATED_AT-TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION redirects_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS redirects_updated_at ON redirects;
CREATE TRIGGER redirects_updated_at
  BEFORE UPDATE ON redirects
  FOR EACH ROW
  EXECUTE FUNCTION redirects_set_updated_at();

-- ============================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================
-- Public Read: Middleware (anon) muss alle Redirects lesen können, um sie
-- vor dem Routing aufzulösen. Es gibt nichts Sensibles in der Tabelle —
-- Pfade sind sowieso öffentlich. Write nur Service-Role (Admin via Server Actions).

ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS redirects_public_read ON redirects;
CREATE POLICY redirects_public_read ON redirects
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service-Role bypassed RLS automatisch — keine Write-Policy nötig.
