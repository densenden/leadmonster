-- Keep Sterbegeld24Plus as the only public product.
-- Delete archived test microsites, pause unused kinds, prepare draft niches.
-- Idempotent: safe to re-run.

-- 1) Detach leftover test leads so DELETE produkte is not blocked
--    (leads.produkt_id is ON DELETE NO ACTION, column is nullable).
UPDATE leads
SET produkt_id = NULL
WHERE produkt_id IN (
  SELECT id FROM produkte
  WHERE slug IN ('unfall2000', 'unfall-no-problem', 'sterbegeld25')
);

-- 2) Hard-delete test products.
--    CASCADE: produkt_config, generierter_content, tarife, bilder,
--    email_sequenzen, trust_baustein.
--    SET NULL: blog_posts, lead_bot_attempts.
DELETE FROM produkte
WHERE slug IN ('unfall2000', 'unfall-no-problem', 'sterbegeld25');

-- 3) Hide unused insurance kinds from "Neues Produkt" (rows stay for old wissensfundus).
UPDATE produkt_typen
SET active = false, updated_at = now()
WHERE slug IN ('pflege', 'unfall')
  AND active = true;

-- 4) New kinds for the next niches.
INSERT INTO produkt_typen (
  slug, name, summen, default_summe, default_age, min_age, max_age,
  summe_label, beitrag_label, summe_suffix, einheit, filter_axes,
  wissensfundus_label, active
) VALUES
  (
    'kinder',
    'Kinderversicherung (ADHS / besondere Bedarfe)',
    '[50000, 100000, 150000, 200000]'::jsonb,
    100000, 8, 0, 17,
    'Absicherungssumme', 'Beitrag / Monat', '€', 'eur_summe', '[]'::jsonb,
    'Kinder', true
  ),
  (
    'erbschaft',
    'Erbschaftsteuer / Vermögensübergang',
    '[250000, 500000, 1000000, 2000000, 5000000]'::jsonb,
    500000, 55, 30, 85,
    'Ungefähres Vermögen', 'Beitrag / Monat', '€', 'eur_summe', '[]'::jsonb,
    'Erbschaft', true
  ),
  (
    'spezial',
    'Spezialnische',
    '[5000, 10000, 25000, 50000]'::jsonb,
    10000, 45, 18, 80,
    'Bedarf / Summe', 'Beitrag / Monat', '€', 'eur_summe', '[]'::jsonb,
    'Spezial', true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  summen = EXCLUDED.summen,
  default_summe = EXCLUDED.default_summe,
  default_age = EXCLUDED.default_age,
  min_age = EXCLUDED.min_age,
  max_age = EXCLUDED.max_age,
  summe_label = EXCLUDED.summe_label,
  beitrag_label = EXCLUDED.beitrag_label,
  summe_suffix = EXCLUDED.summe_suffix,
  einheit = EXCLUDED.einheit,
  wissensfundus_label = EXCLUDED.wissensfundus_label,
  active = true,
  updated_at = now();

-- 5) Draft products — not public (status entwurf). Content comes later.
INSERT INTO produkte (name, slug, typ, status, short_pitch, title_suffix_override, brand_display_name, brand_subline)
VALUES
  (
    'Risikolebensversicherung',
    'risikoleben',
    'leben',
    'entwurf',
    'Absicherung der Familie, wenn der Hauptverdiener stirbt. Entwurf — Seite noch nicht öffentlich.',
    'Christian Wimmer Versicherungsmakler',
    'Risikoleben',
    'Schutz für Partner und Kinder'
  ),
  (
    'Berufsunfähigkeitsversicherung',
    'berufsunfaehigkeit',
    'bu',
    'entwurf',
    'Monatliche Rente, wenn der Beruf aus gesundheitlichen Gründen nicht mehr geht. Entwurf — Seite noch nicht öffentlich.',
    'Christian Wimmer Versicherungsmakler',
    'BU',
    'Einkommen schützen'
  ),
  (
    'Versicherungen für Kinder mit ADHS',
    'kinder-adhs',
    'kinder',
    'entwurf',
    'Nische: Absicherung für Familien mit ADHS-Kindern (Unfall, Invalidität, besondere Aufnahmewege). Entwurf — Seite noch nicht öffentlich.',
    'Christian Wimmer Versicherungsmakler',
    'Kinder ADHS',
    'Schutz trotz Diagnose'
  ),
  (
    'Erbschaftsteuer bei Vermögen umgehen',
    'erbschaftsteuer',
    'erbschaft',
    'entwurf',
    'Nische: Wie Versicherung und Schenkung bei mittlerem bis hohem Vermögen die Erbschaftsteuer last senken können. Entwurf — Seite noch nicht öffentlich.',
    'Christian Wimmer Versicherungsmakler',
    'Erbschaftsteuer',
    'Vermögen übertragen, Steuerlast senken'
  ),
  (
    'Weitere Spezialnischen',
    'spezialnische',
    'spezial',
    'entwurf',
    'Platzhalter für die nächste Spezialnische. Inhalt und Keyword folgen. Entwurf — Seite noch nicht öffentlich.',
    'Christian Wimmer Versicherungsmakler',
    'Spezialnische',
    'Nächste Nische — Inhalt folgt'
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO produkt_config (produkt_id, zielgruppe, fokus, argumente)
SELECT p.id, cfg.zielgruppe, cfg.fokus, cfg.argumente
FROM (
  VALUES
    ('risikoleben', ARRAY['familien', 'paare']::text[], 'sicherheit', '{"kern":"Absicherung der Hinterbliebenen"}'::jsonb),
    ('berufsunfaehigkeit', ARRAY['berufstaetige']::text[], 'sicherheit', '{"kern":"Einkommen bei Berufsunfaehigkeit"}'::jsonb),
    ('kinder-adhs', ARRAY['familien']::text[], 'sicherheit', '{"kern":"Absicherung trotz ADHS-Diagnose"}'::jsonb),
    ('erbschaftsteuer', ARRAY['familien']::text[], 'sicherheit', '{"kern":"Steuerlast bei Vermoegensuebergang senken"}'::jsonb),
    ('spezialnische', ARRAY[]::text[], 'sicherheit', '{"kern":"Platzhalter"}'::jsonb)
) AS cfg(slug, zielgruppe, fokus, argumente)
JOIN produkte p ON p.slug = cfg.slug
WHERE NOT EXISTS (
  SELECT 1 FROM produkt_config c WHERE c.produkt_id = p.id
);
