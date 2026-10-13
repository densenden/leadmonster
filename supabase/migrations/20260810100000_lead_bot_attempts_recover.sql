-- Track manual recover of false-positive quarantine rows into real leads.
ALTER TABLE public.lead_bot_attempts
  ADD COLUMN IF NOT EXISTS recovered_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovered_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lead_bot_attempts_recovered_at_idx
  ON public.lead_bot_attempts (recovered_at DESC)
  WHERE recovered_at IS NOT NULL;

COMMENT ON COLUMN public.lead_bot_attempts.recovered_at IS
  'When an admin promoted this quarantine row into a real lead.';
COMMENT ON COLUMN public.lead_bot_attempts.recovered_lead_id IS
  'leads.id created by manual recover (Als Lead freigeben).';
