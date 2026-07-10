-- Client IP at form submit — for admin audit (GDPR accountability).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS client_ip text;

COMMENT ON COLUMN leads.client_ip IS 'Client IP from x-forwarded-for / x-real-ip at lead submit';
