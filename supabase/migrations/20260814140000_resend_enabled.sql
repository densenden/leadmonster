-- Resend lead-mail master switch (Admin).
-- Default OFF — confirmation + sales notification mails stay paused until enabled.

INSERT INTO einstellungen (schluessel, wert, beschreibung)
VALUES (
  'resend_enabled',
  'false',
  'Resend-Mails bei neuen Leads aktiv (true) oder pausiert (false). Bestätigung an Interessent + Vertriebs-Benachrichtigung. Unabhängig von Convexa.'
)
ON CONFLICT (schluessel) DO UPDATE SET
  wert = 'false',
  beschreibung = EXCLUDED.beschreibung,
  updated_at = now();
