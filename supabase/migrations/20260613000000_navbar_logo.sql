-- Navbar logo: optional per product, hidden by default.
-- When visible without upload → frontend shows colored MonsterLogo.

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS navbar_logo_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS navbar_logo_url     text,
  ADD COLUMN IF NOT EXISTS navbar_logo_alt     text;

COMMENT ON COLUMN produkte.navbar_logo_visible IS
  'When true, show a logo left of the product name in the public navbar.';
COMMENT ON COLUMN produkte.navbar_logo_url IS
  'Custom navbar logo URL (Supabase Storage). NULL + visible → Monster mascot.';
COMMENT ON COLUMN produkte.navbar_logo_alt IS
  'Alt text for custom navbar logo upload.';
