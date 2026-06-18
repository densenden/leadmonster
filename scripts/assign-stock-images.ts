/**
 * Assign Unsplash stock photos to ratgeber covers (and register in `bilder` for imprint index).
 *
 * Searches Unsplash per article topic — no OpenAI calls. Better for editorial look
 * than generic AI images.
 *
 * Usage:
 *   npx tsx scripts/assign-stock-images.ts sterbegeld24plus
 *   npx tsx scripts/assign-stock-images.ts sterbegeld24plus --force
 *   npx tsx scripts/assign-stock-images.ts sterbegeld24plus --slug=was-ist-sterbegeld --dry-run
 *
 * Requires: UNSPLASH_ACCESS_KEY in .env.local
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../lib/supabase/types'
import { getTitleForSlug } from '../lib/ratgeber/normalize'
import {
  findStockPhotoForTopic,
  getUnsplashAccessKey,
  serializeStockMeta,
} from '../lib/stock/unsplash'

loadDotenv({ path: '.env.local' })

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const DRY_RUN = args.includes('--dry-run')
const produktSlug = args.find(a => !a.startsWith('--')) ?? 'sterbegeld24plus'
const onlySlug = args.find(a => a.startsWith('--slug='))?.slice('--slug='.length)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: Supabase env missing.')
  process.exit(1)
}

if (!getUnsplashAccessKey()) {
  console.error('FATAL: UNSPLASH_ACCESS_KEY missing — get one at https://unsplash.com/developers')
  process.exit(1)
}

interface RatgeberRow {
  id: string
  slug: string
  title: string | null
  meta_desc: string | null
  content: { sections?: unknown[]; cover_image_url?: string; cover_image_alt?: string } | null
}

function isOurStorageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  try {
    return new URL(url).hostname.includes('supabase.co')
  } catch {
    return false
  }
}

function needsStock(row: RatgeberRow): boolean {
  if (FORCE) return true
  const cover = row.content?.cover_image_url
  if (!cover) return true
  // Replace external Unsplash CDN or missing covers; keep our Supabase AI images unless --force
  if (cover.includes('images.unsplash.com')) return true
  return !isOurStorageUrl(cover)
}

async function main() {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

  const { data: produkt, error: produktErr } = await supabase
    .from('produkte')
    .select('id, name')
    .eq('slug', produktSlug)
    .maybeSingle()

  if (produktErr || !produkt) {
    console.error(`Produkt "${produktSlug}" not found.`)
    process.exit(1)
  }

  const { data: ratgeberData, error: ratgeberErr } = await supabase
    .from('generierter_content')
    .select('id, slug, title, meta_desc, content')
    .eq('produkt_id', produkt.id)
    .eq('page_type', 'ratgeber')
    .eq('status', 'publiziert')
    .order('slug')

  if (ratgeberErr) {
    console.error(ratgeberErr.message)
    process.exit(1)
  }

  let rows = (ratgeberData ?? []) as unknown as RatgeberRow[]
  if (onlySlug) rows = rows.filter(r => r.slug === onlySlug)

  console.log(`${produkt.name} — ${rows.length} ratgeber (stock search, force=${FORCE}, dry=${DRY_RUN})\n`)

  let assigned = 0
  let skipped = 0
  let failed = 0

  for (const r of rows) {
    if (!needsStock(r)) {
      console.log(`  • ${r.slug}: cover ok — skip`)
      skipped++
      continue
    }

    const title = r.title?.trim() || getTitleForSlug(r.slug)
    console.log(`  ▸ ${r.slug}: searching Unsplash …`)

    try {
      const hit = await findStockPhotoForTopic(r.slug, title)
      if (!hit) {
        console.warn(`    ✗ no results for "${r.slug}"`)
        failed++
        continue
      }

      const altText = hit.photo.alt_description?.trim() || `Beitragsbild: ${title} — ${produkt.name}`
      console.log(`    → "${hit.query}" → ${hit.photo.user.name} (${hit.photo.id})`)

      if (DRY_RUN) {
        console.log(`    [dry-run] ${hit.url}`)
        assigned++
        continue
      }

      const pageType = `ratgeber_${r.slug}`

      // Replace prior stock row for this page_type
      await supabase.from('bilder').delete().eq('produkt_id', produkt.id).eq('page_type', pageType)

      const { error: insErr } = await supabase.from('bilder').insert({
        produkt_id: produkt.id,
        page_type: pageType,
        slot: 'blog_cover',
        url: hit.url,
        alt_text: altText,
        prompt_used: serializeStockMeta(hit.meta),
        provider: 'unsplash',
        width: 1600,
        height: 900,
      })
      if (insErr) throw new Error(insErr.message)

      const nextContent = {
        ...(r.content ?? {}),
        cover_image_url: hit.url,
        cover_image_alt: altText,
      }
      const { error: upErr } = await supabase
        .from('generierter_content')
        .update({
          content: nextContent as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id)
      if (upErr) throw new Error(upErr.message)

      console.log(`    ✓ assigned`)
      assigned++

      // Unsplash API rate limit: stay polite
      await new Promise(r => setTimeout(r, 400))
    } catch (err) {
      console.error(`    ✗ ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`\nDone: ${assigned} assigned, ${skipped} skipped, ${failed} failed.`)
  if (failed > 0) process.exit(2)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
