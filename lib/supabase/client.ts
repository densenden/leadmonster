import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Browser-side Supabase client using the anon key.
// Use this in Client Components and browser-side code only.
// Do NOT use this in API routes or Server Components — use server.ts instead.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  return createBrowserClient<Database>(url!, key!)
}
