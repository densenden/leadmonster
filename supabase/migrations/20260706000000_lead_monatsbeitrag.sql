-- Monthly premium from TarifRechner / VergleichsRechner — dedicated column for Convexa + admin.
-- Previously only embedded in leads.interesse free text.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS monatsbeitrag_eur numeric(10, 2);

COMMENT ON COLUMN leads.monatsbeitrag_eur IS 'Example monthly premium from calculator (EUR), pushed to Convexa as MonatsbeitragEur.';
