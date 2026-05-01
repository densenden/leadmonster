// Server-side Loader für Autoren-Profile.
// Resolved nach Priorität: explizit übergebene autor_id → Produkt-Standard-Autor → null.
import { createAdminClient } from '@/lib/supabase/server'
import type { Redaktion } from '@/lib/supabase/types'

export interface ResolvedAuthor {
  autor: Redaktion | null
  reviewer: Redaktion | null
  reviewedAt: string | null
  source: 'article' | 'fallback' | 'none'
}

interface ResolveOptions {
  autorId?: string | null
  reviewerId?: string | null
  reviewedAt?: string | null
  produktId?: string | null
}

export async function resolveAuthor(opts: ResolveOptions): Promise<ResolvedAuthor> {
  const supabase = createAdminClient()

  let standardAutorId: string | null = null
  if (!opts.autorId && opts.produktId) {
    const { data: produkt } = await supabase
      .from('produkte')
      .select('standard_autor_id')
      .eq('id', opts.produktId)
      .maybeSingle()
    standardAutorId = produkt?.standard_autor_id ?? null
  }

  const targetAutorId = opts.autorId ?? standardAutorId
  const targetReviewerId = opts.reviewerId ?? null

  const ids = [targetAutorId, targetReviewerId].filter(Boolean) as string[]
  if (ids.length === 0) {
    return { autor: null, reviewer: null, reviewedAt: null, source: 'none' }
  }

  const { data: rows } = await supabase
    .from('redaktion')
    .select('*')
    .in('id', ids)

  const byId = new Map<string, Redaktion>((rows ?? []).map(r => [r.id, r]))
  return {
    autor: targetAutorId ? byId.get(targetAutorId) ?? null : null,
    reviewer: targetReviewerId ? byId.get(targetReviewerId) ?? null : null,
    reviewedAt: opts.reviewedAt ?? null,
    source: opts.autorId ? 'article' : standardAutorId ? 'fallback' : 'none',
  }
}
