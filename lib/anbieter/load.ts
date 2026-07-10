// Loader für Anbieter-Landingpages.
// Liest die View `tarife_besonderheiten_aggregiert` + Tarif-Detail-Rows.
import { createAdminClient } from '@/lib/supabase/server'
import { slugifyAnbieter } from './slug'

export interface AnbieterAggregat {
  produkt_id: string
  anbieter_name: string
  tarif_name: string | null
  beitrag_min: number
  beitrag_max: number
  tarif_count: number
  gesundheitspruefung: boolean
  doppelte_unfall: boolean
  rueckholung: boolean
  lebenslang: boolean
  kindermitversicherung: boolean
  wartezeit_min_monate: number | null
  wartezeit_alt_monate: number | null
  zahlung_bis_alter: number | null
  alter_von_min: number
  alter_bis_max: number
  summe_min: number
  summe_max: number
}

export async function loadAnbieterForProdukt(produktId: string): Promise<AnbieterAggregat[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('tarife_besonderheiten_aggregiert')
    .select('*')
    .eq('produkt_id', produktId)
    .order('anbieter_name', { ascending: true })
  return (data as AnbieterAggregat[] | null) ?? []
}

export async function loadAnbieterDetail(produktId: string, anbieterSlug: string): Promise<AnbieterAggregat | null> {
  const all = await loadAnbieterForProdukt(produktId)
  return all.find(a => slugifyAnbieter(a.anbieter_name) === anbieterSlug) ?? null
}

export { slugifyAnbieter } from './slug'
