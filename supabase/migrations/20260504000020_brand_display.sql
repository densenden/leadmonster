-- Migration: Sub-Brand-Display + Title-Suffix-Strategie für Single-Domain (§ 8 Phase 4)
-- Date: 2026-05-04
-- Purpose:
--   Mitigation aus § 8 für den Trade-Off „Sterbegeld24Plus-Branding auf
--   Nicht-Sterbegeld-Subpfaden" (z. B. /bu unter sterbegeld24plus.de):
--
--   1. produkte.brand_display_name — wenn gesetzt, ersetzt es `name` als
--      Logo-Wordmark (z. B. „BU24Plus" auf /bu).
--   2. produkte.brand_subline — kleine Zusatz-Bezeichnung (z. B.
--      „handwerker.bu" oder „BU für Handwerker"), wird neben dem Logo
--      angezeigt.
--   3. produkte.title_suffix_override — pro-Produkt Title-Suffix
--      (Default kommt aus einstellungen.domain_title_suffix_default).
--   4. einstellungen.domain_title_suffix_default = "Christian Wimmer
--      Versicherungsmakler" als globaler Default für Nicht-Sterbegeld-Title.
--
-- Konflikt-Schutz: ADD COLUMN IF NOT EXISTS, ON CONFLICT DO NOTHING.
-- Sub-Sequence 000020 — sicher nach 20260504000000_produkt_typen_und_filter
-- und 20260504000010_domain_redirects.

-- ============================================================
-- 1. PRODUKTE — Brand-Display + Title-Suffix-Override
-- ============================================================

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS brand_display_name    text,
  ADD COLUMN IF NOT EXISTS brand_subline         text,
  ADD COLUMN IF NOT EXISTS title_suffix_override text;

COMMENT ON COLUMN produkte.brand_display_name IS
  'Wordmark im Header (Default: name). z. B. „BU24Plus" auf /bu.';
COMMENT ON COLUMN produkte.brand_subline IS
  'Optionale Sub-Brand-Zeile neben dem Logo (z. B. „handwerker.bu").';
COMMENT ON COLUMN produkte.title_suffix_override IS
  'Pro-Produkt Title-Suffix; überschreibt einstellungen.domain_title_suffix_default.';

-- ============================================================
-- 2. EINSTELLUNGEN — globaler Title-Suffix-Default
-- ============================================================

INSERT INTO einstellungen (schluessel, wert, beschreibung)
VALUES (
  'domain_title_suffix_default',
  'Christian Wimmer Versicherungsmakler',
  'Standard-Title-Suffix für Nicht-Sterbegeld-Produkte unter sterbegeld24plus.de — vermeidet, dass die Domain sterbegeld24plus.de in BU/Pflege/Unfall-Title als verwirrender Kontext erscheint. Pro Produkt überschreibbar via produkte.title_suffix_override.'
)
ON CONFLICT (schluessel) DO NOTHING;
