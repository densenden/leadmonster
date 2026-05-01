-- Migration: Storage-Bucket "redaktion-fotos" für Autoren-Portraits
-- Date: 2026-05-01
-- Bucket public = true (Fotos werden in JSON-LD + öffentlichen Profil-Seiten gerendert).
-- RLS: jeder darf lesen, nur authenticated darf schreiben.

INSERT INTO storage.buckets (id, name, public)
VALUES ('redaktion-fotos', 'redaktion-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read
DROP POLICY IF EXISTS p_redaktion_fotos_public_read ON storage.objects;
CREATE POLICY p_redaktion_fotos_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'redaktion-fotos');

-- Authenticated write
DROP POLICY IF EXISTS p_redaktion_fotos_admin_write ON storage.objects;
CREATE POLICY p_redaktion_fotos_admin_write ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'redaktion-fotos')
  WITH CHECK (bucket_id = 'redaktion-fotos');


-- Bonus: Bucket "trust-assets" für Pressezitate/Siegel/Partner-Logos (Phase F)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trust-assets', 'trust-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS p_trust_assets_public_read ON storage.objects;
CREATE POLICY p_trust_assets_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'trust-assets');

DROP POLICY IF EXISTS p_trust_assets_admin_write ON storage.objects;
CREATE POLICY p_trust_assets_admin_write ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'trust-assets')
  WITH CHECK (bucket_id = 'trust-assets');
