-- Migration: accent_color + legal page types
-- Date: 2026-04-09
-- Run this in the Supabase Dashboard → SQL Editor

-- 1. Add accent_color column to produkte
ALTER TABLE produkte ADD COLUMN IF NOT EXISTS accent_color text;

-- 2. Set type-based defaults for existing products
UPDATE produkte SET accent_color = '#d4af37' WHERE typ = 'sterbegeld' AND accent_color IS NULL;
UPDATE produkte SET accent_color = '#4ade80' WHERE typ = 'pflege'     AND accent_color IS NULL;
UPDATE produkte SET accent_color = '#60a5fa' WHERE typ = 'leben'      AND accent_color IS NULL;
UPDATE produkte SET accent_color = '#fb923c' WHERE typ = 'unfall'     AND accent_color IS NULL;

-- 3. Expand the page_type CHECK constraint to include legal page types
--    The constraint is auto-named generierter_content_page_type_check by Postgres.
ALTER TABLE generierter_content
  DROP CONSTRAINT IF EXISTS generierter_content_page_type_check;

ALTER TABLE generierter_content
  ADD CONSTRAINT generierter_content_page_type_check
  CHECK (page_type IN (
    'hauptseite', 'faq', 'vergleich', 'tarif', 'ratgeber',
    'impressum', 'kontakt', 'datenschutz', 'agb'
  ));
