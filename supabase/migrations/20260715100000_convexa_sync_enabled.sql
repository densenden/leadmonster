-- Migration: Convexa sync master switch (admin settings)
-- Date: 2026-07-15
-- Default OFF — leads stay in Supabase with convexa_synced=false until sync is enabled.

INSERT INTO einstellungen (schluessel, wert, beschreibung)
VALUES (
  'convexa_sync_enabled',
  'false',
  'Convexa Lead-Sync aktiv (true) oder pausiert (false). Bei false werden Leads nur lokal gespeichert.'
)
ON CONFLICT (schluessel) DO NOTHING;
