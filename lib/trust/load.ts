// Server-side Loader für Trust-Bausteine.
// Zieht alle aktiven Bausteine, optional gefiltert nach typ + produkt
// (oder global = produkt_id IS NULL).
import { createAdminClient } from '@/lib/supabase/server'
import type { TrustBaustein, TrustBausteinTyp } from '@/lib/supabase/types'

export interface LoadTrustOptions {
  produktId?: string | null
  typen?: TrustBausteinTyp[]
  limit?: number
  /** Wenn true: nur Bausteine, die explizit produkt_id = produktId haben. Sonst: union global + produkt-spezifisch. */
  produktSpezifischNur?: boolean
}

export async function loadTrust(opts: LoadTrustOptions = {}): Promise<TrustBaustein[]> {
  const supabase = createAdminClient()
  let query = supabase
    .from('trust_baustein')
    .select('*')
    .eq('aktiv', true)
    .order('reihenfolge', { ascending: true })

  if (opts.typen && opts.typen.length > 0) {
    query = query.in('typ', opts.typen)
  }

  if (opts.produktSpezifischNur && opts.produktId) {
    query = query.eq('produkt_id', opts.produktId)
  } else if (opts.produktId) {
    // Union: global (NULL) ODER dieses Produkt
    query = query.or(`produkt_id.is.null,produkt_id.eq.${opts.produktId}`)
  } else {
    query = query.is('produkt_id', null)
  }

  if (opts.limit) query = query.limit(opts.limit)

  const { data } = await query
  return data ?? []
}
