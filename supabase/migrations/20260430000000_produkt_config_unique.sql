-- Migration: produkt_config.produkt_id UNIQUE constraint
-- Date: 2026-04-30
-- Reason: PATCH /api/admin/produkte uses
--   .upsert({...}, { onConflict: 'produkt_id' })
-- which Postgres rejects unless produkt_id has a unique constraint.
-- Initial schema modelled produkt_config 1:1 with produkte but never enforced it.

-- Idempotent — safe to run on fresh install or existing DB.
ALTER TABLE produkt_config
  DROP CONSTRAINT IF EXISTS produkt_config_produkt_id_key;
ALTER TABLE produkt_config
  ADD CONSTRAINT produkt_config_produkt_id_key UNIQUE (produkt_id);
