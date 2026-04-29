-- Migration: wissensfundus unique constraint on (kategorie, thema)
-- Date: 2026-04-09
-- Run this in the Supabase Dashboard → SQL Editor
-- Required so that the scraper API can upsert with onConflict: 'kategorie,thema'

-- Remove duplicate rows first (keep the most recently created one per pair)
DELETE FROM wissensfundus
WHERE id NOT IN (
  SELECT DISTINCT ON (kategorie, thema) id
  FROM wissensfundus
  ORDER BY kategorie, thema, created_at DESC
);

-- Add the unique constraint
ALTER TABLE wissensfundus
  ADD CONSTRAINT wissensfundus_kategorie_thema_key UNIQUE (kategorie, thema);
