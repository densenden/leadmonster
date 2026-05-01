// Server-side Loader für `einstellungen`-Schlüssel.
// Wird gecached pro Request via React-cache.
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server'

export const loadAllEinstellungen = cache(async (): Promise<Record<string, string>> => {
  const supabase = createAdminClient()
  const { data } = await supabase.from('einstellungen').select('schluessel, wert')
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.wert !== null) map[row.schluessel] = row.wert
  }
  return map
})

export async function loadEinstellung(key: string): Promise<string | null> {
  const all = await loadAllEinstellungen()
  return all[key] ?? null
}

/**
 * Subset für die Footer-/Imprint-Komponenten.
 */
export interface FirmaImprint {
  name: string | null
  strasse: string | null
  plz_ort: string | null
  telefon: string | null
  telefax: string | null
  email: string | null
  geschaeftsfuehrer: string | null
  handelsregister: string | null
  redaktion_v_i_s_d_p: string | null
  aufsicht: string | null
  paragraph_34d: string | null
  vermittlerregister: string | null
  berufshaftpflicht: string | null
  streitschlichtung: string | null
  dsgvo_av_anbieter: string | null
}

export async function loadFirmaImprint(): Promise<FirmaImprint> {
  const all = await loadAllEinstellungen()
  return {
    name: all.firma_name ?? null,
    strasse: all.firma_strasse ?? null,
    plz_ort: all.firma_plz_ort ?? null,
    telefon: all.firma_telefon ?? null,
    telefax: all.firma_telefax ?? null,
    email: all.firma_email ?? null,
    geschaeftsfuehrer: all.firma_geschaeftsfuehrer ?? null,
    handelsregister: all.firma_handelsregister ?? null,
    redaktion_v_i_s_d_p: all.firma_redaktion_v_i_s_d_p ?? null,
    aufsicht: all.firma_aufsicht ?? null,
    paragraph_34d: all.firma_paragraph_34d ?? null,
    vermittlerregister: all.firma_vermittlerregister ?? null,
    berufshaftpflicht: all.firma_berufshaftpflicht ?? null,
    streitschlichtung: all.firma_streitschlichtung ?? null,
    dsgvo_av_anbieter: all.dsgvo_av_anbieter ?? null,
  }
}
