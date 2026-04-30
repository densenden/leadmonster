-- Migration: Confluence vollständig entfernen
-- Date: 2026-04-30
-- Reason: Convexa hat Confluence als Lead-CRM final abgelöst. Spalten und
-- Einstellungs-Schlüssel werden bereinigt; Re-Sync läuft jetzt
-- ausschließlich über convexa_synced/convexa_lead_id/convexa_error.

-- 1. leads-Tabelle: Confluence-Spalten entfernen
ALTER TABLE leads DROP COLUMN IF EXISTS confluence_page_id;
ALTER TABLE leads DROP COLUMN IF EXISTS confluence_synced;

-- 2. einstellungen-Tabelle: Confluence-Schlüssel entfernen
DELETE FROM einstellungen
 WHERE schluessel IN (
   'confluence_base_url',
   'confluence_api_token',
   'confluence_email',
   'confluence_space_key'
 );
