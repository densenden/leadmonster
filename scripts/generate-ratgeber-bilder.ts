/**
 * Generate per-ratgeber cover images via gpt-image-1 → Supabase Storage.
 * Sets `cover_image_url` + `cover_image_alt` on generierter_content.content.
 *
 * Skips rows whose cover already points to our Supabase Storage bucket.
 * Replaces external URLs (e.g. Unsplash) automatically.
 *
 * Usage:
 *   npx tsx scripts/generate-ratgeber-bilder.ts [produkt_slug] [--force]
 *   npx tsx scripts/generate-ratgeber-bilder.ts sterbegeld24plus --stock
 *   npx tsx scripts/generate-ratgeber-bilder.ts sterbegeld24plus --env=production
 *   npx tsx scripts/generate-ratgeber-bilder.ts sterbegeld24plus --stock
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../lib/supabase/types'
import { generateImage } from '../lib/openai/image-generator'
import { getBrandLook } from '../lib/openai/hero-prompt'
import { getTitleForSlug } from '../lib/ratgeber/normalize'
import {
  findStockPhotoForTopic,
  getUnsplashAccessKey,
  serializeStockMeta,
} from '../lib/stock/unsplash'
import { isOpenAiConfigured } from '../lib/openai/resolve-credentials'

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const USE_STOCK = args.includes('--stock') || process.env.USE_STOCK === '1'
const produktSlug = args.find(a => !a.startsWith('--')) ?? 'sterbegeld24plus'
const onlySlug = args.find(a => a.startsWith('--slug='))?.slice('--slug='.length)
const envFile =
  args.find(a => a.startsWith('--env='))?.slice('--env='.length) === 'production'
    ? '.env.production.local'
    : '.env.local'

loadDotenv({ path: '.env.local' })
loadDotenv({ path: envFile })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!
const ASSIGN_POOL = args.includes('--assign-pool')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`FATAL: Supabase env missing (loaded ${envFile}).`)
  process.exit(1)
}

function hasOpenAiKeyInEnv(): boolean {
  return Boolean(
    (process.env.AI_GATEWAY_API_KEY?.trim() && process.env.AI_GATEWAY_API_KEY.trim().length > 8) ||
      (process.env.OPENAI_API_KEY?.trim() && process.env.OPENAI_API_KEY.trim().length > 8),
  )
}

async function bootstrapOpenAiFromDb(
  supabase: ReturnType<typeof createClient<Database>>,
): Promise<boolean> {
  if (hasOpenAiKeyInEnv()) return true
  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'openai_api_key')
    .maybeSingle()
  const k = data?.wert?.trim()
  if (k && k.length >= 8) {
    process.env.OPENAI_API_KEY = k
    return true
  }
  return isOpenAiConfigured()
}

/** True when cover should be regenerated (external CDN or missing). */
function isExternalCoverUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true
  try {
    const host = new URL(url).hostname
    // Our images live on Supabase Storage — anything else is external.
    return !host.includes('supabase.co')
  } catch {
    return true
  }
}

function buildPrompt(typ: string, title: string, metaDesc: string | null, slug: string): string {
  const look = getBrandLook(typ)
  const themeHint = metaDesc
    ? `Article "${title}" (slug: ${slug}). Context: "${metaDesc.slice(0, 220)}"`
    : `Article "${title}" (slug: ${slug})`

  return (
    `Editorial storytelling photography illustrating a German lifestyle scene. ` +
    `${themeHint}. ` +
    `Color palette: ${look.palette}. Lighting: ${look.lighting}. ` +
    `Symbolic objects (choose one or two from): ${look.motifs}. ` +
    `Composition: blog-cover ratio, calm mood, magazine-feature feel, ` +
    `subject implied through hands, objects or back-views — unique visual for this specific topic.`
  )
}

interface RatgeberRow {
  id: string
  slug: string
  title: string | null
  meta_desc: string | null
  content: { sections?: unknown[]; cover_image_url?: string; cover_image_alt?: string } | null
}

interface ProduktRow {
  id: string
  typ: string
  name: string
}

interface PoolImage {
  url: string
  alt_text: string | null
}

async function loadInternalPool(
  supabase: ReturnType<typeof createClient<Database>>,
  produktId: string,
): Promise<PoolImage[]> {
  const { data } = await supabase
    .from('bilder')
    .select('url, alt_text, provider')
    .eq('produkt_id', produktId)
    .in('provider', ['openai', 'unsplash'])
    .order('created_at', { ascending: true })

  const rows = (data ?? []) as Array<{ url: string; alt_text: string | null }>
  const seen = new Set<string>()
  const pool: PoolImage[] = []
  for (const row of rows) {
    if (!row.url?.includes('supabase.co') || seen.has(row.url)) continue
    seen.add(row.url)
    pool.push({ url: row.url, alt_text: row.alt_text })
  }
  return pool
}

async function assignFromPool(
  supabase: ReturnType<typeof createClient<Database>>,
  produkt: ProduktRow,
  ratgeber: RatgeberRow[],
  pool: PoolImage[],
): Promise<{ assigned: number; skipped: number }> {
  let assigned = 0
  let skipped = 0
  let idx = 0

  for (const r of ratgeber) {
    const existing = r.content?.cover_image_url
    if (!FORCE && !isExternalCoverUrl(existing)) {
      skipped++
      continue
    }

    const img = pool[idx % pool.length]
    idx++
    const title = r.title?.trim() || getTitleForSlug(r.slug)
    const alt = img.alt_text ?? `Beitragsbild: ${title} — ${produkt.name} Ratgeber`

    const nextContent = {
      ...(r.content ?? {}),
      cover_image_url: img.url,
      cover_image_alt: alt,
    }
    const { error } = await supabase
      .from('generierter_content')
      .update({
        content: nextContent as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', r.id)

    if (error) {
      console.error(`  ✗ ${r.slug}: ${error.message}`)
      continue
    }
    console.log(`  ✓ ${r.slug}: pooled internal image`)
    assigned++
  }

  return { assigned, skipped }
}

async function main() {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

  const { data: produktData, error: produktErr } = await supabase
    .from('produkte')
    .select('id, typ, name')
    .eq('slug', produktSlug)
    .maybeSingle()

  if (produktErr || !produktData) {
    console.error(`Produkt slug="${produktSlug}" not found:`, produktErr?.message)
    process.exit(1)
  }
  const produkt = produktData as unknown as ProduktRow

  let query = supabase
    .from('generierter_content')
    .select('id, slug, title, meta_desc, content')
    .eq('produkt_id', produkt.id)
    .eq('page_type', 'ratgeber')
    .eq('status', 'publiziert')
    .order('slug', { ascending: true })

  const { data: ratgeberData, error: ratgeberErr } = await query

  if (ratgeberErr) {
    console.error('Ratgeber lookup failed:', ratgeberErr.message)
    process.exit(1)
  }

  let ratgeber = (ratgeberData ?? []) as unknown as RatgeberRow[]
  if (onlySlug) ratgeber = ratgeber.filter(r => r.slug === onlySlug)

  console.log(
    `${produkt.name} — ${ratgeber.length} ratgeber (env: ${envFile}, force: ${FORCE}, stock: ${USE_STOCK}, pool: ${ASSIGN_POOL})\n`,
  )

  if (USE_STOCK) {
    if (!getUnsplashAccessKey()) {
      console.error('UNSPLASH_ACCESS_KEY required for --stock. Or run: npx tsx scripts/assign-stock-images.ts')
      process.exit(1)
    }
    let assigned = 0
    let skipped = 0
    let failed = 0
    for (const r of ratgeber) {
      const existing = r.content?.cover_image_url
      const needsReplace = FORCE || isExternalCoverUrl(existing)
      if (!needsReplace) {
        skipped++
        continue
      }
      const title = r.title?.trim() || getTitleForSlug(r.slug)
      try {
        const hit = await findStockPhotoForTopic(r.slug, title)
        if (!hit) {
          failed++
          continue
        }
        const altText = hit.photo.alt_description?.trim() || `Beitragsbild: ${title} — ${produkt.name}`
        const pageType = `ratgeber_${r.slug}`
        await supabase.from('bilder').delete().eq('produkt_id', produkt.id).eq('page_type', pageType)
        await supabase.from('bilder').insert({
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
        const nextContent = {
          ...(r.content ?? {}),
          cover_image_url: hit.url,
          cover_image_alt: altText,
        }
        await supabase
          .from('generierter_content')
          .update({ content: nextContent as unknown as Json, updated_at: new Date().toISOString() })
          .eq('id', r.id)
        console.log(`  ✓ ${r.slug}: stock (${hit.photo.user.name})`)
        assigned++
        await new Promise(res => setTimeout(res, 400))
      } catch (err) {
        console.error(`  ✗ ${r.slug}:`, err instanceof Error ? err.message : err)
        failed++
      }
    }
    console.log(`\nDone (stock): ${assigned} assigned, ${skipped} skipped, ${failed} failed.`)
    if (failed > 0) process.exit(2)
    return
  }

  if (ASSIGN_POOL) {
    const pool = await loadInternalPool(supabase, produkt.id)
    if (pool.length === 0) {
      console.error('No internal openai bilder in pool.')
      process.exit(1)
    }
    console.log(`Pool: ${pool.length} unique Supabase images\n`)
    const { assigned, skipped } = await assignFromPool(supabase, produkt, ratgeber, pool)
    console.log(`\nDone: ${assigned} assigned from pool, ${skipped} skipped.`)
    return
  }

  const openAiReady = await bootstrapOpenAiFromDb(supabase)
  if (!openAiReady) {
    console.warn('⚠ No OpenAI credentials — using internal bilder pool.\n')
    const pool = await loadInternalPool(supabase, produkt.id)
    if (pool.length === 0) {
      console.error(
        'No OpenAI key and no bilder pool. Admin → Einstellungen → OpenAI API-Key speichern.',
      )
      process.exit(1)
    }
    console.log(`Pool: ${pool.length} unique Supabase images\n`)
    const { assigned, skipped } = await assignFromPool(supabase, produkt, ratgeber, pool)
    console.log(`\nDone: ${assigned} assigned from pool, ${skipped} skipped.`)
    return
  }

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const r of ratgeber) {
    const existing = r.content?.cover_image_url
    const needsReplace = FORCE || isExternalCoverUrl(existing)

    if (!needsReplace) {
      console.log(`  • ${r.slug}: internal cover — skip`)
      skipped++
      continue
    }

    const title = r.title?.trim() || getTitleForSlug(r.slug)
    const altText = `Beitragsbild: ${title} — ${produkt.name} Ratgeber`
    const prompt = buildPrompt(produkt.typ, title, r.meta_desc, r.slug)

    try {
      console.log(`  ▸ ${r.slug}: generating …`)
      const out = await generateImage({
        prompt,
        slot: 'blog_cover',
        altText,
        produktId: produkt.id,
        pageType: `ratgeber_${r.slug}`,
        dryRun: false,
      })

      const nextContent = {
        ...(r.content ?? {}),
        cover_image_url: out.url,
        cover_image_alt: out.alt,
      }
      const { error: updateErr } = await supabase
        .from('generierter_content')
        .update({
          content: nextContent as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id)

      if (updateErr) {
        console.error(`    ✗ DB update failed: ${updateErr.message}`)
        failed++
        continue
      }
      console.log(`    ✓ ${out.url.slice(0, 70)}…`)
      generated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    ✗ ${msg}`)
      failed++
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed.`)
  if (failed > 0) process.exit(2)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
