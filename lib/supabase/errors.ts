import type { PostgrestError } from '@supabase/supabase-js'

/** PostgREST: `.single()` found zero rows. */
export function isRowNotFound(error: PostgrestError | null | undefined): boolean {
  return error?.code === 'PGRST116'
}

/** Network / DNS / paused project — not "product missing". */
export function isTransientDbError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false
  const msg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  return (
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('network') ||
    msg.includes('timeout')
  )
}
