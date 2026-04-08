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

// Service role client — bypasses RLS entirely.
// Use only in API routes, Server Actions, and admin DB operations.
// NEVER expose this client or its key to the browser.
// TODO: Encrypt wert column using AES/pgcrypto (Supabase Vault) before production deployment.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key!
  )
}
