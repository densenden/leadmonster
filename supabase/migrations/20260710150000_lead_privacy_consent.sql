-- GDPR consent audit trail for lead form submissions (Art. 5 Abs. 2 DSGVO).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_policy_version text,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

COMMENT ON COLUMN leads.privacy_consent_at IS 'Timestamp when user accepted privacy policy at form submit';
COMMENT ON COLUMN leads.privacy_policy_version IS 'Version string of privacy policy shown at submit time';
COMMENT ON COLUMN leads.marketing_consent IS 'Optional opt-in for marketing contact beyond quote request';
COMMENT ON COLUMN leads.marketing_consent_at IS 'Timestamp when optional marketing consent was given';
