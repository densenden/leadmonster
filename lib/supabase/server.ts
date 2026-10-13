import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

// Session-aware server client — for auth checks in Server Components and Route Handlers.
// Uses the anon key with the cookie store to read/write the user's session.
// This is the correct client for auth guards and reading the current user.
export function createClient() {
  const cookieStore = cookies()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Cannot set cookies in read-only Server Components — this is expected.
            // Cookie writes only work in Route Handlers and Server Actions.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Cannot remove cookies in read-only Server Components — this is expected.
          }
        },
      },
    },
  )
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!key) {
    throw new Error(
      'SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing — admin DB queries cannot run.',
    )
  }
  // Using the publishable/anon key here silently returns 0 rows because RLS is enabled on leads.
  if (key.startsWith('sb_publishable_') || key === process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'SUPABASE_SECRET_KEY looks like a publishable key — set the service-role secret from Supabase Project Settings → API.',
    )
  }
  return key
}

// Service role client — bypasses RLS entirely.
// Use only in API routes, Server Actions, and admin DB operations.
// NEVER expose this client or its key to the browser.
// TODO: Encrypt wert column using AES/pgcrypto (Supabase Vault) before production deployment.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getServiceRoleKey(),
    {
      // Next.js caches fetch() by default — stale einstellungen would keep
      // feature flags (e.g. Turnstile) stuck on old values after Admin saves.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    },
  )
}

/**
 * Service-role client for public ISR pages (`revalidate = N`).
 * MUST NOT use cache: 'no-store' — that flips the page from static to dynamic
 * at runtime and returns HTTP 500 for unknown /[produkt] slugs (bot probes).
 * Admin mutations still call createAdminClient() + revalidatePath/revalidateTag.
 */
export function createPublicClient(revalidateSeconds = 60) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getServiceRoleKey(),
    {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, {
            ...init,
            // Drop conflicting cache mode; Next ISR uses next.revalidate.
            cache: undefined,
            next: { revalidate: revalidateSeconds },
          } as RequestInit),
      },
    },
  )
}
