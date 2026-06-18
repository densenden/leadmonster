# Supabase Auth Redirects (Confirm + Reset)

If Supabase emails (account confirmation, invite, password reset) point to `localhost`, the root cause is almost always Supabase Auth URL config, not Next.js routing.

## What to set in Supabase Dashboard

Open **Supabase → Authentication → URL Configuration** and set:

- **Site URL**: `https://finanzteam26.de`
- **Redirect URLs** (allow list):
  - `https://finanzteam26.de/auth/callback`
  - `https://finanzteam26.de/admin/login`
  - `https://www.finanzteam26.de/auth/callback` (if you use `www`)
  - `https://www.finanzteam26.de/admin/login` (if you use `www`)
  - `https://*.vercel.app/auth/callback` (preview deployments)
  - `https://*.vercel.app/admin/login` (preview deployments)
  - `http://localhost:3000/auth/callback` (local development only)
  - `http://localhost:3000/admin/login` (local development only)

Use your real production domain if different. Keep protocol (`https://`) included.

## Environment requirement

Set `NEXT_PUBLIC_BASE_URL` in production `.env` to your public domain, for example:

```bash
NEXT_PUBLIC_BASE_URL=https://finanzteam26.de
```

Vercel preview handling:

- On preview/server requests, pass the current request origin to `getSupabaseEmailRedirectUrl(...)` when building Supabase email redirects.
- If no request origin is available, helper fallback order is:
  1. `VERCEL_URL` (auto-set by Vercel)
  2. `NEXT_PUBLIC_BASE_URL`
  3. `http://localhost:3000` (non-production only)

Code helper: `lib/supabase/auth-redirect-url.ts` rejects localhost-only options in production to catch misconfiguration early.

## Why localhost links happen

Supabase builds email links from:

1. Dashboard **Site URL**
2. Optional `redirectTo`/`emailRedirectTo` passed by app code

When neither is set correctly for production, Supabase falls back to local/dev defaults and links can point to localhost.
