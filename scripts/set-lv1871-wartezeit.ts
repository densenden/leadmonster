/**
 * Set wartezeit_monate = 6 for all LV1871 tarife rows (besonderheiten jsonb).
 *
 * Usage: npx tsx scripts/set-lv1871-wartezeit.ts [produkt-slug]
 * Default produkt slug: sterbegeld24plus
 */
import { createClient } from '@supabase/supabase-js'

const slug = process.argv[2] ?? 'sterbegeld24plus'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data: produkt, error: produktError } = await supabase
    .from('produkte')
    .select('id, slug, name')
    .eq('slug', slug)
    .single()

  if (produktError || !produkt) {
    console.error('Produkt not found:', slug, produktError?.message)
    process.exit(1)
  }

  const { data: rows, error: fetchError } = await supabase
    .from('tarife')
    .select('id, anbieter_name, besonderheiten')
    .eq('produkt_id', produkt.id)
    .not('anbieter_name', 'is', null)
    .ilike('anbieter_name', '%LV1871%')

  if (fetchError) {
    console.error('Fetch failed:', fetchError.message)
    process.exit(1)
  }

  const targets = rows ?? []
  console.log(`Updating ${targets.length} LV1871 rows for ${produkt.name} (${slug})…`)

  let updated = 0
  for (const row of targets) {
    const next = { ...((row.besonderheiten as Record<string, unknown>) ?? {}), wartezeit_monate: 6 }
    const { error } = await supabase.from('tarife').update({ besonderheiten: next }).eq('id', row.id)
    if (error) {
      console.error(`Failed ${row.id}:`, error.message)
    } else {
      updated++
    }
  }

  console.log(`Done. Updated ${updated}/${targets.length} rows to wartezeit_monate=6.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
