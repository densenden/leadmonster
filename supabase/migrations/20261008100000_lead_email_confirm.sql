-- Stores the email-confirm link for a lead. The raw token is never saved, only its hash.
alter table public.leads
  add column if not exists email_confirm_token_hash text,
  add column if not exists email_confirm_expires_at timestamptz,
  add column if not exists email_confirmed_at timestamptz;

create index if not exists leads_email_confirm_token_hash_idx
  on public.leads (email_confirm_token_hash)
  where email_confirm_token_hash is not null;
