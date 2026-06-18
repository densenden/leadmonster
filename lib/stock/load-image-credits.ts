/**
 * Load all public image credits for the imprint index (server-only).
 */
import { createAdminClient } from '@/lib/supabase/server'
import { rowsToImageCredits, type BilderCreditRow } from './image-credits'
import type { ImageCredit } from './types'

export async function loadImageCredits(): Promise<ImageCredit[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('bilder')
    .select('id, alt_text, url, provider, page_type, slot, prompt_used')
    .in('provider', ['unsplash', 'openai', 'manual'])
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return rowsToImageCredits(data as BilderCreditRow[])
}
