-- Migration: Convexa-Form-Token pro Produkt + Settings-Schlüssel-Cleanup
-- Date: 2026-04-30
-- Reason: Convexa-API-Spec ist eingegangen (PDF "Einspielung von Leaddaten").
-- Der Endpoint ist https://api.convexa.app/submissions/{Formular-Token}.
-- Es gibt keinen Bearer-Token und kein Workspace — nur einen Form-Token, der
-- pro Kampagne (= pro Produkt) unterschiedlich sein kann.
-- Folge:
--   - produkte.convexa_form_token: optional pro Produkt überschreibbar
--   - einstellungen: convexa_form_token (Default-Token) + Cleanup der
--     Bearer-Token-Annahme (api_token, workspace_id sind obsolet)

-- 1. Pro-Produkt-Token (NULL = nutze globalen Default aus einstellungen/env)
ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS convexa_form_token text;

-- 2. Neuer einstellungen-Schlüssel: globaler Default-Token
INSERT INTO einstellungen (schluessel, beschreibung)
VALUES
  ('convexa_form_token', 'Convexa Form-Token aus URL https://api.convexa.app/submissions/{token} — Default für alle Produkte ohne eigenen Token')
ON CONFLICT (schluessel) DO NOTHING;

-- 3. Obsolete Bearer-Token-Schlüssel beibehalten als Soft-Deprecation:
--    nicht löschen (ggf. noch in produktiven .env vorhanden), aber Beschreibung
--    aktualisieren, damit klar ist, dass sie ignoriert werden.
UPDATE einstellungen
SET beschreibung = 'OBSOLET (vor 2026-04-30): nicht mehr verwendet — Convexa nutzt Form-Token in URL, keinen Bearer-Header'
WHERE schluessel IN ('convexa_api_token', 'convexa_workspace_id');

-- 4. Base-URL-Default aktualisieren — neuer Endpoint ist api.convexa.app, nicht app.convexa.app
UPDATE einstellungen
SET beschreibung = 'Convexa API Base-URL (Default: https://api.convexa.app)'
WHERE schluessel = 'convexa_base_url';
