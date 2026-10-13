-- Allow quarantine reason for spam heuristic hits (captcha-solving fake leads).
ALTER TABLE public.lead_bot_attempts
  DROP CONSTRAINT IF EXISTS lead_bot_attempts_reason_check;

ALTER TABLE public.lead_bot_attempts
  ADD CONSTRAINT lead_bot_attempts_reason_check
  CHECK (
    reason IN (
      'honeypot',
      'captcha_required',
      'captcha_failed',
      'too_fast',
      'spam_heuristic',
      'form_session_invalid'
    )
  );
