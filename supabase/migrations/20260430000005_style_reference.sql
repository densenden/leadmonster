-- Migration: Style-Reference pro Produkt für einheitlichen Bilder-Look
-- Date: 2026-04-30
-- Reason: Der Vertrieb möchte pro Produkt einen Beispiel-Bildstil (z. B.
-- "coloriertes Aquarell" oder "warmes Filmkorn") hochladen, an dem sich der
-- Image-Generator orientiert. Statt das Referenzbild direkt der OpenAI-API
-- zu reichen (gpt-image-1 unterstützt nur edit() mit Mask, nicht Style-
-- Transfer), extrahieren wir per Vision-Analyse einmalig eine englische
-- Stil-Direktive und reichern damit jeden Bild-Prompt an.

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS style_reference_url text,
  ADD COLUMN IF NOT EXISTS style_description text;

COMMENT ON COLUMN produkte.style_reference_url IS
  'Public URL des hochgeladenen Stil-Referenzbildes (Bucket: produkt-style-references)';
COMMENT ON COLUMN produkte.style_description IS
  'Englische Stil-Direktive, abgeleitet via GPT-Vision aus style_reference_url. Wird an buildHeroPrompt() / buildSectionPrompt() durchgereicht.';
