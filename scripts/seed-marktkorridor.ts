/**
 * Seedt Marktkorridor-Tarife (anbieter_name=NULL) für alle Sterbegeld-Produkte.
 * Daten stammen aus lib/tarif-data.ts — diese Migration verlegt die Werte in die DB,
 * sodass lib/tarife/lookup.ts → lookupTarif() ohne Legacy-Fallback bedient wird.
 *
 * Idempotent: vorhandene Rows (anbieter_name IS NULL, alter_von, summe, produkt_id)
 * werden vor Insert gelöscht.
 *
 * Aufruf: npx tsx scripts/seed-marktkorridor.ts
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { TARIF_DATA, type ProduktTyp } from '../lib/tarif-data'

loadDotenv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY fehlen.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET)

async function seedForProdukt(produktId: string, produktSlug: string, typ: ProduktTyp) {
  const brackets = TARIF_DATA[typ] ?? []
  if (brackets.length === 0) {
    console.log(`  ⓘ ${produktSlug} (${typ}): keine statischen Brackets, übersprungen`)
    return
  }

  // Vorhandene Marktkorridor-Rows löschen (anbieter_name IS NULL)
  const { error: delErr } = await supabase
    .from('tarife')
    .delete()
    .eq('produkt_id', produktId)
    .is('anbieter_name', null)
  if (delErr) {
    console.error(`  ✗ Delete-Fehler ${produktSlug}:`, delErr.message)
    return
  }

  const rows: Array<{
    produkt_id: string
    alter_von: number
    alter_bis: number
    summe: number
    beitrag_low: number
    beitrag_high: number
    einheit: string
    anbieter_name: null
    tarif_name: null
  }> = []

  for (const bracket of brackets) {
    for (const [sumKey, range] of Object.entries(bracket.sums)) {
      rows.push({
        produkt_id: produktId,
        alter_von: bracket.minAge,
        alter_bis: bracket.maxAge,
        summe: Number(sumKey),
        beitrag_low: range.low,
        beitrag_high: range.high,
        einheit: 'eur_summe',
        anbieter_name: null,
        tarif_name: null,
      })
    }
  }

  const { error } = await supabase.from('tarife').insert(rows)
  if (error) {
    console.error(`  ✗ Insert-Fehler ${produktSlug}:`, error.message)
    return
  }

  console.log(`  ✓ ${produktSlug} (${typ}): ${rows.length} Marktkorridor-Rows geseedet`)
}

async function main() {
  console.log('🌱 Seed Marktkorridor → tarife (anbieter_name=NULL)')

  const { data: produkte, error } = await supabase
    .from('produkte')
    .select('id, slug, typ')
  if (error || !produkte) {
    console.error('Produkte konnten nicht geladen werden:', error?.message)
    process.exit(1)
  }

  const supportedTypes: ProduktTyp[] = ['sterbegeld', 'pflege', 'leben', 'unfall']

  for (const p of produkte) {
    if (!supportedTypes.includes(p.typ as ProduktTyp)) continue
    await seedForProdukt(p.id as string, p.slug as string, p.typ as ProduktTyp)
  }

  console.log('🎉 Fertig.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
