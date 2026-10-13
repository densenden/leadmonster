-- Quarantine table for rejected bot/spam form submissions.
-- Never synced to Convexa; admin review only.
CREATE TABLE IF NOT EXISTS public.lead_bot_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL CHECK (reason IN ('honeypot', 'captcha_required', 'captcha_failed')),
  produkt_id uuid REFERENCES public.produkte(id) ON DELETE SET NULL,
  email text,
  vorname text,
  nachname text,
  telefon text,
  source_url text,
  client_ip text,
  user_agent text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS lead_bot_attempts_created_at_idx
  ON public.lead_bot_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS lead_bot_attempts_reason_idx
  ON public.lead_bot_attempts (reason);

ALTER TABLE public.lead_bot_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.lead_bot_attempts IS
  'Rejected lead form submissions (honeypot/captcha). Not synced to Convexa.';
