// Session check for admin Server Actions / routes.
// Use createClient() (cookie session) — NOT createAdminClient() (service role has no user).
import { createClient } from '@/lib/supabase/server'

export async function requireAdminUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
