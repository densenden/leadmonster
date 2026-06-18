/**
 * Publish all sterbegeld24plus ratgeber rows that are entwurf or review.
 * Uses production Supabase credentials from .env.production.local (vercel env pull).
 *
 * Usage:
 *   npx tsx scripts/publish-sterbegeld-ratgeber.ts
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadDotenv({ path: '.env.production.local' })

const PRODUKT_ID = 'fe1e6444-eaab-42df-8fa7-72ec644c3f9f'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.production.local')
  process.exit(1)
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!)
  const now = new Date().toISOString()

  const { data: produkt, error: produktErr } = await supabase
    .from('produkte')
    .select('slug, name')
    .eq('id', PRODUKT_ID)
    .single()

  if (produktErr || !produkt) {
    console.error('Product not found:', produktErr?.message ?? 'no row')
    process.exit(1)
  }

  const { data: rows, error: listErr } = await supabase
    .from('generierter_content')
    .select('id, slug, status, published_at')
    .eq('produkt_id', PRODUKT_ID)
    .eq('page_type', 'ratgeber')
    .order('slug')

  if (listErr) {
    console.error('List failed:', listErr.message)
    process.exit(1)
  }

  const all = rows ?? []
  console.log(`\n=== Before (${all.length} ratgeber rows) ===`)
  const byStatus: Record<string, number> = {}
  for (const r of all) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    console.log(`  ${r.slug}: ${r.status}${r.published_at ? '' : ' (no published_at)'}`)
  }
  console.log('Status counts:', byStatus)

  const toPublish = all.filter((r) => r.status === 'entwurf' || r.status === 'review')
  const alreadyPublished = all.filter((r) => r.status === 'publiziert')

  if (toPublish.length === 0) {
    console.log('\nNothing to publish (all already publiziert or no draft rows).')
    console.log(`Already publiziert: ${alreadyPublished.length}`)
    console.log(`Public index: https://leadmonster-kappa.vercel.app/${produkt.slug}/ratgeber`)
    return
  }

  const ids = toPublish.map((r) => r.id)
  const { data: updated, error: updateErr } = await supabase
    .from('generierter_content')
    .update({
      status: 'publiziert',
      published_at: now,
      updated_at: now,
    })
    .in('id', ids)
    .select('id, slug, status, published_at')

  if (updateErr) {
    console.error('Update failed:', updateErr.message)
    process.exit(1)
  }

  // Rows that already had published_at: admin API only sets when undefined;
  // we set for all drafts. Re-fetch for rows that had published_at null only
  // is already covered by bulk update.

  console.log(`\n=== Published ${updated?.length ?? 0} rows ===`)
  for (const r of updated ?? []) {
    console.log(`  ${r.slug}: ${r.status}`)
  }
  console.log(`Skipped (already publiziert): ${alreadyPublished.length}`)
  if (alreadyPublished.length > 0) {
    for (const r of alreadyPublished) {
      console.log(`  (skipped) ${r.slug}`)
    }
  }

  const { data: after, error: afterErr } = await supabase
    .from('generierter_content')
    .select('slug, status')
    .eq('produkt_id', PRODUKT_ID)
    .eq('page_type', 'ratgeber')

  if (afterErr) {
    console.error('Verify query failed:', afterErr.message)
    process.exit(1)
  }

  const publiziertCount = (after ?? []).filter((r) => r.status === 'publiziert').length
  console.log(`\n=== After: ${publiziertCount} / ${after?.length ?? 0} publiziert ===`)
  console.log(`Public index: https://leadmonster-kappa.vercel.app/${produkt.slug}/ratgeber`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
